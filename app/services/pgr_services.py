from app.client import get_genai_client
from app.dependencies import RemoteUser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, delete
from typing import Optional, Dict, List
from google.genai import types
from datetime import datetime
from app.models.projects_models import Projeto
from app.models.pgr_models import PGR
from app.models.solucao_models import SolucaoIdentificada
from app.schemas.pgr_schemas import PGRCreate, PGRRead

import json


async def create_pgr_service(pgr_in: PGRCreate, db: AsyncSession, current_user: RemoteUser, project_id: int) -> List[PGRRead]:
    """
    Cria PGR baseado na análise de riscos das soluções identificadas
    """
    try:
        # Verifica se o projeto existe
        result = await db.execute(
            select(Projeto).where(Projeto.id_projeto == project_id)
        )
        projeto = result.scalar_one_or_none()
        if not projeto:
            raise ValueError("Projeto não encontrado.")
        
        # Busca contexto do projeto
        contexto = await buscar_dfd_por_id(project_id, db)
        if not contexto:
            raise ValueError("Dados do projeto não encontrados.")
        
        # Limpar PGRs antigos para garantir que a nova análise substitua a anterior
        print(f"Limpando PGRs antigos para o projeto ID: {project_id}")
        await db.execute(delete(PGR).where(PGR.id_projeto == project_id))
        await db.flush()

        # Busca soluções identificadas do projeto
        solucoes_todas = await buscar_solucoes_projeto(project_id, db)
        if not solucoes_todas:
            raise ValueError("Nenhuma solução identificada encontrada para este projeto.")

        # Filtra as soluções com base na seleção do usuário
        solucoes_selecionadas = solucoes_todas
        if pgr_in.solucoes_selecionadas:
            ids_selecionados = set(pgr_in.solucoes_selecionadas)
            solucoes_selecionadas = [s for s in solucoes_todas if s.id_solucao in ids_selecionados]

        if not solucoes_selecionadas:
            raise ValueError("Nenhuma das soluções selecionadas foi encontrada.")

        # Análise de riscos usando IA
        analise_riscos = await analisar_riscos_ia(pgr_in, contexto, solucoes_selecionadas)
        print("Análise de riscos da IA:", json.dumps(analise_riscos, indent=2, ensure_ascii=False))

        pgrs_criados = []
        
        # Cria PGR para cada solução com riscos identificados
        for solucao, riscos_solucao in zip(solucoes_selecionadas, analise_riscos.get("riscos_por_solucao", [])):
            try:
                novo_pgr = PGR(
                    id_projeto=project_id,
                    id_solucao=solucao.id_solucao,
                    usuario_criacao=current_user.username if hasattr(current_user, 'username') else 'sistema',
                    objeto=contexto.get('objeto_contratacao', 'Objeto do projeto'),
                    risco=riscos_solucao
                )
                
                db.add(novo_pgr)
                await db.flush()
                pgrs_criados.append(novo_pgr)
                    
            except Exception as e:
                print(f"Erro ao processar PGR para solução {solucao.id_solucao}: {e}")
                continue
        
        # Atualizar o status do projeto
        if pgrs_criados:
            print(f"Atualizando o status 'exist_pgr' para True no projeto ID: {project_id}")
            projeto.exist_pgr = True
        else:
            print(f"Nenhum PGR foi criado. Atualizando 'exist_pgr' para False no projeto ID: {project_id}")
            projeto.exist_pgr = False

        await db.commit()
        
        pgrs_response = []
        for pgr in pgrs_criados:
            await db.refresh(pgr)
            pgr_read = PGRRead.from_orm(pgr)
            pgrs_response.append(pgr_read)
        
        return pgrs_response
        
    except Exception as e:
        await db.rollback()
        print(f"Erro geral na criação do PGR: {e}")
        raise e


