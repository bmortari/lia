from sqlalchemy import select
from app.dependencies import RemoteUser
from app.models.projects_models import Projeto
from app.schemas.ed_schemas import EDCreate


async def create_edital_service(edital_in: EDCreate, db: AsyncSession, current_user: RemoteUser, project_id: int):
    """
    Cria um Edital a partir dos artefatos do projeto e das informações providenciadas na edital-solicitacao.html com o auxilio de IA.
    """
    try:
        result = await db.execute(
            select(Projeto).where(Projeto.id_projeto == project_id)
        )
        projeto = result.scalar_one_or_none()
        if not projeto:
            raise ValueError("Projeto não encontrado.")
        
        # Verifica se o Edital já existe
        stmt = select()