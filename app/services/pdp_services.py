from app.services.pdp_search_services import PNCPSearcher
from app.services.prompts.pdp_prompts import prompt_sistema
from app.schemas.pdp_schemas import PpModel, PDPCreate
from app.client import get_genai_client
from app.dependencies import RemoteUser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, update, delete
from typing import Optional, Dict
from google.genai import types
from google.genai.types import Schema
from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional
from app.models.projects_models import Projeto

import json 
import os




async def create_pdp_service(pdp_in: PDPCreate, db: AsyncSession, current_user: RemoteUser, project_id: int):
    # Verifica se o projeto existe
    result = await db.execute(
        select(Projeto).where(Projeto.id_projeto == project_id)
    )
    projeto = result.scalar_one_or_none()
    if not projeto:
        raise ValueError("Projeto não encontrado.")
    
    
    searcher = PNCPSearcher()
    
    searcher.test_url_construction(
        palavras="limpeza urbana",
        tipos_documento=['ata', 'contrato'],
        ufs=['SP', 'RJ'],
        esferas=['municipal', 'estadual'],
        #modalidades=['pregao_eletronico', 'concorrencia_eletronica']
    )
    
    # Exemplo com filtros
    resultados = searcher.pesquisar_mercado(
        palavras_busca=pdp_in.palavras_chave[0],
        texto_similaridade=pdp_in.descricao,
        tipos_documento=['ata', 'contrato'],
        max_documentos=10000,
        max_similares=8,
        ufs=pdp_in.ufs, 
        esferas=pdp_in.esferas,  # Federal e Municipal
        # modalidades=pdp_in.modalidades  # Pregão e Concorrência Eletrônica
    )

    print(f"Encontrados {len(resultados)} documentos similares")


    # Monta o prompt para IA
    prompt_usuario = pdp_in.descricao
    contexto = await buscar_dfd_por_id(project_id, db)

    prompt_final_completo = f"""
    {prompt_sistema}

    ---
    Contexto do Banco de Dados (JSON):
    {json.dumps(contexto, indent=2, ensure_ascii=False)}

    ---
    Prompt do Usuário:
    "{prompt_usuario}"
    """
    

    # Chama a IA
    resposta_ia = await consulta_ia(prompt_final_completo)
    print(resposta_ia)

    
    return resposta_ia




async def buscar_dfd_por_id(project_id: int, db: AsyncSession) -> Optional[Dict[str, str]]:
    query = text("""
        SELECT
            d.id_dfd,
            d.id_projeto,
            d.usuario_criacao,
            TO_CHAR(d.data_criacao, 'YYYY-MM-DD') AS data_criacao,
            d.unidade_demandante,
            d.previsto_pca,
            d.item_pca,
            d.objeto_contratacao,
            d.justificativa as justificativa_necessidade,
            d.quantidade as itens_quantidade,
            TO_CHAR(d.previsao_da_entrega , 'YYYY-MM-DD') AS previsao_inicio_servicos,
            d.alinhamento_estrategico,
            d.equipe_de_planejamento as informacoes_adicionais
        FROM core.dfd d
        WHERE d.id_projeto = :project_id
    """)

    try:
        result = await db.execute(query, {"project_id": project_id})
        row = result.mappings().fetchone()  # <- aqui está a correção
        return dict(row) if row else None
    except Exception as e:
        print(f"Erro ao buscar Projeto por ID: {e}")
        return None
    


async def consulta_ia(prompt_final_completo):
    
    try:
        client = get_genai_client()
        model = "gemini-2.0-flash"
        
        similares_dir = os.path.join("app", "temp", "docs", "similares")
        pdf_files = [
            f for f in os.listdir(similares_dir)
            if f.lower().endswith(".pdf")
        ]

        # Validação: mínimo 1, máximo 5
        if not pdf_files:
            raise ValueError("Não foi possível achar nenhum documento com as seleções feitas, por favor tente novamente.")
            
        pdf_files = pdf_files[:5]  # no máximo 5

        # Upload dinâmico dos arquivos
        uploaded_files = []
        for file_name in pdf_files:
            file_path = os.path.join(similares_dir, file_name)
            uploaded = client.files.upload(file=file_path)
            uploaded_files.append(uploaded)

        # Construção do `parts` com os arquivos e o prompt
        parts = []
        for uploaded in uploaded_files:
            parts.append(
                types.Part.from_uri(
                    file_uri=uploaded.uri,
                    mime_type=uploaded.mime_type
                )
            )

        # Adiciona o prompt de texto ao final
        parts.append(types.Part.from_text(text=prompt_final_completo))

        # Construção do `contents`
        contents = [
            types.Content(
                role="user",
                parts=parts,
            ),
        ]
            
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[PpModel],
        )
        
        print("--- Aguardando resposta da API Gemini... ---")
        
        response_chunks = []
        # O bloco 'for' começa aqui. Todo o conteúdo dele deve estar indentado.
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            response_chunks.append(chunk.text)
            print(chunk.text)
        # Fim da indentação do bloco 'for'.

        full_response_json = "".join(response_chunks)

        # ETAPA 4: Exibir a saída. Este código está fora do loop 'for', mas dentro do 'try'.
        print("\n--- Resposta da API Gemini (JSON Estruturado) ---")
        dados_formatados = json.loads(full_response_json)
        #result = json.dumps(dados_formatados, indent=4, ensure_ascii=False)
        #print(result)

    # Fim da indentação do bloco 'try'.
    except Exception as e:
        print(f"\nOcorreu um erro durante a execução: {e}")
    # Fim da indentação do bloco 'except'.
    
    return dados_formatados