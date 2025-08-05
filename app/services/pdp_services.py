from app.services.pdp_search_services import PNCPSearcher
from app.services.prompts.pdp_prompts import prompt_sistema
from app.schemas.pdp_schemas import PpModel, PDPCreate, PDPRead, PDPUpdate
from app.client import get_genai_client
from app.dependencies import RemoteUser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, update, delete
from typing import Optional, Dict, List
from google.genai import types
from google.genai.types import Schema
from datetime import datetime, date
from pydantic import BaseModel, Field
from app.models.projects_models import Projeto
from app.models.pdp_models import PDP
from app.models.solucao_models import SolucaoIdentificada
from fastapi import HTTPException
from sqlalchemy.orm import selectinload

import json 
import os


def parse_date_safely(date_value, fallback_date=None):
    """
    Converte string de data para objeto date de forma segura
    """
    if fallback_date is None:
        fallback_date = date.today()
    
    if isinstance(date_value, date):
        return date_value
    elif isinstance(date_value, str):
        try:
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d']:
                try:
                    return datetime.strptime(date_value, fmt).date()
                except ValueError:
                    continue
            return fallback_date
        except:
            return fallback_date
    else:
        return fallback_date

async def create_pdp_service(pdp_in: PDPCreate, db: AsyncSession, current_user: RemoteUser, project_id: int) -> List[PDPRead]:
    try:
        # Verifica se o projeto existe
        result = await db.execute(
            select(Projeto).where(Projeto.id_projeto == project_id)
        )
        projeto = result.scalar_one_or_none()
        if not projeto:
            raise ValueError("Projeto não encontrado.")
        
        # Busca contexto do projeto
        contexto = await buscar_dfd_por_id(project_id, db)
        if not contexto:
            raise ValueError("Dados do projeto não encontrados.")
        
        # <<< CORREÇÃO 1: Limpar PDPs antigos para garantir que a nova análise substitua a anterior >>>
        print(f"Limpando PDPs antigos para o projeto ID: {project_id}")
        await db.execute(delete(PDP).where(PDP.id_projeto == project_id))
        await db.flush() # Garante que a exclusão seja processada antes das inserções

        # Realiza pesquisa de mercado...
        searcher = PNCPSearcher()
        palavras_busca = " ".join(pdp_in.palavras_chave) if pdp_in.palavras_chave else contexto.get('objeto_contratacao', 'contratação')
        
        resultados = searcher.pesquisar_mercado(
            palavras_busca=palavras_busca,
            texto_similaridade=pdp_in.descricao,
            tipos_documento=['ata', 'contrato'],
            max_documentos=1000,
            max_similares=8,
            ufs=pdp_in.ufs if pdp_in.ufs else None,
            esferas=pdp_in.esferas if pdp_in.esferas else None,
            modalidades=pdp_in.modalidades if pdp_in.modalidades else None
        )
        print(f"Encontrados {len(resultados)} documentos similares")

        # Monta o prompt para IA
        prompt_usuario = pdp_in.descricao
        prompt_final_completo = f"""
        {prompt_sistema}
        ---
        Contexto do Banco de Dados (JSON):
        {json.dumps(contexto, indent=2, ensure_ascii=False)}
        ---
        Prompt do Usuário:
        "{prompt_usuario}"
        ---
        Filtros aplicados na pesquisa:
        - Palavras-chave: {pdp_in.palavras_chave}
        - UFs: {pdp_in.ufs}
        - Esferas: {pdp_in.esferas}
        - Modalidades: {pdp_in.modalidades}
        """

        # Chama a IA
        resposta_ia = await consulta_ia(prompt_final_completo)
        print("Resposta da IA:", json.dumps(resposta_ia, indent=2, ensure_ascii=False))

        pdps_criados = []
        
        # <<< CORREÇÃO 2: Simplificação do loop para sempre criar novos PDPs >>>
        for item_ia in resposta_ia:
            try:
                if hasattr(item_ia, 'to_pdp_data'):
                    pdp_data = item_ia.to_pdp_data()
                else:
                    pdp_data = dict(item_ia)
                    pdp_data['data_vigencia_inicio'] = parse_date_safely(pdp_data.get('data_vigencia_inicio'))
                
                # Sempre cria um novo PDP para cada item retornado pela IA
                novo_pdp = PDP(
                    id_projeto=project_id,
                    orgao_contratante=pdp_data.get('orgao_contratante', contexto.get('unidade_demandante', 'N/D')),
                    processo_pregao=pdp_data.get('processo_pregao', 'A definir'),
                    empresa_adjudicada=pdp_data.get('empresa_adjudicada', 'A definir'),
                    cnpj_empresa=pdp_data.get('cnpj_empresa', 'A definir'),
                    objeto=pdp_data.get('objeto', contexto.get('objeto_contratacao', 'N/D')),
                    data_vigencia_inicio=pdp_data.get('data_vigencia_inicio'),
                    tipo_fonte=pdp_data.get('tipo_fonte', 'Análise IA + Pesquisa Mercado'),
                    tabela_itens=pdp_data.get('tabela_itens', []),
                    user_created=current_user.username if hasattr(current_user, 'username') else 'sistema'
                )
                
                db.add(novo_pdp)
                await db.flush() # Garante que o novo PDP seja adicionado à sessão
                pdps_criados.append(novo_pdp)
                    
            except Exception as e:
                print(f"Erro ao processar item da IA: {e}")
                # Não faz rollback aqui para não descartar os itens já processados
                continue
        
        # <<< CORREÇÃO 3: Atualizar o status do projeto com base no resultado >>>
        if pdps_criados:
            print(f"Atualizando o status 'exist_pdp' para True no projeto ID: {project_id}")
            projeto.exist_pdp = True
        else:
            # Se nenhum PDP foi criado (ex: resposta da IA vazia), garante que o status seja False
            print(f"Nenhum PDP foi criado. Atualizando 'exist_pdp' para False no projeto ID: {project_id}")
            projeto.exist_pdp = False

        # <<< NOVA CORREÇÃO: Salvar soluções identificadas baseadas na análise da IA >>>
        await salvar_solucoes_identificadas(project_id, pdp_in, contexto, db, current_user)

        await db.commit()
        
        pdps_response = []
        for pdp in pdps_criados:
            # Atualiza o objeto para garantir que todos os campos (como data_created) estejam populados
            await db.refresh(pdp) 
            pdp_read = PDPRead.from_orm(pdp)
            pdps_response.append(pdp_read)
        
        return pdps_response
        
    except Exception as e:
        await db.rollback()
        print(f"Erro geral na criação do PDP: {e}")
        raise e


