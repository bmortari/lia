from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any

from app.database import get_db
from app.dependencies import get_current_remote_user, RemoteUser
from app.services.dfd_services import fetch_dfd_pca_data, create_dfd_service, create_dfd_for_project, update_dfd_for_project, delete_dfd_for_project
from app.schemas.dfd_schemas import DFDCreate, DFDRead, DFDProjectRead, DFDCreator, DFDUpdate
from app.models.projects_models import Projeto
from fastapi.templating import Jinja2Templates



router = APIRouter(
                   tags=["DFD"]
                   )

templates_dfd = Jinja2Templates(directory="frontend/templates/dfd")


@router.get("/dfd_pca", response_model=List[Dict[str, Any]])
async def get_dfd_pca(db: AsyncSession = Depends(get_db)):
    """
    Endpoint para buscar dados de PCA com objetos de contratação distintos
    """
    try:
        return await fetch_dfd_pca_data(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados: {str(e)}")



# CREATE - Criar novo DFD
@router.post("/projetos/{project_id}/create_dfd", response_model=DFDProjectRead, status_code=201)
async def create_dfd(
    project_id: int,
    dfd_in: DFDCreate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    try:
        dfd = await create_dfd_service(dfd_in, db, current_user, project_id)
        return dfd
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar DFD: {str(e)}")
    
    
    
@router.get("/projetos/{projeto_id}/criar_dfd")
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
    
    return templates_dfd.TemplateResponse("dfd-solicitacao.html", {
        "request": request,
        "projeto": projeto
    })
    

@router.get("/projetos/{projeto_id}/confere_dfd")
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
    
    return templates_dfd.TemplateResponse("dfd-curadoria.html", {
        "request": request,
        "projeto": projeto
    })
    
    
@router.get("/projetos/{projeto_id}/visualizacao_dfd")
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
    
    return templates_dfd.TemplateResponse("dfd-resultado.html", {
        "request": request,
        "projeto": projeto
    })
    
    
@router.post("/projetos/{project_id}/save_dfd", response_model=DFDRead, status_code=201)
async def save_dfd(
    project_id: int,
    dfd_in: DFDCreator,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    try:
        dfd = await create_dfd_for_project(
            project_id=project_id,
            dfd_in=dfd_in,
            username=current_user.username,
            db=db
        )
        return dfd

    except HTTPException:
        # deixa propagar 409 ou 400  
        raise

    except Exception as e:
        # qualquer outro erro inesperado
        raise HTTPException(status_code=500, detail=str(e))



@router.patch("/projetos/{project_id}/dfd", response_model=DFDRead, status_code=200)
async def patch_dfd(
    project_id: int,
    dfd_upd: DFDUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    try:
        return await update_dfd_for_project(
            project_id=project_id,
            dfd_upd=dfd_upd,
            db=db,
            current_user=current_user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    

@router.delete("/projetos/{project_id}/dfd", status_code=204)
async def delete_dfd(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    try:
        await delete_dfd_for_project(
            project_id=project_id,
            db=db,
            current_user=current_user
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))