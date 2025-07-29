from app.services.prompts.dfd_prompts import prompt_sistema
from app.schemas.dfd_schemas import dfdModel
from fastapi import HTTPException
from app.client import get_genai_client
from google.genai import types

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlalchemy import select, text, update, delete
from typing import List, Dict
from app.models.dfd_models import DFD
from app.models.projects_models import Projeto
from app.schemas.dfd_schemas import DFDCreate, DFDCreator, DFDUpdate
from app.dependencies import RemoteUser
from app.config import acre_tz
from datetime import datetime
import json



async def fetch_dfd_pca_data(db: AsyncSession) -> List[Dict[str, str]]:
    query = text("""
        WITH dados AS (
            SELECT DISTINCT ON (objeto_contratacao)
            item,
            UPPER(objeto_contratacao) AS obj
            FROM core.pca
        )
        SELECT DISTINCT d.item, MIN(UPPER(d.obj)) AS obj
        FROM dados d
        GROUP BY d.item
        ORDER BY d.item ASC
    """)
    
    result = await db.execute(query)
    rows = result.fetchall()

    return [{"item": row.item, "obj": row.obj} for row in rows]



async def create_dfd_service(dfd_in: DFDCreate, db: AsyncSession, current_user: RemoteUser, project_id: int):
    # Verifica se o projeto existe
    result = await db.execute(
        select(Projeto).where(Projeto.id_projeto == project_id)
    )
    projeto = result.scalar_one_or_none()
    if not projeto:
        raise ValueError("Projeto não encontrado.")
    
    # Verifica se já existe DFD para este projeto
    stmt = select(DFD).where(DFD.id_projeto == project_id)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="Já existe um DFD cadastrado para este projeto."
        )

    # Monta o prompt para IA
    prompt_usuario = dfd_in.descricao
    item_id = dfd_in.item
    contexto_db = await buscar_item_por_id(db, item_id)

    prompt_final_completo = f"""
    {prompt_sistema}

    ---
    Contexto do Banco de Dados (JSON):
    {json.dumps(contexto_db, indent=2, ensure_ascii=False)}

    ---
    Prompt do Usuário:
    "{prompt_usuario}"
    """
    
    print(prompt_final_completo)
    print("******************************")

    # Chama a IA
    resposta_ia = await consulta_ia(prompt_final_completo)
    print(resposta_ia)

    resposta = resposta_ia[0]  # Extrai o dicionário de dentro da lista
    
    # ✅ CORREÇÃO: Processa e limpa os dados de quantidade_contratada
    quantidade_contratada = resposta["quantidade_justifica_a_ser_contratada"]
    
    # Corrige o campo quantidade (já existia)
    quantidade_raw = quantidade_contratada.get("quantidade")
    try:
        quantidade = int(quantidade_raw) if quantidade_raw not in [None, "null", ""] else None
    except ValueError:
        quantidade = None
    quantidade_contratada["quantidade"] = quantidade
    
    # ✅ NOVA CORREÇÃO: Corrige o campo id_do_item
    id_do_item_raw = quantidade_contratada.get("id_do_item")
    try:
        # Se for uma string como "A definir", converte para None
        if isinstance(id_do_item_raw, str) and id_do_item_raw.strip().lower() in ["a definir", "", "null"]:
            id_do_item = None
        else:
            id_do_item = int(id_do_item_raw) if id_do_item_raw not in [None, "null", ""] else None
    except (ValueError, TypeError):
        id_do_item = None
    quantidade_contratada["id_do_item"] = id_do_item
    
    # ✅ Atualiza o objeto resposta com os dados limpos
    resposta["quantidade_justifica_a_ser_contratada"] = quantidade_contratada

    #resposta = resposta_ia[0]  # Extrai o dicionário de dentro da lista
    
    #quantidade_raw = resposta["quantidade_justifica_a_ser_contratada"].get("quantidade")

    # Garante que seja int ou None
    #try:
    #    quantidade = int(quantidade_raw) if quantidade_raw not in [None, "null", ""] else None
    #except ValueError:
    #    quantidade = None

    #resposta["quantidade_justifica_a_ser_contratada"]["quantidade"] = quantidade
    
    # Processar previsao_data_bem_servico
    previsao_str = resposta["previsao_da_entrega_do_bem_ou_inicio_dos_servicos"]
    try:
        # Formato brasileiro DD/MM/YYYY
        previsao_data = datetime.strptime(previsao_str, "%d/%m/%Y")
    except ValueError:
        try:
            # Tentar formato americano MM/DD/YYYY
            previsao_data = datetime.strptime(previsao_str, "%m/%d/%Y")
        except ValueError:
            try:
                # Tentar formato ISO
                from dateutil import parser
                previsao_data = parser.parse(previsao_str)
            except:
                # Fallback para data atual
                previsao_data = datetime.now(acre_tz)
    
    equipe = resposta.get("equipe_de_planejamento", [])
    if isinstance(equipe, list):
        equipe_str = ", ".join(str(membro) for membro in equipe)
    else:
        equipe_str = str(equipe) if equipe else ""

    # CRIAR O OBJETO DFD E GRAVAR NO BANCO
    novo_dfd = DFD(
        id_projeto=project_id,
        user_created=current_user.username,
        data_created=datetime.now(acre_tz),
        previsto_pca=(dfd_in.item > 0),
        item=dfd_in.item,
        unidade_demandante=current_user.group,  # ou outro campo apropriado
        objeto_contratado=resposta["objeto_a_ser_contratado"],
        justificativa_contratacao=resposta["justificativa"],
        quantidade_contratada=resposta["quantidade_justifica_a_ser_contratada"],
        previsao_data_bem_servico=previsao_data,
        alinhamento_estrategico=resposta["alinhamento_estrategico"],
        equipe_de_planejamento=equipe_str,
        status=True
    )

    # Persiste no banco
    db.add(novo_dfd)
    try:
        await db.commit()
        await db.refresh(novo_dfd)
        
        # Atualiza o campo exist_dfd do projeto para True
        update_stmt = update(Projeto).where(Projeto.id_projeto == project_id).values(exist_dfd=True)
        await db.execute(update_stmt)
        await db.commit()
        
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Já existe um DFD cadastrado para este projeto."
        )
    except Exception:
        await db.rollback()
        raise

    # RECUPERAR DO BANCO E RETORNAR COMO JSON
    stmt = (
        select(DFD)
        .options(selectinload(DFD.projeto))
        .where(DFD.id_projeto == project_id)
    )
    result = await db.execute(stmt)
    dfd_criado = result.scalars().first()

    # Montar o resultado JSON com os dados do banco
    resultado = {
        "id": dfd_criado.id,
        "id_projeto": dfd_criado.id_projeto,
        "user_created": dfd_criado.user_created,
        "group_created": current_user.group,  # Adiciona o campo group_created
        "data_created": dfd_criado.data_created,
        "item": dfd_criado.item,
        "previsto_pca": dfd_criado.previsto_pca,
        "unidade_demandante": dfd_criado.unidade_demandante,
        "objeto_contratado": dfd_criado.objeto_contratado,
        "justificativa_contratacao": dfd_criado.justificativa_contratacao,
        "quantidade_contratada": dfd_criado.quantidade_contratada,
        "previsao_data_bem_servico": dfd_criado.previsao_data_bem_servico,
        "alinhamento_estrategico": dfd_criado.alinhamento_estrategico,
        "equipe_de_planejamento": dfd_criado.equipe_de_planejamento,
        "status": dfd_criado.status
    }
    
    print(resultado)
    
    return resultado




async def buscar_item_por_id(db: AsyncSession, item_id):
    query = text("""
        SELECT
            item,
            quantidade_a_ser_adquirida,
            valor_estimado,
            objeto_contratacao,
            justificativa_aquisicao,
            data_estimada_contratacao,
            objetivo_estrategico_vinculado
        FROM core.pca 
        WHERE item = :item_id
    """)
    
    result = await db.execute(query, {"item_id": item_id})
    resultado = result.fetchone()

    return dict(resultado._mapping) if resultado else None



async def consulta_ia(prompt_final_completo):
    
    try:
        client = get_genai_client()
        model = "gemini-2.0-flash"
        
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt_final_completo)],
            ),
        ]
        
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[dfdModel],
        )
        
        print("--- Aguardando resposta da API Gemini... ---")
        
        response_chunks = []
        # O bloco 'for' começa aqui. Todo o conteúdo dele deve estar indentado.
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            response_chunks.append(chunk.text)
        # Fim da indentação do bloco 'for'.

        full_response_json = "".join(response_chunks)

        # ETAPA 4: Exibir a saída. Este código está fora do loop 'for', mas dentro do 'try'.
        print("\n--- Resposta da API Gemini (JSON Estruturado) ---")
        dados_formatados = json.loads(full_response_json)
        result = json.dumps(dados_formatados, indent=4, ensure_ascii=False)
        #print(result)

    # Fim da indentação do bloco 'try'.
    except Exception as e:
        print(f"\nOcorreu um erro durante a execução: {e}")
    # Fim da indentação do bloco 'except'.
    
    return dados_formatados



async def create_dfd_for_project(
    project_id: int,
    dfd_in: DFDCreator,
    username: str,
    db: AsyncSession
) -> DFD:
    # 1) Verifica se já existe DFD
    stmt = select(DFD).where(DFD.id_projeto == project_id)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="Já existe um DFD cadastrado para este projeto."
        )

    # 2) Converte string de data para datetime
    try:
        previsao = datetime.strptime(
            dfd_in.previsao_da_entrega_do_bem_ou_inicio_dos_servicos,
            "%d/%m/%Y"
        )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de data inválido. Use DD/MM/AAAA."
        )

    # 3) Monta o objeto DFD
    novo = DFD(
        id_projeto=project_id,
        user_created=username,
        data_created=datetime.now(acre_tz),
        previsto_pca=(dfd_in.item > 0),
        item=dfd_in.item,
        unidade_demandante=dfd_in.unidade_demandante,
        objeto_contratado=dfd_in.objeto_a_ser_contratado,
        justificativa_contratacao=dfd_in.justificativa,
        quantidade_contratada=[
            q.model_dump() for q in dfd_in.quantidade_justifica_a_ser_contratada
        ],
        previsao_data_bem_servico=previsao,
        alinhamento_estrategico=dfd_in.alinhamento_estrategico,
        equipe_de_planejamento=dfd_in.equipe_de_planejamento,
        status=True
    )

    # 4) Persiste no banco
    db.add(novo)
    try:
        await db.commit()
        await db.refresh(novo)
        
        # Atualiza o campo exist_dfd do projeto para True
        update_stmt = update(Projeto).where(Projeto.id_projeto == project_id).values(exist_dfd=True)
        await db.execute(update_stmt)
        await db.commit()
        
        return novo

    except IntegrityError:
        await db.rollback()
        # captura UniqueConstraint em caso de race
        raise HTTPException(
            status_code=409,
            detail="Já existe um DFD cadastrado para este projeto."
        )
    except Exception:
        await db.rollback()
        raise
    
    
    
    
async def update_dfd_for_project(project_id: int, dfd_upd: DFDUpdate, db: AsyncSession, current_user: RemoteUser) -> DFD:
    # 1) Busca o DFD existente
    stmt = (
        select(DFD)
        .options(selectinload(DFD.projeto))
        .where(DFD.id_projeto == project_id)
    )
    result = await db.execute(stmt)
    dfd: DFD | None = result.scalars().first()
    
    if not dfd:
        raise HTTPException(status_code=404, detail="DFD não encontrado para este projeto.")
    
    if dfd.user_created != current_user.username and dfd.projeto.user_created != current_user.username:
        raise HTTPException(status_code=403, detail="Você não tem permissão para alterar este DFD.")

    # 2) Para cada campo opcional, verifica e atualiza
    if dfd_upd.item is not None:
        dfd.item = dfd_upd.item
        dfd.previsto_pca = dfd_upd.item > 0

    if dfd_upd.unidade_demandante is not None:
        dfd.unidade_demandante = dfd_upd.unidade_demandante

    if dfd_upd.objeto_a_ser_contratado is not None:
        dfd.objeto_contratado = dfd_upd.objeto_a_ser_contratado

    if dfd_upd.justificativa is not None:
        dfd.justificativa_contratacao = dfd_upd.justificativa

    if dfd_upd.quantidade_justifica_a_ser_contratada is not None:
        dfd.quantidade_contratada = [
            q.model_dump() for q in dfd_upd.quantidade_justifica_a_ser_contratada
        ]

    if dfd_upd.previsao_da_entrega_do_bem_ou_inicio_dos_servicos is not None:
        try:
            dfd.previsao_data_bem_servico = datetime.strptime(
                dfd_upd.previsao_da_entrega_do_bem_ou_inicio_dos_servicos,
                "%d/%m/%Y"
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido. Use DD/MM/AAAA.")

    if dfd_upd.alinhamento_estrategico is not None:
        dfd.alinhamento_estrategico = dfd_upd.alinhamento_estrategico

    if dfd_upd.equipe_de_planejamento is not None:
        dfd.equipe_de_planejamento = dfd_upd.equipe_de_planejamento

    # 3) Persiste mudanças
    try:
        await db.commit()
        await db.refresh(dfd)
        return dfd
    except Exception:
        await db.rollback()
        raise



async def delete_dfd_for_project(project_id: int, db: AsyncSession, current_user: RemoteUser) -> None:
    # Corrigido: carrega o projeto relacionado junto com o DFD
    stmt = (
        select(DFD)
        .options(selectinload(DFD.projeto))
        .where(DFD.id_projeto == project_id)
    )
    result = await db.execute(stmt)
    dfd = result.scalars().first()

    if not dfd:
        raise HTTPException(status_code=404, detail="DFD não encontrado para este projeto.")

    # Verifica permissão
    if dfd.user_created != current_user.username and dfd.projeto.user_created != current_user.username:
        raise HTTPException(status_code=403, detail="Você não tem permissão para deletar este DFD.")

    # Executa o delete
    del_stmt = delete(DFD).where(DFD.id_projeto == project_id)
    await db.execute(del_stmt)
    
    # Atualiza o campo exist_dfd do projeto para False
    update_stmt = update(Projeto).where(Projeto.id_projeto == project_id).values(exist_dfd=False)
    await db.execute(update_stmt)
    
    await db.commit()