async def salvar_solucoes_identificadas(project_id: int, pdp_in: PDPCreate, contexto: Dict, db: AsyncSession, current_user: RemoteUser):
    """
    Salva soluções identificadas baseadas nos dados de entrada do PDP
    """
    try:
        # Remove soluções existentes para este projeto
        print(f"Removendo soluções existentes para o projeto ID: {project_id}")
        await db.execute(delete(SolucaoIdentificada).where(SolucaoIdentificada.id_projeto == project_id))
        
        # Cria soluções baseadas nos dados de entrada
        solucoes = []
        
        # Solução principal baseada na descrição
        solucao_principal = {
            "nome": f"Solução Principal - {contexto.get('objeto_contratacao', 'Contratação')}",
            "descricao": pdp_in.descricao,
            "palavras_chave": pdp_in.palavras_chave or [],
            "complexidade_estimada": "Média",
            "tipo": "principal",
            "analise_riscos": []
        }
        solucoes.append(solucao_principal)
        
        # Soluções complementares baseadas nas palavras-chave
        if pdp_in.palavras_chave and len(pdp_in.palavras_chave) > 1:
            for i, palavra in enumerate(pdp_in.palavras_chave[1:3]):  # Máximo 2 soluções complementares
                solucao_complementar = {
                    "nome": f"Solução {palavra.capitalize()}",
                    "descricao": f"Abordagem especializada focada em {palavra}",
                    "palavras_chave": [palavra],
                    "complexidade_estimada": "Baixa" if i == 0 else "Média",
                    "tipo": "complementar",
                    "analise_riscos": []
                }
                solucoes.append(solucao_complementar)
        
        # Solução econômica
        solucao_economica = {
            "nome": "Solução Econômica",
            "descricao": "Alternativa de menor custo mantendo a qualidade necessária",
            "palavras_chave": ["básico", "economia"] + (pdp_in.palavras_chave[:1] if pdp_in.palavras_chave else []),
            "complexidade_estimada": "Baixa",
            "tipo": "economica",
            "analise_riscos": []
        }
        solucoes.append(solucao_economica)
        
        # Salva cada solução no banco
        for i, solucao_data in enumerate(solucoes):
            try:
                nova_solucao = SolucaoIdentificada(
                    id_projeto=project_id,
                    nome=solucao_data["nome"],
                    descricao=solucao_data["descricao"],
                    palavras_chave=solucao_data["palavras_chave"],
                    complexidade_estimada=solucao_data["complexidade_estimada"],
                    tipo=solucao_data["tipo"],
                    analise_riscos=solucao_data["analise_riscos"],
                    usuario_criacao=current_user.username if hasattr(current_user, 'username') else 'sistema'
                )
                db.add(nova_solucao)
                print(f"DEBUG: Solução {i+1} criada: {solucao_data['nome']}")
                
            except Exception as e:
                print(f"DEBUG: Erro ao criar solução {i+1}: {e}")
                continue
        
        await db.flush()
        print(f"DEBUG: {len(solucoes)} soluções salvas com sucesso para projeto {project_id}")
        
    except Exception as e:
        print(f"Erro ao salvar soluções identificadas: {e}")
        # Não levanta exceção para não quebrar o fluxo principal


