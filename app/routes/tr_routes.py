from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from app.database import get_db
from app.dependencies import RemoteUser, get_current_remote_user
from app.models.projects_models import Projeto
from app.schemas.tr_schemas import TRCreate, TRRead
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.tr_services import create_tr_service

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
        raise HTTPException(status_code=500, detail=f"Erro ao criar DFD: {str(e)}")

@router.get("projetos/{projeto_id}/criar_tr")
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