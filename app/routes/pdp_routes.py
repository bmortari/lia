from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List, Dict, Any
from datetime import datetime, date

from app.database import get_db
from app.dependencies import get_current_remote_user, RemoteUser
from app.services.pdp_services import create_pdp_service, inicializar_analise_projeto, update_pdp_for_project
from app.schemas.pdp_schemas import PDPCreate, PDPRead, PDPUpdate
from app.models.projects_models import Projeto
from app.models.pdp_models import PDP
from app.models.solucao_models import SolucaoIdentificada
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse

import json
from app.models.pdp_models import PDP

router = APIRouter(tags=["PDP"])

templates_pdp = Jinja2Templates(directory="frontend/templates/pdp")


@router.post("/projetos/{project_id}/create_pdp", response_model=List[PDPRead], status_code=201)
async def create_pdp(
    project_id: int,
    pdp_in: PDPCreate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Cria PDP baseado nos dados da IA e pesquisa de mercado.
    Agora o service é responsável por criar o PDP com dados reais.
    """
    try:
        pdp_list = await create_pdp_service(pdp_in, db, current_user, project_id)
        return pdp_list
    
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
    CORRIGIDO: Agora salva as soluções identificadas corretamente usando id_projeto
    """
    stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # Faz a análise inicial assíncrona
    try:
        analise_inicial = await inicializar_analise_projeto(projeto_id, db)

        # Salva as soluções identificadas usando id_projeto
        if analise_inicial.get("status") == "sucesso":
            
            # Remove soluções existentes para este projeto
            print(f"DEBUG: Removendo soluções existentes para o projeto ID: {projeto_id}")
            stmt_delete = delete(SolucaoIdentificada).where(SolucaoIdentificada.id_projeto == projeto_id)
            await db.execute(stmt_delete)

            # Adiciona as novas soluções
            solucoes_ia = analise_inicial.get("analise_inicial", {}).get("tipos_solucao", [])
            
            print(f"DEBUG: Tentando salvar {len(solucoes_ia)} soluções para projeto ID: {projeto_id}")
            
            for i, solucao_data in enumerate(solucoes_ia):
                try:
                    # Verificações de segurança para evitar valores None
                    nome = solucao_data.get("nome") or f"Solução {i+1}"
                    descricao = solucao_data.get("descricao") or "Sem descrição"
                    palavras_chave = solucao_data.get("palavras_chave") or []
                    complexidade = solucao_data.get("complexidade_estimada") or "Média"
                    tipo = solucao_data.get("tipo") or "complementar"
                    analise_riscos = solucao_data.get("analise_riscos") or []
                    
                    print(f"DEBUG: Criando solução {i+1}: {nome}")
                    
                    # CORRIGIDO: Usando id_projeto em vez de id_pdp
                    nova_solucao = SolucaoIdentificada(
                        id_projeto=projeto_id,
                        nome=nome,
                        descricao=descricao,
                        palavras_chave=palavras_chave,
                        complexidade_estimada=complexidade,
                        tipo=tipo,
                        analise_riscos=analise_riscos,
                        usuario_criacao="sistema"
                    )
                    db.add(nova_solucao)
                    print(f"DEBUG: Solução {i+1} adicionada com sucesso")
                    
                except Exception as e:
                    print(f"DEBUG: Erro ao criar solução {i+1}: {e}")
                    continue
            
            await db.commit()
            print(f"DEBUG: {len(solucoes_ia)} soluções salvas com sucesso para projeto {projeto_id}")

    except Exception as e:
        await db.rollback()
        print(f"Erro na análise inicial ou ao salvar soluções: {e}")
        # Lógica de fallback
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
    # 1. Buscar o projeto (como você já faz)
    stmt_projeto = select(Projeto).where(Projeto.id_projeto == projeto_id)
    result_projeto = await db.execute(stmt_projeto)
    projeto = result_projeto.scalar_one_or_none()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # 2. <<< NOVO: Buscar todos os PDPs associados ao projeto >>>
    stmt_pdp = select(PDP).where(PDP.id_projeto == projeto_id).order_by(PDP.data_created.desc())
    result_pdp = await db.execute(stmt_pdp)
    pdp_records = result_pdp.scalars().all()

    # 3. <<< NOVO: Formatar os dados para o front-end >>>
    formatted_data = []
    for record in pdp_records:
        contract_data = {
            "orgao_contratante": record.orgao_contratante,
            "processo_pregao": record.processo_pregao,
            "empresa_adjudicada": record.empresa_adjudicada,
            "cnpj_empresa": record.cnpj_empresa,
            "objeto": record.objeto,
            # Garante que as datas sejam strings no formato YYYY-MM-DD
            "data_vigencia_inicio": record.data_vigencia_inicio.isoformat() if record.data_vigencia_inicio else None,
            "data_vigencia_fim": record.data_vigencia_fim.isoformat() if record.data_vigencia_fim else None,
            "tipo_fonte": record.tipo_fonte,
            # Mapeia a estrutura de 'tabela_itens' para a que o JS espera
            "tabela_itens": [
                {
                    "item": item.get("item"),
                    "descricao_item": item.get("descricao"),  # DE: "descricao" -> PARA: "descricao_item"
                    "marca_modelo": item.get("marca_referencia", "Não especificado"), # DE: "marca_referencia" -> PARA: "marca_modelo"
                    "unidade_medida": item.get("unidade"), # DE: "unidade" -> PARA: "unidade_medida"
                    "quantidade": item.get("quantidade"),
                    "valor_unitario": item.get("valor_unitario")
                } for item in (record.tabela_itens or [])
            ]
        }
        formatted_data.append(contract_data)

    # 4. <<< MODIFICADO: Injetar os dados formatados como uma string JSON no template >>>
    return templates_pdp.TemplateResponse("pdp-curadoria.html", {
        "request": request,
        "projeto": projeto,
        # Converte a lista de dicionários para uma string JSON
        "pdp_data_json": json.dumps(formatted_data) 
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


@router.get("/projetos/{projeto_id}/pdp", response_model=List[PDPRead])
async def get_pdp_by_project(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Endpoint para buscar PDPs existentes de um projeto
    """
    try:
        stmt = select(PDP).where(PDP.id_projeto == projeto_id)
        result = await db.execute(stmt)
        pdps = result.scalars().all()
        
        pdps_response = []
        for pdp in pdps:
            # CORREÇÃO: usar data_created em vez de created_at
            pdp_read = PDPRead(
                id=pdp.id,  # Voltando para id padrão
                id_projeto=pdp.id_projeto,
                orgao_contratante=pdp.orgao_contratante,
                processo_pregao=pdp.processo_pregao,
                empresa_adjudicada=pdp.empresa_adjudicada,
                cnpj_empresa=pdp.cnpj_empresa,
                objeto=pdp.objeto,
                data_vigencia_inicio=pdp.data_vigencia_inicio,
                tipo_fonte=pdp.tipo_fonte,
                tabela_itens=pdp.tabela_itens,
                user_created=pdp.user_created,
                data_created=pdp.data_created  # Campo correto: data_created
            )
            pdps_response.append(pdp_read)
        
        return pdps_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar PDPs: {str(e)}")


@router.patch("/projetos/{projeto_id}/pdp/{pdp_id}", response_model=PDPRead, status_code=200)
async def patch_pdp(
    projeto_id: int,
    pdp_id: int,
    pdp_upd: PDPUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Endpoint para atualizar um PDP específico
    """
    try:
        pdp_atualizado = await update_pdp_for_project(
            project_id=projeto_id,
            pdp_id=pdp_id,
            pdp_upd=pdp_upd,
            db=db,
            current_user=current_user
        )
        
        return pdp_atualizado
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/projetos/{projeto_id}/pdp/{pdp_id}")
async def delete_pdp(
    projeto_id: int,
    pdp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Endpoint para deletar um PDP específico
    """
    try:
        stmt = select(PDP).where(PDP.id == pdp_id, PDP.id_projeto == projeto_id)
        result = await db.execute(stmt)
        pdp = result.scalar_one_or_none()
        
        if not pdp:
            raise HTTPException(status_code=404, detail="PDP não encontrado")
        
        # CORRIGIDO: Remove soluções relacionadas ao projeto (não ao PDP)
        # Como SolucaoIdentificada está relacionada diretamente ao projeto,
        # pode manter as soluções mesmo quando um PDP específico é deletado
        # stmt_delete_solucoes = delete(SolucaoIdentificada).where(SolucaoIdentificada.id_projeto == projeto_id)
        # await db.execute(stmt_delete_solucoes)
        
        # Remove o PDP
        await db.delete(pdp)
        await db.commit()
        
        return {"message": "PDP deletado com sucesso"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar PDP: {str(e)}")


# NOVO: Endpoint para buscar soluções identificadas
@router.get("/projetos/{projeto_id}/solucoes")
async def get_solucoes_by_project(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: RemoteUser = Depends(get_current_remote_user)
):
    """
    Endpoint para buscar soluções identificadas de um projeto
    """
    try:
        stmt = select(SolucaoIdentificada).where(SolucaoIdentificada.id_projeto == projeto_id)
        result = await db.execute(stmt)
        solucoes = result.scalars().all()
        
        solucoes_response = []
        for solucao in solucoes:
            solucao_dict = {
                "id_solucao": solucao.id_solucao,
                "id_projeto": solucao.id_projeto,
                "nome": solucao.nome,
                "descricao": solucao.descricao,
                "palavras_chave": solucao.palavras_chave,
                "complexidade_estimada": solucao.complexidade_estimada,
                "tipo": solucao.tipo,
                "analise_riscos": solucao.analise_riscos,
                "usuario_criacao": solucao.usuario_criacao,
                "data_criacao": solucao.data_criacao.isoformat() if solucao.data_criacao else None
            }
            solucoes_response.append(solucao_dict)
        
        return solucoes_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar soluções: {str(e)}")
