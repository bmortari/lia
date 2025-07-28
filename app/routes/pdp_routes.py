from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_remote_user, RemoteUser
from app.services.pdp_services import create_pdp_service
from app.schemas.pdp_schemas import PDPCreate, PDPRead
from app.models.projects_models import Projeto
from fastapi.templating import Jinja2Templates

router = APIRouter(
                   tags=["PDP"]
                   )

templates_pdp = Jinja2Templates(directory="frontend/templates/pdp")


@router.post("/projetos/{project_id}/create_pdp", response_model=List[PDPRead], status_code=201)
async def create_pdp(
    project_id: int,
    pdp_in: PDPCreate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    try:
        pdp = await create_pdp_service(pdp_in, db, current_user, project_id)
        return pdp
    
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar PDP: {str(e)}")
    
    
@router.get("/projetos/{projeto_id}/criar_pdp")
async def dfd(request: Request, 
        projeto_id: int,
        db: AsyncSession = Depends(get_db),
    #    current_user: RemoteUser = Depends(get_current_remote_user)
    ):
    stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    return templates_pdp.TemplateResponse("pdp-solicitacao.html", {
        "request": request,
        "projeto": projeto
    })
    

@router.get("/projetos/{projeto_id}/confere_pdp")
async def edit_dfd(request: Request, 
        projeto_id: int,
        db: AsyncSession = Depends(get_db),
    #    current_user: RemoteUser = Depends(get_current_remote_user)
    ):
    stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    return templates_pdp.TemplateResponse("pdp-curadoria.html", {
        "request": request,
        "projeto": projeto
    })
    
    
@router.get("/projetos/{projeto_id}/visualizacao_pdp")
async def edit_dfd(request: Request, 
        projeto_id: int,
        db: AsyncSession = Depends(get_db),
    #    current_user: RemoteUser = Depends(get_current_remote_user)
    ):
    stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    return templates_pdp.TemplateResponse("pdp-resultado.html", {
        "request": request,
        "projeto": projeto
    })
    
    
# @router.post("/projetos/{project_id}/save_dfd", response_model=PDPRead, status_code=201)
# async def save_dfd(
#     project_id: int,
#     dfd_in: PDPCreate,
#     db: AsyncSession = Depends(get_db),
#     current_user: RemoteUser = Depends(get_current_remote_user)
# ):
#     try:
#         dfd = await create_dfd_for_project(
#             project_id=project_id,
#             dfd_in=dfd_in,
#             username=current_user.username,
#             db=db
#         )
#         return dfd

#     except HTTPException:
#         # deixa propagar 409 ou 400  
#         raise

#     except Exception as e:
#         # qualquer outro erro inesperado
#         raise HTTPException(status_code=500, detail=str(e))