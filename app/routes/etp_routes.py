from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List, Dict, Any
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_remote_user, RemoteUser
from app.services.etp_services import create_etp_service, inicializar_analise_etp_projeto
from app.schemas.etp_schemas import ETPCreate, ETPRead, ETPUpdate
from app.models.projects_models import Projeto
from app.models.etp_models import ETP
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import json
import logging

# Router com tags para organização
router = APIRouter(tags=["ETP"])

# Templates
templates_etp = Jinja2Templates(directory="frontend/templates/etp")

# Logging para debug
logger = logging.getLogger(__name__)


class ETPUpdateRoute(BaseModel):
    """Schema para atualização de ETP via rota"""
    unidade_demandante: str = None
    objeto_contratacao: str = None
    sist_reg_preco: bool = None
    justificativa: str = None
    alinhamento_estrategico: List[str] = None
    info_contratacao: str = None
    previsto_pca: bool = None
    item_pca: int = None
    req_contratacao: List[str] = None
    lev_mercado: Dict[str, Any] = None
    solucao: str = None
    quantidade_estimada: Dict[str, Any] = None
    just_nao_parc: str = None
    valor_total: str = None
    demonst_resultados: Dict[str, Any] = None
    serv_continuo: bool = None
    justif_serv_continuo: str = None
    providencias: Dict[str, Any] = None
    impac_ambientais: str = None
    alinhamento_pls: List[str] = None
    posic_conclusivo: bool = None
    justif_posic_conclusivo: str = None
    equipe_de_planejamento: str = None


@router.get("/test-etp")
async def test_etp():
    """Rota de teste para verificar se ETP está funcionando"""
    return {"message": "ETV Router funcionando!", "status": "ok"}


