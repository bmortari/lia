from fastapi import HTTPException
from app.client import get_genai_client
from app.dependencies import RemoteUser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, List
from google.genai import types
from datetime import datetime
from app.models.projects_models import Projeto
from app.models.tr_models import TR
from app.models.dfd_models import DFD
from app.models.pgr_models import PGR
from app.models.etp_models import ETP
from app.schemas.tr_schemas import TRCreate, TRRead

import json
import logging

logger = logging.getLogger(__name__)


async def create_tr_service(tr_in: TRCreate, db: AsyncSession, current_user: RemoteUser, project_id: int) -> TRRead:
    """
    Cria um Termo de Referência (TR) a partir de uma classe TRCreate.
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

        # prompt_usuario # Avaliar se é necessário implementar

        # Gera os dados estruturados para o TR
        dados_tr_json = await gerar_dados_tr(tr_in.prompt_usuario, artefatos)

        # Gera o conteúdo em texto do TR
        conteudo_tr_markdown = await gerar_tr_ia(dados_tr_json, "Gerar o texto para o Termo de Referência")

        # Cria a instância do TR no banco de dados
        novo_tr = TR(
            id_projeto=project_id,
            user_created=current_user.username,
            # O mapeamento dos campos do JSON para o modelo TR dependerá da estrutura do JSON gerado
            # e do modelo TR. Isto é um exemplo.
            objeto=dados_tr_json.get("objeto", "Objeto a ser definido"),
            justificativa=dados_tr_json.get("justificativa", "Justificativa a ser definida"),
            conteudo_tr=conteudo_tr_markdown,
            status=True,
            dt_created=datetime.utcnow(),
            dt_updated=datetime.utcnow()
        )

        db.add(novo_tr)
        
        projeto.exist_tr = True

        await db.commit()
        await db.refresh(novo_tr)

        return TRRead.from_orm(novo_tr)

    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao criar TR: {e}")
        raise e


async def buscar_artefatos(project_id: int, db: AsyncSession) -> Dict[str, any]:
    """
    Verifica se já existe um DFD, PGR e ETP para o projeto.
    Retorna um dicionário com os dados dos artefatos ou levanta um erro se algum estiver faltando.
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

    # Retorna os dados dos artefatos para serem usados no prompt (EDITAR COM OS ITENS NECESSÁRIOS)
    artefatos_dados = {}
    artefatos_dados['dfd'] = {
        "objeto_contratado": dfd.objeto_contratado,
        "quantidade_contratada": dfd.quantidade_contratada,
        "justificativa_contratacao": dfd.justificativa_contratacao,
        "previsao_data_bem_servico": dfd.previsao_data_bem_servico,
        "unidade_demandante": dfd.unidade_demandante,
        "equipe_de_planejamento": dfd.equipe_de_planejamento
    } if dfd else None
    
    artefatos_dados['pgr'] = [{
        "objeto": pgr.objeto,
        "risco": pgr.risco,
    } for pgr in pgrs] if pgrs else None

    artefatos_dados['etp'] = {
        "objeto_contratado": etp.objeto_contratado,
        "sist_reg_preco": etp.sist_reg_preco,
        "necessidade_contratacao": etp.necessidade_contratacao,
        "alinhamento_estrategico": etp.alinhamento_estrategico,
        "info_contratacao": etp.info_contratacao,
        "previsto_pca": etp.previsto_pca,
        "solucao": etp.solucao,
        "lev_mercado": etp.lev_mercado,
        "posic_conclusivo": etp.posic_conclusivo,
        "demonst_resultados": etp.demonst_resultados,
        "providencias": etp.providencias,
        "impac_ambientais": etp.impac_ambientais,
        "req_contratacao": etp.req_contratacao,
        "quantidade_estimada": etp.quantidade_estimada,
        "just_nao_parc": etp.just_nao_parc,
        "valor_total": etp.valor_total,
        "equipe_de_planejamento": etp.equipe_de_planejamento
    } if etp else None

    return artefatos_dados


async def gerar_dados_tr(prompt_usuario: str, artefatos: Dict) -> Dict:
    """
    Gera um JSON com dados para o TR.
    """
    client = get_genai_client()
    model = "gemini-2.5-flash"

    # O prompt completo será implementado depois
    prompt_completo = f"""
    **Instrução:** Você é um assistente especialista em criar Termos de Referência (TR) para o setor público.
    Com base nos artefatos de planejamento (DFD, PGR, ETP) e na solicitação do usuário,
    gere uma estrutura JSON detalhada para um Termo de Referência.

    **Artefatos Fornecidos (resumo):**
    - DFD (Documento de Formalização da Demanda): {json.dumps(artefatos.get('dfd'), indent=2, ensure_ascii=False)}
    - PGR (Plano de Gerenciamento de Riscos): {json.dumps(artefatos.get('pgr'), indent=2, ensure_ascii=False)}
    - ETP (Estudo Técnico Preliminar): {json.dumps(artefatos.get('etp'), indent=2, ensure_ascii=False)}

    **Solicitação do Usuário:**
    "{prompt_usuario}"

    **Formato de Saída Obrigatório (JSON):**
    Responda estritamente com um objeto JSON contendo as seções principais de um TR, como:
    {{
      "objeto": "Descrição clara e concisa do objeto da contratação.",
      "justificativa": "Justificativa detalhada da necessidade da contratação.",
      "especificacoes_tecnicas": "Lista de especificações técnicas detalhadas do objeto/serviço.",
      "obrigacoes_contratada": "Lista de obrigações da empresa contratada.",
      "obrigacoes_contratante": "Lista de obrigações do órgão contratante.",
      "criterios_aceitacao": "Critérios para aceitação e recebimento do objeto/serviço.",
      "modelo_execucao": "Descrição de como o serviço será executado e gerenciado.",
      "estimativa_valor": "Estimativa de valor, se disponível nos artefatos.",
      "prazo_execucao": "Prazo de execução do contrato."
    }}
    """

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="application/json"
    )
    contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt_completo)])]

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Erro ao gerar dados para o TR com IA: {e}")
        raise


async def gerar_tr_ia(dados_json: Dict, prompt: str) -> str:
    """
    Recebe os dados do JSON, um prompt e gera um texto bruto com markdowns.
    """
    client = get_genai_client()
    model = "gemini-2.5-flash"

    prompt_completo = f"""
    **Instrução:** Você é um redator técnico especialista em documentos de licitação.
    Com base na estrutura JSON fornecida, elabore o texto completo de um Termo de Referência (TR).
    O texto deve ser claro, bem formatado com markdown (títulos, listas, negrito) e seguir
    as melhores práticas para documentos oficiais.

    **Prompt Adicional:**
    "{prompt}"

    **Dados Estruturados (JSON):**
    {json.dumps(dados_json, indent=2, ensure_ascii=False)}

    **Resultado Esperado:**
    Um documento de texto completo, formatado com markdown, que represente o Termo de Referência.
    """

    contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt_completo)])]

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents
        )
        return response.text
    except Exception as e:
        logger.error(f"Erro ao gerar texto do TR com IA: {e}")
        raise