# ... (O resto do arquivo permanece o mesmo)
async def buscar_dfd_por_id(project_id: int, db: AsyncSession) -> Optional[Dict[str, str]]:
    query = text("""
        SELECT
            d.id_dfd,
            d.id_projeto,
            d.usuario_criacao,
            TO_CHAR(d.data_criacao, 'YYYY-MM-DD') AS data_criacao,
            d.unidade_demandante,
            d.previsto_pca,
            d.item_pca,
            d.objeto_contratacao,
            d.justificativa as justificativa_necessidade,
            d.quantidade as itens_quantidade,
            TO_CHAR(d.previsao_da_entrega , 'YYYY-MM-DD') AS previsao_inicio_servicos,
            d.alinhamento_estrategico,
            d.equipe_de_planejamento as informacoes_adicionais
        FROM core.dfd d
        WHERE d.id_projeto = :project_id
    """)

    try:
        result = await db.execute(query, {"project_id": project_id})
        row = result.mappings().fetchone()
        return dict(row) if row else None
    except Exception as e:
        print(f"Erro ao buscar Projeto por ID: {e}")
        return None


async def consulta_ia(prompt_final_completo):
    try:
        client = get_genai_client()
        model = "gemini-2.0-flash"
        
        similares_dir = os.path.join("app", "temp", "docs", "similares")
        pdf_files = [
            f for f in os.listdir(similares_dir)
            if f.lower().endswith(".pdf")
        ]

        if not pdf_files:
            raise ValueError("Não foi possível achar nenhum documento com as seleções feitas, por favor tente novamente.")
            
        pdf_files = pdf_files[:5]

        uploaded_files = []
        for file_name in pdf_files:
            file_path = os.path.join(similares_dir, file_name)
            uploaded = client.files.upload(file=file_path)
            uploaded_files.append(uploaded)

        parts = []
        for uploaded in uploaded_files:
            parts.append(
                types.Part.from_uri(
                    file_uri=uploaded.uri,
                    mime_type=uploaded.mime_type
                )
            )
        parts.append(types.Part.from_text(text=prompt_final_completo))
        
        contents = [types.Content(role="user", parts=parts)]
            
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[PpModel],
        )
        
        print("--- Aguardando resposta da API Gemini... ---")
        
        response_chunks = []
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            response_chunks.append(chunk.text)
            print(chunk.text)

        full_response_json = "".join(response_chunks)

        print("\n--- Resposta da API Gemini (JSON Estruturado) ---")
        dados_formatados = json.loads(full_response_json)

        return dados_formatados

    except Exception as e:
        print(f"\nOcorreu um erro durante a execução: {e}")
        return [{
            "orgao_contratante": "A definir",
            "processo_pregao": "A definir", 
            "empresa_adjudicada": "A definir",
            "cnpj_empresa": "A definir",
            "objeto": "Objeto baseado no projeto",
            "data_vigencia_inicio": date.today().strftime('%Y-%m-%d'),
            "tipo_fonte": "Análise automática (fallback)",
            "tabela_itens": [
                {
                    "item": 1,
                    "descricao": "Item padrão",
                    "unidade": "un",
                    "quantidade": 1.0,
                    "valor_unitario": 1000.0,
                    "valor_total": 1000.0,
                    "especificacao_tecnica": "A definir",
                    "marca_referencia": "A definir",
                    "prazo_entrega": "30 dias",
                    "observacoes": "Valores estimados - necessária pesquisa detalhada"
                }
            ]
        }]


async def consulta_ia_simples(projeto_id: int, db: AsyncSession) -> Dict[str, any]:
    try:
        contexto_projeto = await buscar_dfd_por_id(projeto_id, db)
        if not contexto_projeto:
            return {"erro": "Projeto não encontrado"}

        prompt_simples = f"""
        Analise o seguinte projeto de contratação pública e forneça uma análise detalhada para pesquisa de preços:

        DADOS DO PROJETO:
        - Objeto: {contexto_projeto.get('objeto_contratacao', 'Não informado')}
        - Justificativa: {contexto_projeto.get('justificativa_necessidade', 'Não informada')}
        - Unidade Demandante: {contexto_projeto.get('unidade_demandante', 'Não informada')}

        Forneça uma análise em formato JSON com os seguintes campos:
        {{
            "resumo_objeto": "Resumo claro do objeto em até 150 palavras",
            "categoria_estimada": "Categoria principal (ex: Serviços, Bens, Obras, Software, Consultoria)",
            "complexidade": "Baixa, Média ou Alta",
            "sugestoes_palavras_chave": ["palavra1", "palavra2", "palavra3"],
            "observacoes": "Observações importantes sobre o projeto",
            "tipos_solucao": [
                {{
                    "nome": "Nome da solução",
                    "descricao": "Descrição da abordagem",
                    "palavras_chave": ["palavra1", "palavra2"],
                    "complexidade_estimada": "Baixa/Média/Alta",
                    "tipo": "principal/complementar/economica",
                    "analise_riscos": [
                        {{
                            "risco": "Descrição do risco",
                            "probabilidade": "Baixa/Média/Alta",
                            "impacto": "Baixo/Médio/Alto",
                            "mitigacao": "Ações sugeridas para mitigar o risco"
                        }}
                    ]
                }}
            ],
            "alertas": ["Alerta 1 se houver", "Alerta 2 se houver"],
            "recomendacoes_busca": "Dicas para a pesquisa de preços"
        }}

        IMPORTANTE: 
        - Crie pelo menos 2 tipos de solução diferentes.
        - Para cada solução, identifique pelo menos 2 riscos potenciais.
        - Seja específico nas palavras-chave.
        - Inclua alertas sobre pontos de atenção na contratação.
        """

        client = get_genai_client()
        model = "gemini-2.0-flash"
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="application/json"
        )
        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt_simples)])]
        
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config
        )
        
        resposta_json = json.loads(response.text)
        
        if isinstance(resposta_json, list):
            resposta_json = resposta_json[0] if resposta_json and isinstance(resposta_json[0], dict) else {}

        resposta_json = validar_e_enriquecer_resposta(resposta_json, contexto_projeto)
        
        return resposta_json
        
    except Exception as e:
        print(f"Erro na consulta à IA: {e}")
        return criar_resposta_fallback(contexto_projeto)


def validar_e_enriquecer_resposta(resposta_ia: Dict, contexto_projeto: Dict) -> Dict:
    resposta_ia.setdefault("resumo_objeto", contexto_projeto.get('objeto_contratacao', 'Objeto não informado'))
    resposta_ia.setdefault("categoria_estimada", "Serviços")
    resposta_ia.setdefault("complexidade", "Média")
    resposta_ia.setdefault("sugestoes_palavras_chave", [])
    resposta_ia.setdefault("observacoes", "")
    resposta_ia.setdefault("tipos_solucao", [])
    resposta_ia.setdefault("alertas", [])
    resposta_ia.setdefault("recomendacoes_busca", "")

    for i, solucao in enumerate(resposta_ia["tipos_solucao"]):
        if not isinstance(solucao, dict):
            continue
        
        solucao.setdefault("nome", f"Solução {i+1}")
        solucao.setdefault("descricao", "Descrição não disponível")
        solucao.setdefault("palavras_chave", [])
        solucao.setdefault("complexidade_estimada", "Média")
        solucao.setdefault("tipo", "complementar")
        solucao.setdefault("analise_riscos", [])

        if not isinstance(solucao.get("analise_riscos"), list):
            solucao["analise_riscos"] = []

        for risco in solucao["analise_riscos"]:
            if not isinstance(risco, dict):
                continue
            risco.setdefault("risco", "Risco não identificado")
            risco.setdefault("probabilidade", "Média")
            risco.setdefault("impacto", "Médio")
            risco.setdefault("mitigacao", "Ações de mitigação padrão")

    return resposta_ia


def criar_resposta_fallback(contexto_projeto: Dict) -> Dict:
    objeto = contexto_projeto.get('objeto_contratacao', 'Objeto não informado')
    
    categoria = "Serviços"
    if any(word in objeto.lower() for word in ['software', 'sistema', 'aplicativo', 'tecnologia']):
        categoria = "Software"
    elif any(word in objeto.lower() for word in ['equipamento', 'material', 'suprimento']):
        categoria = "Bens"
    elif any(word in objeto.lower() for word in ['obra', 'construção', 'reforma']):
        categoria = "Obras"
    elif any(word in objeto.lower() for word in ['consultoria', 'assessoria', 'estudos']):
        categoria = "Consultoria"

    riscos_fallback = [
        {"risco": "Especificações técnicas inadequadas", "probabilidade": "Média", "impacto": "Alto", "mitigacao": "Revisão detalhada do termo de referência por equipe técnica."},
        {"risco": "Variação de preços de mercado", "probabilidade": "Alta", "impacto": "Médio", "mitigacao": "Realizar pesquisa de preços ampla e utilizar índices de reajuste em contrato."}
    ]

    solucoes = criar_solucoes_basicas({"categoria_estimada": categoria, "complexidade": "Média"}, contexto_projeto)
    for solucao in solucoes:
        solucao["analise_riscos"] = riscos_fallback

    return {
        "resumo_objeto": f"Contratação de {categoria.lower()} conforme especificado no projeto",
        "categoria_estimada": categoria,
        "complexidade": "Média",
        "sugestoes_palavras_chave": extrair_palavras_do_contexto(contexto_projeto),
        "observacoes": "Análise automática indisponível. Dados gerados com base no contexto do projeto.",
        "tipos_solucao": solucoes,
        "alertas": ["Recomenda-se revisar especificações técnicas", "Verificar requisitos de qualificação"],
        "recomendacoes_busca": "Use palavras-chave específicas e considere diferentes fornecedores.",
        "status_ia": "fallback"
    }


