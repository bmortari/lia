from datetime import datetime
from fastapi import HTTPException
from app.client import get_genai_client
from app.dependencies import RemoteUser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict
from google.genai import types
from app.models.projects_models import Projeto
from app.models.tr_models import TR, TRItem
from app.models.dfd_models import DFD
from app.models.pgr_models import PGR
from app.models.etp_models import ETP
from app.schemas.tr_schemas import TRCreate, TRRead
from app.services.prompts.tr_prompts import prompt_tr
from app.config import acre_tz

import json
import logging

logger = logging.getLogger(__name__)


async def create_tr_service(tr_in: TRCreate, db: AsyncSession, current_user: RemoteUser, project_id: int) -> TRRead:
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
        dados_tr_json = await gerar_dados_tr(artefatos)
        logger.info("Dados do TR gerados com sucesso.")

        # Mapeia o JSON para o modelo SQLAlchemy
        itens_data = dados_tr_json.pop("itens", [])

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
        projeto.exist_tr = True

        await db.commit()
        await db.refresh(novo_tr)

        logger.info(f"TR {novo_tr.id} criado com sucesso para o projeto {project_id}.")

        return TRRead.model_validate(novo_tr)

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


async def gerar_dados_tr(artefatos: Dict) -> Dict:
    """
    Gera um JSON estruturado para o TR usando o modelo Gemini.
    """
    client = get_genai_client()
    model = "gemini-2.5-flash"  # Modelo de IA

    # Monta o prompt final com as instruções e os dados dos artefatos
    prompt_completo = f"""
    {prompt_tr}

    **Artefatos Fornecidos (JSON):**

    {json.dumps(artefatos, indent=2, ensure_ascii=False)}
    """

    generation_config = types.GenerationConfig(
        response_mime_type="application/json"
    )
    contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt_completo)])]

    try:
        response = await client.models.generate_content_async(
            model=model,
            contents=contents,
            generation_config=generation_config
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Erro ao gerar dados para o TR com IA: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro na comunicação com a IA para gerar o TR.")
