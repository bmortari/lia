from fastapi import APIRouter, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import RemoteUser, get_current_remote_user
from app.schemas.ed_schemas import EDCreate, EDRead


router = APIRouter(tags=["ED"])

templates_edital = Jinja2Templates(directory="frontend/templates/edital")

@router.post("/projetos/{project_id}/create_edital", response_model=EDRead, status_code=201)
async def create_edital(
    project_id: int,
    edital_in: EDCreate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Cria um JSON do Edital que retorna os dados necessários para construir o documento final
    """
    try:
        edital = await create_edital_service(edital_in, db, current_user, project_id)
        return edital
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}")