def criar_solucoes_basicas(analise: Dict, contexto_projeto: Dict) -> List[Dict]:
    objeto = contexto_projeto.get('objeto_contratacao', 'Serviços gerais')
    
    return [
        {
            "nome": f"Solução Padrão - {analise.get('categoria_estimada', 'Serviços')}",
            "descricao": f"Abordagem tradicional para {objeto.lower()}",
            "palavras_chave": extrair_palavras_do_contexto(contexto_projeto),
            "complexidade_estimada": analise.get('complexidade', 'Média'),
            "tipo": "principal",
            "analise_riscos": []
        },
        {
            "nome": "Solução Alternativa",
            "descricao": "Abordagem com foco em custo-benefício",
            "palavras_chave": extrair_palavras_do_contexto(contexto_projeto),
            "complexidade_estimada": "Baixa",
            "tipo": "economica",
            "analise_riscos": []
        }
    ]


def extrair_palavras_do_contexto(contexto_projeto: Dict) -> List[str]:
    objeto = contexto_projeto.get('objeto_contratacao', '')
    justificativa = contexto_projeto.get('justificativa_necessidade', '')
    
    texto_completo = f"{objeto} {justificativa}".lower()
    
    palavras = []
    if any(word in texto_completo for word in ['software', 'sistema', 'aplicativo']):
        palavras.extend(['software', 'licença', 'sistema', 'tecnologia'])
    elif any(word in texto_completo for word in ['limpeza', 'conservação']):
        palavras.extend(['limpeza', 'conservação', 'manutenção', 'serviços'])
    elif any(word in texto_completo for word in ['segurança', 'vigilância']):
        palavras.extend(['segurança', 'vigilância', 'monitoramento'])
    else:
        palavras.extend(['serviços', 'contratação', 'fornecimento'])
    
    return palavras[:5]


async def inicializar_analise_projeto(projeto_id: int, db: AsyncSession) -> Dict[str, str]:
    try:
        contexto_projeto = await buscar_dfd_por_id(projeto_id, db)
        
        if not contexto_projeto:
            raise ValueError("Projeto não encontrado")
        
        analise_ia = await consulta_ia_simples(projeto_id, db)
        
        resultado = {
            "projeto": {
                "id": projeto_id,
                "objeto": contexto_projeto.get('objeto_contratacao'),
                "unidade_demandante": contexto_projeto.get('unidade_demandante'),
                "data_criacao": contexto_projeto.get('data_criacao')
            },
            "analise_inicial": analise_ia,
            "status": "sucesso",
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"✅ Análise inicializada com sucesso para projeto {projeto_id}")
        return resultado
        
    except Exception as e:
        print(f"Erro na inicialização da análise para projeto {projeto_id}: {e}")
        return {
            "projeto": {"id": projeto_id},
            "analise_inicial": criar_resposta_fallback({}),
            "status": "erro_com_fallback",
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }

async def update_pdp_for_project(project_id: int, pdp_id: int, pdp_upd: PDPUpdate, db: AsyncSession, current_user: RemoteUser) -> PDP:
    # 1) Busca o PDP existente
    stmt = (
        select(PDP)
        .options(selectinload(PDP.projeto))
        .where(PDP.id_projeto == project_id, PDP.id == pdp_id)
    )
    result = await db.execute(stmt)
    pdp: PDP | None = result.scalars().first()
    
    if not pdp:
        raise HTTPException(status_code=404, detail="PDP não encontrado para este projeto.")
    
    if pdp.user_created != current_user.username and pdp.projeto.user_created != current_user.username:
        raise HTTPException(status_code=403, detail="Você não tem permissão para alterar este PDP.")

    # 2) Para cada campo opcional, verifica e atualiza
    update_data = pdp_upd.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(pdp, key, value)

    # 3) Persiste mudanças
    try:
        await db.commit()
        await db.refresh(pdp)
        return pdp
    except Exception:
        await db.rollback()
        raise