@router.post("/projetos/{project_id}/create_etp", response_model=List[ETPRead], status_code=201)
async def create_etp(
    project_id: int,
    etp_in: ETPCreate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Cria ETP baseado na síntese dos artefatos anteriores (DFD, PDP, PGR).
    """
    logger.info(f"🚀 Criando ETP para projeto {project_id}")
    try:
        etp_list = await create_etp_service(etp_in, db, current_user, project_id)
        logger.info(f"✅ ETP criado com sucesso para projeto {project_id}")
        return etp_list
    
    except ValueError as ve:
        logger.error(f"❌ Erro de validação ao criar ETP: {ve}")
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"❌ Erro geral ao criar ETP: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar ETP: {str(e)}")


@router.get("/projetos/{projeto_id}/criar_etp")
async def criar_etp_page(
    request: Request,
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Carrega a página de criação de ETP (Estudo Técnico Preliminar).
    """
    logger.info(f"📄 Acessando página de criação ETP para projeto {projeto_id}")
    
    try:
        stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
        result = await db.execute(stmt)
        projeto = result.scalar_one_or_none()

        if not projeto:
            logger.warning(f"⚠️ Projeto {projeto_id} não encontrado")
            raise HTTPException(status_code=404, detail="Projeto não encontrado")

        # Análise inicial para ETP baseada nos artefatos anteriores
        try:
            analise_etp = await inicializar_analise_etp_projeto(projeto_id, db)
            logger.info(f"🔍 Análise ETP realizada para projeto {projeto_id}")
            
        except Exception as e:
            logger.error(f"❌ Erro na análise inicial ETP: {e}")
            # Fallback quando há erro
            analise_etp = {
                "status": "erro",
                "erro": "Erro na análise inicial ETP",
                "dados_etp": {}
            }

        return templates_etp.TemplateResponse("etp-solicitacao.html", {
            "request": request,
            "projeto": projeto,
            "analise_etp": analise_etp
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao carregar página ETP: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/projetos/{projeto_id}/analise_etp")
async def get_analise_etp(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint AJAX para buscar análise ETP
    """
    logger.info(f"🔍 Buscando análise ETP para projeto {projeto_id}")
    try:
        analise = await inicializar_analise_etp_projeto(projeto_id, db)
        return JSONResponse(content=analise)
    except Exception as e:
        logger.error(f"❌ Erro ao buscar análise ETP: {e}")
        return JSONResponse(
            content={
                "status": "erro",
                "erro": str(e)
            },
            status_code=500
        )


@router.get("/projetos/{projeto_id}/confere_etp")
async def confere_etp_page(
    request: Request, 
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Página para conferir os ETPs gerados (curadoria)
    """
    logger.info(f"📋 Acessando página de conferência ETP para projeto {projeto_id}")
    
    try:
        # Buscar o projeto
        stmt_projeto = select(Projeto).where(Projeto.id_projeto == projeto_id)
        result_projeto = await db.execute(stmt_projeto)
        projeto = result_projeto.scalar_one_or_none()

        if not projeto:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")

        # Buscar todos os ETPs associados ao projeto
        stmt_etp = select(ETP).where(ETP.id_projeto == projeto_id).order_by(ETP.data_created.desc())
        result_etp = await db.execute(stmt_etp)
        etp_records = result_etp.scalars().all()

        # Formatar os dados para o front-end
        formatted_data = []
        for record in etp_records:
            etp_data = {
                "id": record.id,
                "id_projeto": record.id_projeto,
                "user_created": record.user_created,
                "data_created": record.data_created.isoformat() if record.data_created else None,
                "unidade_demandante": record.unidade_demandante,
                "objeto_contratado": record.objeto_contratado,
                "sist_reg_preco": record.sist_reg_preco,
                "necessidade_contratacao": record.necessidade_contratacao,
                "alinhamento_estrategico": record.alinhamento_estrategico,
                "info_contratacao": record.info_contratacao,
                "previsto_pca": record.previsto_pca,
                "item": record.item,
                "req_contratacao": record.req_contratacao,
                "lev_mercado": record.lev_mercado,
                "solucao": record.solucao,
                "quantidade_estimada": record.quantidade_estimada,
                "just_nao_parc": record.just_nao_parc,
                "valor_total": record.valor_total,
                "demonst_resultados": record.demonst_resultados,
                "serv_continuo": record.serv_continuo,
                "justif_serv_continuo": record.justif_serv_continuo,
                "providencias": record.providencias,
                "impac_ambientais": record.impac_ambientais,
                "alinhamento_pls": record.alinhamento_pls,
                "posic_conclusivo": record.posic_conclusivo,
                "justif_posic_conclusivo": record.justif_posic_conclusivo,
                "equipe_de_planejamento": record.equipe_de_planejamento,
                "status": record.status
            }
            formatted_data.append(etp_data)

        return templates_etp.TemplateResponse("etp-curadoria.html", {
            "request": request,
            "projeto": projeto,
            "etp_data_json": json.dumps(formatted_data, ensure_ascii=False)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao carregar página de conferência ETP: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/projetos/{projeto_id}/visualizacao_etp")
async def visualizacao_etp_page(
    request: Request, 
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Página para visualizar o ETP final (resultado)
    """
    logger.info(f"👁️ Acessando visualização ETP para projeto {projeto_id}")
    
    try:
        stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
        result = await db.execute(stmt)
        projeto = result.scalar_one_or_none()

        if not projeto:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        return templates_etp.TemplateResponse("etp-resultado.html", {
            "request": request,
            "projeto": projeto
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao carregar visualização ETP: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/projetos/{projeto_id}/etp", response_model=List[ETPRead])
async def get_etp_by_project(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    API para buscar ETPs existentes de um projeto
    """
    logger.info(f"📋 Buscando ETPs do projeto {projeto_id}")
    try:
        stmt = select(ETP).where(ETP.id_projeto == projeto_id)
        result = await db.execute(stmt)
        etps = result.scalars().all()
        
        etps_response = []
        for etp in etps:
            etp_read = ETPRead(
                id=etp.id,
                id_projeto=etp.id_projeto,
                user_created=etp.user_created,
                data_created=etp.data_created,
                unidade_demandante=etp.unidade_demandante,
                objeto_contratado=etp.objeto_contratado,
                sist_reg_preco=etp.sist_reg_preco,
                necessidade_contratacao=etp.necessidade_contratacao,
                alinhamento_estrategico=etp.alinhamento_estrategico,
                info_contratacao=etp.info_contratacao,
                previsto_pca=etp.previsto_pca,
                item=etp.item,
                req_contratacao=etp.req_contratacao,
                lev_mercado=etp.lev_mercado,
                solucao=etp.solucao,
                quantidade_estimada=etp.quantidade_estimada,
                just_nao_parc=etp.just_nao_parc,
                valor_total=etp.valor_total,
                demonst_resultados=etp.demonst_resultados,
                serv_continuo=etp.serv_continuo,
                justif_serv_continuo=etp.justif_serv_continuo,
                providencias=etp.providencias,
                impac_ambientais=etp.impac_ambientais,
                alinhamento_pls=etp.alinhamento_pls,
                posic_conclusivo=etp.posic_conclusivo,
                justif_posic_conclusivo=etp.justif_posic_conclusivo,
                equipe_de_planejamento=etp.equipe_de_planejamento,
                status=etp.status
            )
            etps_response.append(etp_read)
        
        logger.info(f"✅ Encontrados {len(etps_response)} ETPs para projeto {projeto_id}")
        return etps_response
        
    except Exception as e:
        logger.error(f"❌ Erro ao buscar ETPs: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar ETPs: {str(e)}")


@router.patch("/projetos/{projeto_id}/etp/{etp_id}")
async def update_etp(
    projeto_id: int,
    etp_id: int,
    etp_update: ETPUpdateRoute,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    API para atualizar um ETP específico
    """
    logger.info(f"✏️ Atualizando ETP {etp_id} do projeto {projeto_id}")
    try:
        # Buscar o ETP
        stmt = select(ETP).where(ETP.id == etp_id, ETP.id_projeto == projeto_id)
        result = await db.execute(stmt)
        etp = result.scalar_one_or_none()
        
        if not etp:
            raise HTTPException(status_code=404, detail="ETP não encontrado")
        
        # Atualizar apenas os campos fornecidos
        update_data = etp_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if hasattr(etp, field) and value is not None:
                setattr(etp, field, value)
        
        await db.commit()
        await db.refresh(etp)
        
        logger.info(f"✅ ETP {etp_id} atualizado com sucesso")
        
        # Retornar dados atualizados
        return {
            "id": etp.id,
            "id_projeto": etp.id_projeto,
            "user_created": etp.user_created,
            "data_created": etp.data_created.isoformat() if etp.data_created else None,
            "unidade_demandante": etp.unidade_demandante,
            "objeto_contratado": etp.objeto_contratado,
            "message": "ETP atualizado com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao atualizar ETP: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar ETP: {str(e)}")


@router.delete("/projetos/{projeto_id}/etp/{etp_id}")
async def delete_etp_specific(
    projeto_id: int,
    etp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    API para deletar um ETP específico
    """
    logger.info(f"🗑️ Deletando ETP {etp_id} do projeto {projeto_id}")
    try:
        stmt = select(ETP).where(ETP.id == etp_id, ETP.id_projeto == projeto_id)
        result = await db.execute(stmt)
        etp = result.scalar_one_or_none()
        
        if not etp:
            raise HTTPException(status_code=404, detail="ETP não encontrado")
        
        # Remove o ETP
        await db.delete(etp)
        await db.commit()
        
        logger.info(f"✅ ETP {etp_id} deletado com sucesso")
        return {"message": "ETP deletado com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar ETP: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar ETP: {str(e)}")


@router.delete("/projetos/{projeto_id}/etp")
async def delete_all_etp_from_project(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    API para deletar todos os ETPs de um projeto
    """
    logger.info(f"🗑️ Deletando todos os ETPs do projeto {projeto_id}")
    try:
        # Remove todos os ETPs do projeto
        stmt = delete(ETP).where(ETP.id_projeto == projeto_id)
        result = await db.execute(stmt)
        
        # Atualiza flag no projeto
        stmt_projeto = select(Projeto).where(Projeto.id_projeto == projeto_id)
        result_projeto = await db.execute(stmt_projeto)
        projeto = result_projeto.scalar_one_or_none()
        
        if projeto:
            projeto.exist_etp = False  # Atualiza a flag exist_etp
            
        await db.commit()
        
        deleted_count = result.rowcount
        logger.info(f"✅ {deleted_count} ETPs deletados do projeto {projeto_id}")
        
        return {
            "message": f"Todos os ETPs do projeto deletados com sucesso",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar ETPs do projeto: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar ETPs: {str(e)}")