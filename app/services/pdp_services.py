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

async def consulta_ia_simples(projeto_id: int, db: AsyncSession) -> Dict[str, any]:
    """
    Faz uma consulta simples à IA do Gemini para análise inicial do projeto,
    incluindo análise de riscos.
    """
    try:
        contexto_projeto = await buscar_dfd_por_id(projeto_id, db)
        if not contexto_projeto:
            return {"erro": "Projeto não encontrado"}

        prompt_simples = f"""
        Analise o seguinte projeto de contratação pública e forneça uma análise detalhada para pesquisa de preços:

        DADOS DO PROJETO:
        - Objeto: {contexto_projeto.get('objeto_contratacao', 'Não informado')}
        - Justificativa: {contexto_projeto.get('justificativa_necessidade', 'Não informada')}

        Forneça uma análise em formato JSON com os seguintes campos:
        {{
            "resumo_objeto": "Resumo claro do objeto em até 150 palavras",
            "categoria_estimada": "Categoria principal (ex: Serviços, Bens, Obras, Software, Consultoria)",
            "complexidade": "Baixa, Média ou Alta",
            "sugestoes_palavras_chave": ["palavra1", "palavra2", "palavra3"],
            "observacoes": "Observações importantes sobre o projeto",
            "tipos_solucao": [
                {{
                    "nome": "Nome da solução",
                    "descricao": "Descrição da abordagem",
                    "palavras_chave": ["palavra1", "palavra2"],
                    "complexidade_estimada": "Baixa/Média/Alta",
                    "tipo": "principal/complementar/economica",
                    "analise_riscos": [
                        {{
                            "risco": "Descrição do risco",
                            "probabilidade": "Baixa/Média/Alta",
                            "impacto": "Baixo/Médio/Alto",
                            "mitigacao": "Ações sugeridas para mitigar o risco"
                        }}
                    ]
                }}
            ],
            "alertas": ["Alerta 1 se houver", "Alerta 2 se houver"],
            "recomendacoes_busca": "Dicas para a pesquisa de preços"
        }}

        IMPORTANTE: 
        - Crie pelo menos 2 tipos de solução diferentes.
        - Para cada solução, identifique pelo menos 2 riscos potenciais.
        - Seja específico nas palavras-chave.
        - Inclua alertas sobre pontos de atenção na contratação.
        """

        client = get_genai_client()
        model = "gemini-2.0-flash"
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="application/json"
        )
        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt_simples)])]
        
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config
        )
        
        resposta_json = json.loads(response.text)
        
        if isinstance(resposta_json, list):
            resposta_json = resposta_json[0] if resposta_json and isinstance(resposta_json[0], dict) else {}

        resposta_json = validar_e_enriquecer_resposta(resposta_json, contexto_projeto)
        
        return resposta_json
        
    except Exception as e:
        print(f"Erro na consulta à IA: {e}")
        return criar_resposta_fallback(contexto_projeto)


def validar_e_enriquecer_resposta(resposta_ia: Dict, contexto_projeto: Dict) -> Dict:
    """
    Valida e enriquece a resposta da IA com dados consistentes, incluindo a análise de riscos.
    """
    # ... (lógica de validação existente)

    for i, solucao in enumerate(resposta_ia["tipos_solucao"]):
        if not isinstance(solucao, dict):
            continue
        
        solucao.setdefault("nome", f"Solução {i+1}")
        solucao.setdefault("descricao", "Descrição não disponível")
        solucao.setdefault("palavras_chave", [])
        solucao.setdefault("complexidade_estimada", "Média")
        solucao.setdefault("tipo", "complementar")
        solucao.setdefault("analise_riscos", []) # Garantir que a lista de riscos exista

        if not isinstance(solucao.get("analise_riscos"), list):
            solucao["analise_riscos"] = []

        # Valida cada risco dentro da solução
        for risco in solucao["analise_riscos"]:
            if not isinstance(risco, dict):
                continue
            risco.setdefault("risco", "Risco não identificado")
            risco.setdefault("probabilidade", "Média")
            risco.setdefault("impacto", "Médio")
            risco.setdefault("mitigacao", "Ações de mitigação padrão")

    return resposta_ia

def criar_resposta_fallback(contexto_projeto: Dict) -> Dict:
    """
    Cria uma resposta padrão quando a IA falha, incluindo análise de riscos.
    """
    # ... (lógica de fallback existente)

    riscos_fallback = [
        {
            "risco": "Especificações técnicas inadequadas",
            "probabilidade": "Média",
            "impacto": "Alto",
            "mitigacao": "Revisão detalhada do termo de referência por equipe técnica."
        },
        {
            "risco": "Variação de preços de mercado",
            "probabilidade": "Alta",
            "impacto": "Médio",
            "mitigacao": "Realizar pesquisa de preços ampla e utilizar índices de reajuste em contrato."
        }
    ]

    solucoes = criar_solucoes_basicas({"categoria_estimada": categoria, "complexidade": "Média"}, contexto_projeto)
    for solucao in solucoes:
        solucao["analise_riscos"] = riscos_fallback

    return {
        "resumo_objeto": f"Contratação de {categoria.lower()} conforme especificado no projeto",
        "categoria_estimada": categoria,
        "complexidade": "Média",
        "sugestoes_palavras_chave": extrair_palavras_do_contexto(contexto_projeto),
        "observacoes": "Análise automática indisponível. Dados gerados com base no contexto do projeto.",
        "tipos_solucao": solucoes,
        "alertas": ["Recomenda-se revisar especificações técnicas", "Verificar requisitos de qualificação"],
        "recomendacoes_busca": "Use palavras-chave específicas e considere diferentes fornecedores.",
        "status_ia": "fallback"
    }


async def inicializar_analise_projeto(projeto_id: int, db: AsyncSession) -> Dict[str, str]:
    """
    Função principal para inicializar a análise do projeto na página
    """
    try:
        # Busca dados básicos do projeto
        contexto_projeto = await buscar_dfd_por_id(projeto_id, db)
        
        if not contexto_projeto:
            raise ValueError("Projeto não encontrado")
        
        # Faz análise detalhada com IA
        analise_ia = await consulta_ia_simples(projeto_id, db)
        
        # Combina dados do projeto com análise da IA
        resultado = {
            "projeto": {
                "id": projeto_id,
                "objeto": contexto_projeto.get('objeto_contratacao'),
                "unidade_demandante": contexto_projeto.get('unidade_demandante'),
                "data_criacao": contexto_projeto.get('data_criacao')
            },
            "analise_inicial": analise_ia,
            "status": "sucesso",
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"✅ Análise inicializada com sucesso para projeto {projeto_id}")
        return resultado
        
    except Exception as e:
        print(f"Erro na inicialização da análise para projeto {projeto_id}: {e}")
        return {
            "projeto": {"id": projeto_id},
            "analise_inicial": criar_resposta_fallback({}),
            "status": "erro_com_fallback",
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }