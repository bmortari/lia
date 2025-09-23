from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from app.database import get_db
from app.dependencies import RemoteUser, get_current_remote_user
from app.models.projects_models import Projeto
from app.models.tr_models import TR
from app.schemas.tr_schemas import TRCreate, TRRead, TRUpdate
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.tr_services import create_tr_service, delete_tr_service, update_tr_for_project

router = APIRouter(tags=["TR"])

templates_tr = Jinja2Templates(directory="frontend/templates/tr")

@router.post("/projetos/{project_id}/create_tr", response_model=TRRead, status_code=201)
async def create_tr(
    project_id: int,
    tr_in: TRCreate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Cria um JSON do TR que retorna os dados necessários para construir o documento final
    """
    try:
        tr = await create_tr_service(tr_in, db, current_user, project_id)
        return tr
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}")


@router.get("/projetos/{projeto_id}/criar_tr")
async def criar_tr(
    request: Request,
    projeto_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna o template do tr-solicitacao.html
    """
    stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    return templates_tr.TemplateResponse("tr-solicitacao.html", {
        "request": request,
        "projeto": projeto
    })


@router.delete("/projetos/{project_id}/tr")
async def delete_tr(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Deleta o TR do projeto
    """
    try:
        await delete_tr_service(project_id, db, current_user)
        return {"message": "TR deletado com sucesso"}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar TR: {str(e)}")


@router.patch("/projetos/{project_id}/tr", response_model=TRRead, status_code=200)
async def patch_tr(
    project_id: int,
    tr_upd: TRUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Atualiza o TR do projeto
    """
    try:
        tr = await update_tr_for_project(project_id, tr_upd, db, current_user)
        return TRRead.model_validate(tr)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projetos/{project_id}/confere_tr")
async def conferir_tr(
    request: Request,
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna o template da tr-curadoria.html com os dados do TR
    """
    # Busca o projeto
    stmt = select(Projeto).where(Projeto.id_projeto == project_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # Busca o TR
    stmt_tr = (
        select(TR)
        .options(selectinload(TR.projeto))
        .options(selectinload(TR.itens))
        .where(TR.id_projeto == project_id))
    
    result_tr = await db.execute(stmt_tr)
    tr = result_tr.scalar_one_or_none()

    if not tr:
        raise HTTPException(status_code=404, detail="TR não encontrado")

    return templates_tr.TemplateResponse("tr-curadoria.html", {
        "request": request,
        "projeto": projeto,
        "tr": tr
    })


@router.get("/projetos/{project_id}/tr", response_model=TRRead)
async def get_tr(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Retorna o TR do projeto
    """
    try:
        # Busca o projeto para verificar existência e permissão
        stmt_project = select(Projeto).where(Projeto.id_projeto == project_id)
        result_project = await db.execute(stmt_project)
        projeto = result_project.scalar_one_or_none()

        if not projeto:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")

        # Busca o TR do projeto (assume um único ou o mais recente)
        stmt_tr = (
            select(TR)
            .options(selectinload(TR.projeto))
            .options(selectinload(TR.itens))
            .where(TR.id_projeto == project_id)
            .limit(1)
        )
        
        result_tr = await db.execute(stmt_tr)
        tr = result_tr.scalar_one_or_none()

        if not tr:
            raise HTTPException(status_code=404, detail="Nenhum TR encontrado para este projeto")

        return TRRead.model_validate(tr)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={str(e)})


@router.get("/projetos/{project_id}/visualizacao_tr")
async def tr_resultado(
    request: Request,
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna o template da tr-resultado.html com os dados do TR
    """
    # Busca o projeto
    stmt = select(Projeto).where(Projeto.id_projeto == project_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # Busca o TR
    stmt_tr = (
        select(TR)
        .options(selectinload(TR.projeto))
        .options(selectinload(TR.itens))
        .where(TR.id_projeto == project_id))
    
    result_tr = await db.execute(stmt_tr)
    tr = result_tr.scalar_one_or_none()

    if not tr:
        raise HTTPException(status_code=404, detail="TR não encontrado")

    return templates_tr.TemplateResponse("tr-resultado.html", {
        "request": request,
        "projeto": projeto,
        "tr": tr
    })