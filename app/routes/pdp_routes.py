from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_remote_user, RemoteUser
from app.services.pdp_services import create_pdp_service, inicializar_analise_projeto
from app.schemas.pdp_schemas import PDPCreate, PDPRead
from app.models.projects_models import Projeto
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse

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
async def criar_pdp_page(
    request: Request,
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Carrega a página de criação de PDP, faz análise inicial assíncrona e
    salva as soluções identificadas.
    """
    stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # Faz a análise inicial assíncrona
    try:
        analise_inicial = await inicializar_analise_projeto(projeto_id, db)

        # Salva as soluções e a análise de riscos no banco de dados
        if analise_inicial.get("status") == "sucesso":
            # Crie um PDP (se necessário) ou recupere um existente
            # Para este exemplo, vamos assumir que um PDP já foi criado ou está sendo criado.
            # Você precisará ajustar essa lógica conforme o fluxo da sua aplicação.
            
            # Exemplo: Criando um novo PDP para associar as soluções
            # Em um cenário real, você provavelmente recuperaria o PDP relevante.
            novo_pdp = PDP(id_projeto=projeto_id, orgao_contratante="Definir", processo_pregao="Definir", empresa_adjudicada="Definir", cnpj_empresa="Definir", objeto="Definir", data_vigencia_inicio="2025-01-01", tipo_fonte="Definir", tabela_itens=[], user_created="sistema")
            db.add(novo_pdp)
            await db.flush() # Para obter o ID do novo PDP

            solucoes_ia = analise_inicial.get("analise_inicial", {}).get("tipos_solucao", [])
            
            for solucao_data in solucoes_ia:
                nova_solucao = SolucaoIdentificada(
                    id_pdp=novo_pdp.id,
                    nome=solucao_data.get("nome"),
                    descricao=solucao_data.get("descricao"),
                    palavras_chave=solucao_data.get("palavras_chave"),
                    complexidade_estimada=solucao_data.get("complexidade_estimada"),
                    tipo=solucao_data.get("tipo"),
                    analise_riscos=solucao_data.get("analise_riscos") # Incluindo a análise de riscos
                )
                db.add(nova_solucao)
            
            await db.commit()

    except Exception as e:
        print(f"Erro na análise inicial ou ao salvar soluções: {e}")
        # Lógica de fallback, se necessário
        analise_inicial = {
            "status": "erro",
            "analise_inicial": {
                "erro": "Erro na análise inicial",
                "sugestoes_palavras_chave": []
            }
        }

    return templates_pdp.TemplateResponse("pdp-solicitacao.html", {
        "request": request,
        "projeto": projeto,
        "analise_inicial": analise_inicial
    })


@router.get("/projetos/{projeto_id}/analise_inicial")
async def get_analise_inicial(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Endpoint para buscar apenas a análise inicial (para chamadas AJAX se necessário)
    """
    try:
        analise = await inicializar_analise_projeto(projeto_id, db)
        return JSONResponse(content=analise)
    except Exception as e:
        return JSONResponse(
            content={
                "status": "erro",
                "erro": str(e)
            },
            status_code=500
        )


@router.get("/projetos/{projeto_id}/confere_pdp")
async def confere_pdp_page(
    request: Request, 
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: RemoteUser = Depends(get_current_remote_user)
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
async def visualizacao_pdp_page(
    request: Request, 
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: RemoteUser = Depends(get_current_remote_user)
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