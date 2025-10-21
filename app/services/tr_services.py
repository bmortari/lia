from datetime import datetime
import os
from fastapi import HTTPException
from pydantic import BaseModel
from app.client import get_genai_client
from app.dependencies import RemoteUser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from typing import Dict
from google.genai import types
from app.models.projects_models import Projeto
from app.models.tr_models import TR, TRItem
from app.models.dfd_models import DFD
from app.models.pgr_models import PGR
from app.models.etp_models import ETP
from app.schemas.tr_schemas import TRCreate, TRRead, TRUpdate
from app.services.prompts.tr_prompts import prompt_tr, prompt_tr_servicos
from app.config import acre_tz
from app.models.tr_models import TRItem
from sqlalchemy import delete

import json
import logging

logger = logging.getLogger(__name__)
temp_dir = os.path.join("frontend", "static", "docs")
os.makedirs(temp_dir, exist_ok=True)


async def delete_tr_service(project_id: int, db: AsyncSession, current_user: str = ""):
    """
    Deleta o Termo de Referência (TR) do projeto e atualiza o flag exist_tr.
    """
    try:
        # Verifica se o projeto existe
        result = await db.execute(
            select(Projeto).where(Projeto.id_projeto == project_id)
        )
        projeto = result.scalar_one_or_none()
        if not projeto:
            raise ValueError("Projeto não encontrado.")

        # Busca o TR
        stmt = select(TR).where(TR.id_projeto == project_id)
        result = await db.execute(stmt)
        tr = result.scalars().first()
        if not tr:
            raise ValueError("TR não encontrado para este projeto.")

        # Deleta o TR (cascade deleta itens)
        await db.delete(tr)
        await db.commit()

        # Atualiza o flag exist_tr do projeto para False
        update_stmt = update(Projeto).where(Projeto.id_projeto == project_id).values(exist_tr=False)
        await db.execute(update_stmt)
        await db.commit()

        logger.info(f"TR deletado com sucesso para o projeto {project_id}")

    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao deletar TR para o projeto {project_id}: {e}", exc_info=True)
        raise

async def create_tr_service(tr_in: TRCreate, db: AsyncSession, current_user: RemoteUser, project_id: int):
    """
    Cria um Termo de Referência (TR) a partir dos artefatos do projeto,
    utilizando IA para gerar os dados estruturados.
    """
    try:
        # Verifica se o projeto existe
        result = await db.execute(
            select(Projeto).where(Projeto.id_projeto == project_id)
        )
        projeto = result.scalar_one_or_none()
        if not projeto:
            raise ValueError("Projeto não encontrado.")

        # Verifica se o TR já existe
        stmt = select(TR).where(TR.id_projeto == project_id)
        result = await db.execute(stmt)
        if result.scalars().first():
            raise HTTPException(
                status_code=409,
                detail="Já existe um TR cadastrado para este projeto."
            )

        # Busca e valida a existência dos artefatos necessários
        artefatos = await buscar_artefatos(project_id, db)

        # TODO: Inserir prompt do usuário ou demais dados através do tr_in e incluir no prompt final

        # Gera os dados estruturados para o TR via IA
        logger.info(f"Gerando dados do TR para o projeto {project_id}...")
        dados_tr_json = await gerar_dados_tr(artefatos, tr_in)
        logger.info("Dados do TR gerados com sucesso.")
        dados_tr_json['tipo_contratacao'] = tr_in.tipo_contratacao
        

        # Mapeia o JSON para o modelo SQLAlchemy
        itens_data = dados_tr_json.pop("itens", [])

        logger.info(f"JSON a ser inserido no banco: {dados_tr_json}")

        # Cria a instância do TR com os dados do JSON
        # O operador ** desempacota o dicionário nos argumentos do construtor
        novo_tr = TR(
            id_projeto=project_id,
            user_created=current_user.username,
            data_created=datetime.now(acre_tz),
            **dados_tr_json
        )

        # Cria as instâncias de TRItem e as associa ao TR
        for item_data in itens_data:
            # Remove o valor_total, pois é uma propriedade computada no modelo
            item_data.pop('valor_total', None)
            novo_item = TRItem(**item_data)
            novo_tr.itens.append(novo_item)

        # Adiciona ao banco de dados
        db.add(novo_tr)

        try:
            await db.commit()
            await db.refresh(novo_tr)
            
            # Atualiza o campo exist_tr do projeto para True
            update_stmt = update(Projeto).where(Projeto.id_projeto == project_id).values(exist_tr=True)
            await db.execute(update_stmt)
            await db.commit()

        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Já existe um TR cadastrado para este projeto."
            )
        except Exception:
            await db.rollback()
            raise

        # Recupera do banco e retorna como json
        stmt = (
            select(TR)
            .options(selectinload(TR.projeto))
            .options(selectinload(TR.itens))
            .where(TR.id_projeto == project_id)
        )
        result = await db.execute(stmt)
        tr_criado = result.scalars().first()

        return TRRead.model_validate(tr_criado).model_dump()

    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao criar TR para o projeto {project_id}: {e}", exc_info=True)
        # Re-lança a exceção para que o FastAPI a manipule
        raise


