from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List, Dict, Any
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_remote_user, RemoteUser
from app.services.pgr_services import create_pgr_service, inicializar_analise_riscos_projeto
from app.schemas.pgr_schemas import PGRCreate, PGRRead
from app.models.projects_models import Projeto
from app.models.pgr_models import PGR
from app.models.solucao_models import SolucaoIdentificada
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse

import json
import logging

# Router com tags para organização
router = APIRouter(tags=["PGR"])

# Templates
templates_pgr = Jinja2Templates(directory="frontend/templates/pgr")

# Logging para debug
logger = logging.getLogger(__name__)

@router.get("/test-pgr")
async def test_pgr():
    """Rota de teste para verificar se PGR está funcionando"""
    return {"message": "PGR Router funcionando!", "status": "ok"}

@router.post("/projetos/{project_id}/create_pgr", response_model=List[PGRRead], status_code=201)
async def create_pgr(
    project_id: int,
    pgr_in: PGRCreate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Cria PGR baseado na análise de riscos das soluções identificadas.
    """
    logger.info(f"🚀 Criando PGR para projeto {project_id}")
    try:
        pgr_list = await create_pgr_service(pgr_in, db, current_user, project_id)
        logger.info(f"✅ PGR criado com sucesso para projeto {project_id}")
        return pgr_list
    
    except ValueError as ve:
        logger.error(f"❌ Erro de validação ao criar PGR: {ve}")
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"❌ Erro geral ao criar PGR: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar PGR: {str(e)}")


@router.get("/projetos/{projeto_id}/criar_pgr")
async def criar_pgr_page(
    request: Request,
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Carrega a página de criação de PGR (Plano de Gerenciamento de Riscos).
    """
    logger.info(f"📄 Acessando página de criação PGR para projeto {projeto_id}")
    
    try:
        stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
        result = await db.execute(stmt)
        projeto = result.scalar_one_or_none()

        if not projeto:
            logger.warning(f"⚠️ Projeto {projeto_id} não encontrado")
            raise HTTPException(status_code=404, detail="Projeto não encontrado")

        # Análise inicial de riscos das soluções
        try:
            analise_riscos = await inicializar_analise_riscos_projeto(projeto_id, db)
            logger.info(f"🔍 Análise de riscos realizada para projeto {projeto_id}")
            
        except Exception as e:
            logger.error(f"❌ Erro na análise inicial de riscos: {e}")
            # Fallback quando há erro
            analise_riscos = {
                "status": "erro",
                "erro": "Erro na análise inicial de riscos",
                "solucoes": []
            }

        return templates_pgr.TemplateResponse("pgr-solicitacao.html", {
            "request": request,
            "projeto": projeto,
            "analise_riscos": analise_riscos
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao carregar página PGR: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/projetos/{projeto_id}/analise_riscos")
async def get_analise_riscos(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint AJAX para buscar análise de riscos
    """
    logger.info(f"🔍 Buscando análise de riscos para projeto {projeto_id}")
    try:
        analise = await inicializar_analise_riscos_projeto(projeto_id, db)
        return JSONResponse(content=analise)
    except Exception as e:
        logger.error(f"❌ Erro ao buscar análise de riscos: {e}")
        return JSONResponse(
            content={
                "status": "erro",
                "erro": str(e)
            },
            status_code=500
        )


@router.get("/projetos/{projeto_id}/confere_pgr")
async def confere_pgr_page(
    request: Request, 
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Página para conferir os PGRs gerados (curadoria)
    """
    logger.info(f"📋 Acessando página de conferência PGR para projeto {projeto_id}")
    
    try:
        # Buscar o projeto
        stmt_projeto = select(Projeto).where(Projeto.id_projeto == projeto_id)
        result_projeto = await db.execute(stmt_projeto)
        projeto = result_projeto.scalar_one_or_none()

        if not projeto:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")

        # Buscar todos os PGRs associados ao projeto
        stmt_pgr = select(PGR).where(PGR.id_projeto == projeto_id).order_by(PGR.data_criacao.desc())
        result_pgr = await db.execute(stmt_pgr)
        pgr_records = result_pgr.scalars().all()

        # Formatar os dados para o front-end
        formatted_data = []
        for record in pgr_records:
            pgr_data = {
                "id_pgr": record.id_pgr,
                "id_projeto": record.id_projeto,
                "id_solucao": record.id_solucao,
                "objeto": record.objeto,
                "risco": record.risco,
                "usuario_criacao": record.usuario_criacao,
                "data_criacao": record.data_criacao.isoformat() if record.data_criacao else None
            }
            formatted_data.append(pgr_data)

        return templates_pgr.TemplateResponse("pgr-curadoria.html", {
            "request": request,
            "projeto": projeto,
            "pgr_data_json": json.dumps(formatted_data)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao carregar página de conferência: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/projetos/{projeto_id}/visualizacao_pgr")
async def visualizacao_pgr_page(
    request: Request, 
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Página para visualizar o PGR final (resultado)
    """
    logger.info(f"👁️ Acessando visualização PGR para projeto {projeto_id}")
    
    try:
        stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
        result = await db.execute(stmt)
        projeto = result.scalar_one_or_none()

        if not projeto:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        return templates_pgr.TemplateResponse("pgr-resultado.html", {
            "request": request,
            "projeto": projeto
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao carregar visualização: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/projetos/{projeto_id}/pgr", response_model=List[PGRRead])
async def get_pgr_by_project(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    API para buscar PGRs existentes de um projeto
    """
    logger.info(f"📋 Buscando PGRs do projeto {projeto_id}")
    try:
        stmt = select(PGR).where(PGR.id_projeto == projeto_id)
        result = await db.execute(stmt)
        pgrs = result.scalars().all()
        
        pgrs_response = []
        for pgr in pgrs:
            pgr_read = PGRRead(
                id_pgr=pgr.id_pgr,
                id_projeto=pgr.id_projeto,
                id_solucao=pgr.id_solucao,
                usuario_criacao=pgr.usuario_criacao,
                data_criacao=pgr.data_criacao,
                objeto=pgr.objeto,
                risco=pgr.risco
            )
            pgrs_response.append(pgr_read)
        
        logger.info(f"✅ Encontrados {len(pgrs_response)} PGRs para projeto {projeto_id}")
        return pgrs_response
        
    except Exception as e:
        logger.error(f"❌ Erro ao buscar PGRs: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar PGRs: {str(e)}")


@router.delete("/projetos/{projeto_id}/pgr/{pgr_id}")
async def delete_pgr_specific(
    projeto_id: int,
    pgr_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    API para deletar um PGR específico
    """
    logger.info(f"🗑️ Deletando PGR {pgr_id} do projeto {projeto_id}")
    try:
        stmt = select(PGR).where(PGR.id_pgr == pgr_id, PGR.id_projeto == projeto_id)
        result = await db.execute(stmt)
        pgr = result.scalar_one_or_none()
        
        if not pgr:
            raise HTTPException(status_code=404, detail="PGR não encontrado")
        
        # Remove o PGR
        await db.delete(pgr)
        await db.commit()
        
        logger.info(f"✅ PGR {pgr_id} deletado com sucesso")
        return {"message": "PGR deletado com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar PGR: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar PGR: {str(e)}")


@router.delete("/projetos/{projeto_id}/pgr")
async def delete_all_pgr_from_project(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    API para deletar todos os PGRs de um projeto
    """
    logger.info(f"🗑️ Deletando todos os PGRs do projeto {projeto_id}")
    try:
        # Remove todos os PGRs do projeto
        stmt = delete(PGR).where(PGR.id_projeto == projeto_id)
        result = await db.execute(stmt)
        
        # Atualiza flag no projeto
        stmt_projeto = select(Projeto).where(Projeto.id_projeto == projeto_id)
        result_projeto = await db.execute(stmt_projeto)
        projeto = result_projeto.scalar_one_or_none()
        
        if projeto:
            projeto.exist_pgr = False  # Atualiza a flag exist_pgr
            
        await db.commit()
        
        deleted_count = result.rowcount
        logger.info(f"✅ {deleted_count} PGRs deletados do projeto {projeto_id}")
        
        return {
            "message": f"Todos os PGRs do projeto deletados com sucesso",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar PGRs do projeto: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar PGRs: {str(e)}")