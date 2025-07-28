from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.projects_models import Projeto
from app.schemas.projects_schemas import ProjetoCreate, ProjetoRead, ProjetoUpdate, TipoProjetoEnum
from app.dependencies import get_current_remote_user, RemoteUser
from app.config import acre_tz

templates = Jinja2Templates(directory="frontend/templates/projeto")

router = APIRouter(
    prefix="/projetos",
    tags=["projetos"]
)


# CREATE - Criar novo projeto
@router.post("/", response_model=ProjetoRead, status_code=201)
async def create_projeto(
    projeto: ProjetoCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    db_projeto = Projeto(
        **projeto.dict(),
        user_created=current_user.username,
        dt_created=datetime.now(acre_tz)
    )
    db.add(db_projeto)
    await db.commit()
    await db.refresh(db_projeto)
    
    # Retorna o objeto criado como JSON
    return db_projeto
    


# READ - Listar todos os projetos
@router.get("/", response_model=List[ProjetoRead])
async def list_projetos(
    skip: int = Query(0, ge=0, description="Número de registros para pular"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de registros"),
    tipo: Optional[TipoProjetoEnum] = Query(None, description="Filtrar por tipo"),
    db: AsyncSession = Depends(get_db),
#    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Lista todos os projetos com paginação e filtro opcional por tipo.
    """
    stmt = select(Projeto)
    if tipo:
        stmt = stmt.where(Projeto.tipo == tipo.value)
    stmt = stmt.offset(skip).limit(limit)

    result = await db.execute(stmt)
    projetos = result.scalars().all()
    return projetos



# READ - Buscar projeto por ID
@router.get("/{projeto_id}", response_class=HTMLResponse)
async def get_projeto(
    request: Request,
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
#    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Busca um projeto específico pelo ID e retorna uma página HTML.
    """
    stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    return templates.TemplateResponse("projeto-servicos.html", {
        "request": request,
        "projeto": projeto
    })
    
    

# UPDATE - Atualizar projeto
@router.patch("/{projeto_id}", response_model=ProjetoRead)
async def update_projeto(
    projeto_id: int,
    projeto_update: ProjetoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Atualiza um projeto existente.
    Somente o usuário criador pode atualizar.
    """
    stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    if projeto.user_created != current_user.username:
        raise HTTPException(status_code=403, detail="Você não tem permissão para atualizar este projeto")

    update_data = projeto_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(projeto, field, value)

    await db.commit()
    await db.refresh(projeto)
    return projeto



# DELETE - Deletar projeto
@router.delete("/{projeto_id}", status_code=204)
async def delete_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Deleta um projeto.
    Somente o usuário criador pode deletar.
    """
    stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    if projeto.user_created != current_user.username:
        raise HTTPException(status_code=403, detail="Você não tem permissão para deletar este projeto")

    await db.delete(projeto)
    await db.commit()
    return None