async def buscar_solucoes_projeto(project_id: int, db: AsyncSession) -> List[SolucaoIdentificada]:
    """
    Busca todas as soluções identificadas de um projeto
    """
    try:
        stmt = select(SolucaoIdentificada).where(SolucaoIdentificada.id_projeto == project_id)
        result = await db.execute(stmt)
        solucoes = result.scalars().all()
        return list(solucoes)
    except Exception as e:
        print(f"Erro ao buscar soluções do projeto: {e}")
        return []


async def buscar_dfd_por_id(project_id: int, db: AsyncSession) -> Optional[Dict[str, str]]:
    """
    Busca dados do DFD por ID do projeto
    """
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
        row = result.mappings().fetchone()
        return dict(row) if row else None
    except Exception as e:
        print(f"Erro ao buscar Projeto por ID: {e}")
        return None


async def analisar_riscos_ia(pgr_in: PGRCreate, contexto: Dict, solucoes: List[SolucaoIdentificada]) -> Dict:
    """
    Analisa riscos das soluções usando IA
    """
    try:
        client = get_genai_client()
        model = "gemini-2.5-flash"
        
        # Preparar dados das soluções para análise
        solucoes_dados = []
        for solucao in solucoes:
            solucao_dict = {
                "id": solucao.id_solucao,
                "nome": solucao.nome,
                "descricao": solucao.descricao,
                "palavras_chave": solucao.palavras_chave,
                "complexidade_estimada": solucao.complexidade_estimada,
                "tipo": solucao.tipo,
                "analise_riscos_existente": solucao.analise_riscos
            }
            solucoes_dados.append(solucao_dict)

        # Refinar o prompt com base nas categorias de risco selecionadas
        instrucoes_adicionais = ""
        if pgr_in.parametros_analise and pgr_in.parametros_analise.get("categorias_risco"): 
            categorias = pgr_in.parametros_analise.get("categorias_risco")
            mapa_instrucoes = {
                "tecnico": "Analise detalhadamente os riscos técnicos, incluindo complexidade de implementação, integração com sistemas legados, e escalabilidade da solução.",
                "financeiro": "Foque nos riscos financeiros, como estouro de orçamento, custos de manutenção não previstos e o retorno sobre o investimento (ROI).",
                "operacional": "Considere os riscos operacionais, como a necessidade de treinamento da equipe, impacto nos fluxos de trabalho atuais e a usabilidade da solução.",
                "legal": "Avalie os riscos legais e de conformidade, como adequação à LGPD, direitos de propriedade intelectual e conformidade com as normas do setor público.",
                "estrategico": "Avalie os riscos estratégicos, como o alinhamento com os objetivos de longo prazo da organização, a imagem pública da instituição e a sustentabilidade da solução."
            }
            instrucoes_foco = "\n".join(
                [mapa_instrucoes[cat] for cat in categorias if cat in mapa_instrucoes]
            )
            if instrucoes_foco:
                instrucoes_adicionais = f"\nFOCO DA ANÁLISE (solicitado pelo usuário):\n{instrucoes_foco}\n"

        prompt_completo = f"""
        Você é um especialista em gestão de riscos em contratações públicas. Analise as soluções identificadas para este projeto e identifique riscos detalhados para cada uma.

        CONTEXTO DO PROJETO:
        - Objeto: {contexto.get('objeto_contratacao', 'Não informado')}
        - Justificativa: {contexto.get('justificativa_necessidade', 'Não informada')}
        - Unidade Demandante: {contexto.get('unidade_demandante', 'Não informada')}

        SOLICITAÇÃO DO USUÁRIO:
        {pgr_in.prompt_usuario}
        {instrucoes_adicionais}

        SOLUÇÕES IDENTIFICADAS:
        {json.dumps(solucoes_dados, indent=2, ensure_ascii=False)}
```

        Para cada solução, identifique e analise os riscos seguindo esta estrutura JSON:
        {{
            "resumo_analise": "Resumo geral da análise de riscos para o projeto",
            "metodologia_aplicada": "Metodologia de análise de riscos utilizada",
            "riscos_por_solucao": [
                {{
                    "id_solucao": 1,
                    "nome_solucao": "Nome da solução",
                    "categoria_risco_principal": "Técnico/Operacional/Financeiro/Legal/Estratégico",
                    "nivel_risco_geral": "Baixo/Médio/Alto/Crítico",
                    "riscos_identificados": [
                        {{
                            "categoria": "Técnico/Operacional/Financeiro/Legal/Estratégico",
                            "tipo_risco": "Nome específico do risco",
                            "descricao": "Descrição detalhada do risco",
                            "probabilidade": "Muito Baixa/Baixa/Média/Alta/Muito Alta",
                            "impacto": "Muito Baixo/Baixo/Médio/Alto/Muito Alto",
                            "nivel_risco": "Baixo/Médio/Alto/Crítico",
                            "fase_projeto": "Planejamento/Licitação/Contratação/Execução/Encerramento",
                            "causas_potenciais": ["Causa 1", "Causa 2"],
                            "consequencias": ["Consequência 1", "Consequência 2"],
                            "indicadores": ["Indicador 1", "Indicador 2"],
                            "acoes_mitigacao": [
                                {{
                                    "acao": "Descrição da ação",
                                    "responsavel": "Área/função responsável",
                                    "prazo": "Prazo para implementação",
                                    "custo_estimado": "Estimativa de custo",
                                    "eficacia_estimada": "Baixa/Média/Alta"
                                }}
                            ],
                            "plano_contingencia": {{
                                "trigger": "Condição que ativa o plano",
                                "acoes": ["Ação 1", "Ação 2"],
                                "recursos_necessarios": ["Recurso 1", "Recurso 2"]
                            }},
                            "monitoramento": {{
                                "frequencia": "Diária/Semanal/Mensal/Trimestral",
                                "responsavel": "Área/função responsável",
                                "metricas": ["Métrica 1", "Métrica 2"]
                            }}
                        }}
                    ],
                    "matriz_riscos": {{
                        "riscos_criticos": ["Lista de riscos críticos"],
                        "riscos_altos": ["Lista de riscos altos"],
                        "riscos_medios": ["Lista de riscos médios"],
                        "riscos_baixos": ["Lista de riscos baixos"]
                    }},
                    "recomendacoes_gerais": [
                        "Recomendação específica para esta solução"
                    ]
                }}
            ],
            "analise_comparativa": {{
                "solucao_menor_risco": "Nome da solução com menor risco geral",
                "solucao_maior_risco": "Nome da solução com maior risco geral",
                "fatores_decisao": ["Fator 1", "Fator 2"],
                "recomendacao_final": "Recomendação sobre qual solução escolher"
            }},
            "plano_geral_riscos": {{
                "estrutura_governanca": "Descrição da estrutura de governança de riscos",
                "periodicidade_revisao": "Frequência de revisão do plano",
                "criterios_escalacao": ["Critério 1", "Critério 2"],
                "documentacao_necessaria": ["Documento 1", "Documento 2"]
            }}
        }}

        IMPORTANTE:
        - Identifique pelo menos 3-5 riscos por solução
        - Seja específico sobre ações de mitigação
        - Considere riscos típicos de contratações públicas
        - Avalie tanto riscos internos quanto externos
        - Inclua aspectos legais, técnicos, operacionais e financeiros
        """

        # Log do prompt completo para depuração
        print("--- PROMPT COMPLETO ENVIADO PARA A IA ---")
        print(prompt_completo)
        print("------------------------------------------")

        generate_content_config = types.GenerateContentConfig(
            response_mime_type="application/json"
        )
        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt_completo)])]
        
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config
        )

        # Log da resposta bruta da IA para depuração
        print("--- RESPOSTA DA IA (TEXTO BRUTO) ---")
        print(response.text)
        print("------------------------------------")
        
        resposta_json = json.loads(response.text)
        
        # Validar e enriquecer resposta
        resposta_json = validar_resposta_riscos(resposta_json, solucoes_dados)
        
        return resposta_json
        
    except Exception as e:
        print(f"Erro na consulta à IA para análise de riscos: {e}")
        return criar_resposta_riscos_fallback(solucoes, contexto)


def validar_resposta_riscos(resposta_ia: Dict, solucoes_dados: List[Dict]) -> Dict:
    """
    Valida e enriquece a resposta da IA sobre riscos
    """
    resposta_ia.setdefault("resumo_analise", "Análise de riscos gerada automaticamente")
    resposta_ia.setdefault("metodologia_aplicada", "Análise qualitativa de riscos")
    resposta_ia.setdefault("riscos_por_solucao", [])
    
    # Garantir que há uma análise para cada solução
    if len(resposta_ia["riscos_por_solucao"]) < len(solucoes_dados):
        for i, solucao in enumerate(solucoes_dados):
            if i >= len(resposta_ia["riscos_por_solucao"]):
                risco_fallback = criar_risco_fallback_solucao(solucao)
                resposta_ia["riscos_por_solucao"].append(risco_fallback)
    
    # Validar cada análise de solução
    for i, analise_solucao in enumerate(resposta_ia["riscos_por_solucao"]):
        if i < len(solucoes_dados):
            solucao = solucoes_dados[i]
            analise_solucao.setdefault("id_solucao", solucao["id"])
            analise_solucao.setdefault("nome_solucao", solucao["nome"])
            analise_solucao.setdefault("categoria_risco_principal", "Operacional")
            analise_solucao.setdefault("nivel_risco_geral", "Médio")
            analise_solucao.setdefault("riscos_identificados", [])
            analise_solucao.setdefault("matriz_riscos", {})
            analise_solucao.setdefault("recomendacoes_gerais", [])
    
    resposta_ia.setdefault("analise_comparativa", {})
    resposta_ia.setdefault("plano_geral_riscos", {})
    
    return resposta_ia


def criar_risco_fallback_solucao(solucao: Dict) -> Dict:
    """
    Cria análise de risco fallback para uma solução
    """
    complexidade = solucao.get("complexidade_estimada", "Média")
    nivel_risco = "Alto" if complexidade == "Alta" else ("Baixo" if complexidade == "Baixa" else "Médio")
    
    riscos_base = [
        {
            "categoria": "Técnico",
            "tipo_risco": "Especificações inadequadas",
            "descricao": "Risco de especificações técnicas não atenderem às necessidades",
            "probabilidade": "Média",
            "impacto": "Alto",
            "nivel_risco": nivel_risco,
            "fase_projeto": "Planejamento",
            "causas_potenciais": ["Análise insuficiente de requisitos", "Falta de expertise técnica"],
            "consequencias": ["Atraso no projeto", "Custos adicionais"],
            "indicadores": ["Número de mudanças no escopo", "Reclamações dos usuários"],
            "acoes_mitigacao": [
                {
                    "acao": "Revisão técnica detalhada das especificações",
                    "responsavel": "Equipe técnica",
                    "prazo": "30 dias",
                    "custo_estimado": "Baixo",
                    "eficacia_estimada": "Alta"
                }
            ],
            "plano_contingencia": {
                "trigger": "Especificações rejeitadas na validação",
                "acoes": ["Revisar especificações", "Consultar especialistas"],
                "recursos_necessarios": ["Consultoria especializada", "Tempo adicional"]
            },
            "monitoramento": {
                "frequencia": "Semanal",
                "responsavel": "Gestor do projeto",
                "metricas": ["Percentual de especificações aprovadas", "Número de revisões"]
            }
        }
    ]
    
    return {
        "id_solucao": solucao["id"],
        "nome_solucao": solucao["nome"],
        "categoria_risco_principal": "Técnico",
        "nivel_risco_geral": nivel_risco,
        "riscos_identificados": riscos_base,
        "matriz_riscos": {
            "riscos_criticos": [],
            "riscos_altos": ["Especificações inadequadas"] if nivel_risco == "Alto" else [],
            "riscos_medios": ["Especificações inadequadas"] if nivel_risco == "Médio" else [],
            "riscos_baixos": ["Especificações inadequadas"] if nivel_risco == "Baixo" else []
        },
        "recomendacoes_gerais": [
            f"Atenção especial à complexidade {complexidade.lower()} desta solução",
            "Realizar validação técnica rigorosa"
        ]
    }