async def buscar_artefatos(project_id: int, db: AsyncSession) -> Dict[str, any]:
    """
    Busca os artefatos DFD, PGR e ETP necessários para a criação do TR.
    """
    # Buscar DFD
    stmt_dfd = select(DFD).where(DFD.id_projeto == project_id)
    dfd = (await db.execute(stmt_dfd)).scalar_one_or_none()

    # Buscar PGR
    stmt_pgr = select(PGR).where(PGR.id_projeto == project_id)
    pgrs = (await db.execute(stmt_pgr)).scalars().all()

    # Buscar ETP
    stmt_etp = select(ETP).where(ETP.id_projeto == project_id)
    etp = (await db.execute(stmt_etp)).scalar_one_or_none()

    missing = []
    if not dfd:
        missing.append("DFD")
    if not pgrs:
        missing.append("PGR")
    if not etp:
        missing.append("ETP")

    if missing:
        raise ValueError(f"É necessário ter {', '.join(missing)} criados antes de gerar o TR.")

    # Monta o dicionário com os dados dos artefatos
    artefatos_dados = {
        'dfd': dfd.to_dict() if dfd else None,
        'pgr': [pgr.to_dict() for pgr in pgrs] if pgrs else None,
        'etp': etp.to_dict() if etp else None
    }
    return artefatos_dados


async def gerar_dados_tr(artefatos: Dict, tr_in: TRCreate) -> Dict:
    """
    Gera um JSON estruturado para o TR usando o modelo Gemini.
    """
    client = get_genai_client()
    model = "gemini-2.5-flash"
    
    # Escolhe o prompt com base no tipo de contratação
    if tr_in.tipo_contratacao == "servicos":
        prompt_base = prompt_tr_servicos
    else:  # Default para "compras"
        prompt_base = prompt_tr

    logger.info(f"Prompt utilizado: {prompt_base}")

    # Monta o prompt final com as instruções e os dados dos artefatos
    prompt_completo = f"""
    {prompt_base}

    **Artefatos Fornecidos (JSON):**

    {json.dumps(artefatos, indent=2, ensure_ascii=False)}

    **Dados fornecidos pelo usuário:**
    Órgão contratante: {tr_in.orgao_contratante}
    Modalidade licitação: {tr_in.modalidade_licitacao}
    Tipo de Contratação: {tr_in.tipo_contratacao}
    """

    file_map = {
        "servicos": ["SEI_0619980_Anexo_IX___TERMO_DE_REFERENCIA_PARA_SERVICOS-1.pdf"],
        "compras": ["MODELO-TR-COMPRAS.html"],
    }

    filenames = file_map.get(tr_in.tipo_contratacao, "MODELO-TR-COMPRAS.html")

    uploaded_files = []
    for filename in filenames:
        uploaded = client.files.upload(file=os.path.join(temp_dir, filename))
        if isinstance(uploaded, list):
            uploaded_files.extend(uploaded)
        else:
            uploaded_files.append(uploaded)

    parts = [
        types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type)
        for f in uploaded_files
    ]
    parts.append(types.Part.from_text(text=prompt_completo))

    contents = [types.Content(role="user", parts=parts)]

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="application/json"
    )
 
    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config
        )
        logger.info(f"Resposta da IA para o TR: {response.text}")
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Erro ao gerar dados para o TR com IA: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro na comunicação com a IA para gerar o TR.")


async def update_tr_for_project(
    project_id: int, 
    tr_upd: TRUpdate, 
    db: AsyncSession, 
    current_user: RemoteUser  
) -> TR:
    """
    Atualiza o TR do projeto com os dados fornecidos.
    """
    # 1. Busca o TR existente
    stmt = (
        select(TR)
        .options(selectinload(TR.projeto), selectinload(TR.itens))
        .where(TR.id_projeto == project_id)
    )
    result = await db.execute(stmt)
    tr: TR | None = result.scalars().first()
    
    if not tr:
        raise HTTPException(status_code=404, detail="TR não encontrado para este projeto.")
    
    # 2. Verifica permissão
    if tr.user_created != current_user.username and tr.projeto.user_created != current_user.username:
        raise HTTPException(status_code=403, detail="Você não tem permissão para alterar este TR.")
    
    # 3. Atualiza todos os campos (simples e aninhados) em um único loop
    update_data = json.loads(tr_upd.model_dump_json(exclude_unset=True))
    
    for field, value in update_data.items():
        if field == 'itens':
            continue  # Itens são tratados separadamente abaixo

        # Se o valor for um modelo Pydantic, converte para dict antes de atribuir
        if isinstance(value, BaseModel):
            setattr(tr, field, value.model_dump())
        elif hasattr(tr, field):
            setattr(tr, field, value)
            
    # 4. Trata a atualização da lista de itens (lógica de substituição completa)
    if 'itens' in update_data: # Verifica se a chave 'itens' foi enviada na requisição
        # Deleta os itens existentes associados a este TR
        await db.execute(delete(TRItem).where(TRItem.id_tr == tr.id))
        
        # Limpa a coleção na memória e adiciona os novos itens
        tr.itens = []
        for item_data in tr_upd.itens or []:
            new_item = TRItem(**item_data.model_dump())
            tr.itens.append(new_item)
            
    # 5. Commit das alterações
    try:
        await db.commit()
        await db.refresh(tr)
        return tr
    except Exception:
        await db.rollback()
        raise