def criar_resposta_riscos_fallback(solucoes: List[SolucaoIdentificada], contexto: Dict) -> Dict:
    """
    Cria resposta de fallback quando a IA falha
    """
    riscos_por_solucao = []
    
    for solucao in solucoes:
        solucao_dict = {
            "id": solucao.id_solucao,
            "nome": solucao.nome,
            "complexidade_estimada": solucao.complexidade_estimada
        }
        risco_fallback = criar_risco_fallback_solucao(solucao_dict)
        riscos_por_solucao.append(risco_fallback)
    
    return {
        "resumo_analise": "Análise de riscos básica gerada automaticamente devido a falha no sistema de IA",
        "metodologia_aplicada": "Análise qualitativa básica",
        "riscos_por_solucao": riscos_por_solucao,
        "analise_comparativa": {
            "solucao_menor_risco": solucoes[0].nome if solucoes else "N/A",
            "solucao_maior_risco": solucoes[-1].nome if solucoes else "N/A",
            "fatores_decisao": ["Complexidade técnica", "Custos envolvidos"],
            "recomendacao_final": "Realizar análise detalhada manual"
        },
        "plano_geral_riscos": {
            "estrutura_governanca": "Definir comitê de riscos do projeto",
            "periodicidade_revisao": "Mensal",
            "criterios_escalacao": ["Riscos críticos", "Impacto alto"],
            "documentacao_necessaria": ["Matriz de riscos", "Planos de contingência"]
        },
        "status_ia": "fallback"
    }


async def inicializar_analise_riscos_projeto(projeto_id: int, db: AsyncSession) -> Dict[str, any]:
    """
    Inicializa análise de riscos para um projeto, buscando as soluções identificadas
    """
    try:
        # Buscar contexto do projeto
        contexto_projeto = await buscar_dfd_por_id(projeto_id, db)
        if not contexto_projeto:
            raise ValueError("Projeto não encontrado")
        
        # Buscar soluções identificadas
        solucoes = await buscar_solucoes_projeto(projeto_id, db)
        if not solucoes:
            return {
                "status": "sem_solucoes",
                "mensagem": "Nenhuma solução identificada encontrada. Execute primeiro a análise PDP.",
                "projeto": {
                    "id": projeto_id,
                    "objeto": contexto_projeto.get('objeto_contratacao'),
                    "unidade_demandante": contexto_projeto.get('unidade_demandante')
                }
            }
        
        # Preparar dados das soluções para o frontend
        solucoes_formatadas = []
        for solucao in solucoes:
            solucao_dict = {
                "id_solucao": solucao.id_solucao,
                "nome": solucao.nome,
                "descricao": solucao.descricao,
                "palavras_chave": solucao.palavras_chave or [],
                "complexidade_estimada": solucao.complexidade_estimada,
                "tipo": solucao.tipo,
                "analise_riscos_existente": solucao.analise_riscos or [],
                "data_criacao": solucao.data_criacao.isoformat() if solucao.data_criacao else None
            }
            solucoes_formatadas.append(solucao_dict)
        
        resultado = {
            "projeto": {
                "id": projeto_id,
                "objeto": contexto_projeto.get('objeto_contratacao'),
                "unidade_demandante": contexto_projeto.get('unidade_demandante'),
                "data_criacao": contexto_projeto.get('data_criacao')
            },
            "solucoes": solucoes_formatadas,
            "total_solucoes": len(solucoes_formatadas),
            "status": "sucesso",
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"✅ Análise de riscos inicializada com sucesso para projeto {projeto_id}")
        print(f"📋 {len(solucoes_formatadas)} soluções encontradas")
        return resultado
        
    except Exception as e:
        print(f"Erro na inicialização da análise de riscos para projeto {projeto_id}: {e}")
        return {
            "projeto": {"id": projeto_id},
            "solucoes": [],
            "total_solucoes": 0,
            "status": "erro",
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }