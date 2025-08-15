from app.services.prompts.etp_prompts import prompt_sistema, prompt_integracao_artefatos, prompt_aspectos_tecnicos, prompt_sustentabilidade
from app.client import get_genai_client
from app.dependencies import RemoteUser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, delete, update
from typing import Optional, Dict, List
from google.genai import types
from datetime import datetime
from app.models.projects_models import Projeto
from app.models.etp_models import ETP
from app.models.dfd_models import DFD
from app.models.pdp_models import PDP
from app.models.pgr_models import PGR
from app.models.solucao_models import SolucaoIdentificada
from app.schemas.etp_schemas import ETPCreate, ETPRead, ETPCompleto

import json
import logging

logger = logging.getLogger(__name__)


async def create_etp_service(etp_in: ETPCreate, db: AsyncSession, current_user: RemoteUser, project_id: int) -> List[ETPRead]:
    """
    Cria ETP baseado na síntese dos artefatos anteriores (DFD, PDP, PGR)
    """
    try:
        # Verifica se o projeto existe
        result = await db.execute(
            select(Projeto).where(Projeto.id_projeto == project_id)
        )
        projeto = result.scalar_one_or_none()
        if not projeto:
            raise ValueError("Projeto não encontrado.")
        
        # Busca dados dos artefatos anteriores
        artefatos = await buscar_artefatos_projeto(project_id, db)
        if not artefatos.get("tem_artefatos"):
            raise ValueError("É necessário ter pelo menos DFD e PDP criados antes de gerar o ETP.")
        
        # Limpar ETPs antigos
        print(f"Limpando ETPs antigos para o projeto ID: {project_id}")
        await db.execute(delete(ETP).where(ETP.id_projeto == project_id))
        await db.flush()

        # Gera ETP usando IA
        etp_gerado = await gerar_etp_ia(etp_in.prompt_usuario, artefatos, project_id)
        print("ETP gerado pela IA:", json.dumps(etp_gerado, indent=2, ensure_ascii=False))

        etps_criados = []
        
        # Cria o ETP no banco
        try:
            if hasattr(etp_gerado, 'to_etp_data'):
                etp_data = etp_gerado.to_etp_data()
            else:
                etp_data = dict(etp_gerado) if isinstance(etp_gerado, dict) else etp_gerado
            
            novo_etp = ETP(
                id_projeto=project_id,
                user_created=current_user.username if hasattr(current_user, 'username') else 'sistema',
                # Mapeamento EXATO para os campos do modelo ETP
                unidade_demandante=etp_data.get('unidade_demandante', artefatos.get('dfd', {}).get('unidade_demandante', 'N/D')),
                objeto_contratado=etp_data.get('objeto_contratacao', artefatos.get('dfd', {}).get('objeto_contratacao', 'N/D')),
                sist_reg_preco=etp_data.get('sist_reg_preco', False),
                necessidade_contratacao=etp_data.get('justificativa', artefatos.get('dfd', {}).get('justificativa_necessidade', 'N/D')),
                alinhamento_estrategico=etp_data.get('alinhamento_estrategico', []),
                info_contratacao=etp_data.get('info_contratacao', 'Informações técnicas da contratação'),
                previsto_pca=etp_data.get('previsto_pca', True),
                item=etp_data.get('item_pca', 1),  # IA retorna 'item_pca', modelo usa 'item'
                req_contratacao=etp_data.get('req_contratacao', []),
                lev_mercado=etp_data.get('lev_mercado', {}),
                solucao=etp_data.get('solucao', 'Solução técnica proposta'),
                quantidade_estimada=etp_data.get('quantidade_estimada', {}),
                just_nao_parc=etp_data.get('just_nao_parc', 'Justificativa para não parcelamento'),
                valor_total=etp_data.get('valor_total', 'A definir'),
                demonst_resultados=etp_data.get('demonst_resultados', {}),
                serv_continuo=etp_data.get('serv_continuo', False),
                justif_serv_continuo=etp_data.get('justif_serv_continuo', ''),
                providencias=etp_data.get('providencias', {}),
                impac_ambientais=etp_data.get('impac_ambientais', 'Baixo impacto ambiental esperado'),
                alinhamento_pls=etp_data.get('alinhamento_pls', []),
                posic_conclusivo=etp_data.get('posic_conclusivo', True),
                justif_posic_conclusivo=etp_data.get('justif_posic_conclusivo', 'Contratação recomendada'),
                equipe_de_planejamento=etp_data.get('equipe_de_planejamento', 'Equipe técnica responsável'),
                status=True
            )
            
            db.add(novo_etp)
            await db.flush()
            etps_criados.append(novo_etp)
                
        except Exception as e:
            print(f"Erro ao processar ETP: {e}")
            raise e
        
        # Atualizar o status do projeto
        if etps_criados:
            print(f"Atualizando o status 'exist_etp' para True no projeto ID: {project_id}")
            projeto.exist_etp = True
        else:
            print(f"Nenhum ETP foi criado. Atualizando 'exist_etp' para False no projeto ID: {project_id}")
            projeto.exist_etp = False

        await db.commit() 
        
        etps_response = []
        for etp in etps_criados:
            await db.refresh(etp)
            etp_read = ETPRead.from_orm(etp)
            etps_response.append(etp_read)
        
        return etps_response
        
    except Exception as e:
        await db.rollback()
        print(f"Erro geral na criação do ETP: {e}")
        raise e


async def buscar_artefatos_projeto(project_id: int, db: AsyncSession) -> Dict[str, any]:
    """
    Busca todos os artefatos de um projeto para integração no ETP
    """
    try:
        resultado = {"tem_artefatos": False}
        
        # Buscar DFD
        stmt_dfd = select(DFD).where(DFD.id_projeto == project_id)
        result_dfd = await db.execute(stmt_dfd)
        dfd = result_dfd.scalar_one_or_none()
        
        if dfd:
            resultado["dfd"] = {
                "id": dfd.id,
                "unidade_demandante": dfd.unidade_demandante,
                "objeto_contratacao": dfd.objeto_contratado,
                "justificativa_necessidade": dfd.justificativa_contratacao,
                "quantidade_contratada": dfd.quantidade_contratada,
                "previsao_inicio_servicos": dfd.previsao_data_bem_servico.isoformat() if dfd.previsao_data_bem_servico else None,
                "alinhamento_estrategico": dfd.alinhamento_estrategico,
                "equipe_planejamento": dfd.equipe_de_planejamento,
                "item_pca": dfd.item,
                "previsto_pca": dfd.previsto_pca
            }
            resultado["tem_artefatos"] = True
        
        # Buscar PDPs
        stmt_pdp = select(PDP).where(PDP.id_projeto == project_id)
        result_pdp = await db.execute(stmt_pdp)
        pdps = result_pdp.scalars().all()
        
        if pdps:
            resultado["pdp"] = []
            for pdp in pdps:
                pdp_data = {
                    "id": pdp.id,
                    "orgao_contratante": pdp.orgao_contratante,
                    "processo_pregao": pdp.processo_pregao,
                    "empresa_adjudicada": pdp.empresa_adjudicada,
                    "objeto": pdp.objeto,
                    "data_vigencia_inicio": pdp.data_vigencia_inicio.isoformat() if pdp.data_vigencia_inicio else None,
                    "tipo_fonte": pdp.tipo_fonte,
                    "tabela_itens": pdp.tabela_itens
                }
                resultado["pdp"].append(pdp_data)
            resultado["tem_artefatos"] = True
        
        # Buscar PGRs
        stmt_pgr = select(PGR).where(PGR.id_projeto == project_id)
        result_pgr = await db.execute(stmt_pgr)
        pgrs = result_pgr.scalars().all()
        
        if pgrs:
            resultado["pgr"] = []
            for pgr in pgrs:
                pgr_data = {
                    "id_pgr": pgr.id_pgr,
                    "id_solucao": pgr.id_solucao,
                    "objeto": pgr.objeto,
                    "risco": pgr.risco
                }
                resultado["pgr"].append(pgr_data)
        
        # Buscar Soluções
        stmt_solucoes = select(SolucaoIdentificada).where(SolucaoIdentificada.id_projeto == project_id)
        result_solucoes = await db.execute(stmt_solucoes)
        solucoes = result_solucoes.scalars().all()
        
        if solucoes:
            resultado["solucoes"] = []
            for solucao in solucoes:
                solucao_data = {
                    "id_solucao": solucao.id_solucao,
                    "nome": solucao.nome,
                    "descricao": solucao.descricao,
                    "palavras_chave": solucao.palavras_chave,
                    "complexidade_estimada": solucao.complexidade_estimada,
                    "tipo": solucao.tipo,
                    "analise_riscos": solucao.analise_riscos
                }
                resultado["solucoes"].append(solucao_data)
        
        return resultado
        
    except Exception as e:
        print(f"Erro ao buscar artefatos do projeto: {e}")
        return {"tem_artefatos": False, "erro": str(e)}


async def gerar_etp_ia(prompt_usuario: str, artefatos: Dict, project_id: int) -> Dict:
    """
    Gera ETP usando IA com base nos artefatos anteriores
    """
    try:
        client = get_genai_client()
        model = "gemini-2.0-flash"
        
        # Monta o prompt completo usando os prompts modulares
        prompt_completo = f"""
        {prompt_sistema}

        {prompt_integracao_artefatos}

        {prompt_aspectos_tecnicos}

        {prompt_sustentabilidade}

        ---
        DADOS DOS ARTEFATOS ANTERIORES (JSON):
        {json.dumps(artefatos, indent=2, ensure_ascii=False)}

        ---
        SOLICITAÇÃO ESPECÍFICA DO USUÁRIO:
        "{prompt_usuario}"

        ---
        ESTRUTURA JSON DE RESPOSTA OBRIGATÓRIA:

        Com base nos dados fornecidos e nas diretrizes acima, gere um ETP completo seguindo exatamente esta estrutura JSON:

        {{
            "unidade_demandante": "Unidade responsável pela demanda (extrair do DFD)",
            "objeto_contratacao": "Descrição detalhada do objeto (baseado no DFD)",
            "sist_reg_preco": false,
            "justificativa_necessidade": "Justificativa detalhada da necessidade (baseado no DFD)",
            "alinhamento_estrategico": [
                "Alinhamento estratégico extraído do DFD",
                "Objetivos institucionais relacionados"
            ],
            "informacoes_contratacao": "Informações técnicas detalhadas sobre a contratação",
            "previsto_pca": true,
            "item_pca": 1,
            "requisitos_contratacao": [
                "Requisito técnico específico 1",
                "Requisito habilitatório 2",
                "Experiência comprovada na área",
                "Certificações necessárias"
            ],
            "levantamento_mercado": {{
                "pesquisa_mercado": "Descrição da pesquisa realizada baseada nos dados do PDP",
                "preco_medio": 0.0,
                "variacao_percentual": 15.0,
                "fontes": ["PDP - Análise de contratos similares", "Consulta ao mercado", "Dados históricos"],
                "data_pesquisa": "{datetime.now().strftime('%Y-%m-%d')}",
                "observacoes": "Observações específicas sobre a pesquisa de mercado realizada"
            }},
            "solucao_proposta": "Descrição detalhada da solução técnica proposta (integrar dados das soluções identificadas)",
            "quantidade_estimada": {{
                "item_principal": {{
                    "descricao": "Descrição do item principal",
                    "quantidade": 1,
                    "unidade": "unidade apropriada",
                    "valor_unitario": 0.0,
                    "valor_total": 0.0
                }},
                "itens_adicionais": [],
                "total_estimado": 0.0,
                "criterios_dimensionamento": "Critérios técnicos utilizados para dimensionamento"
            }},
            "justificativa_nao_parcelamento": "Justificativa técnica fundamentada para não parcelamento da contratação",
            "valor_total_estimado": "R$ 0,00 (baseado nos dados do PDP)",
            "demonst_resultados": {{
                "resultados_quantitativos": {{
                    "eficiencia_operacional": "Percentual de melhoria esperado",
                    "redução_custos": "Economia estimada",
                    "tempo_execucao": "Prazo de implementação"
                }},
                "resultados_qualitativos": {{
                    "melhoria_servicos": "Descrição da melhoria na qualidade",
                    "satisfacao_usuarios": "Impacto na satisfação dos usuários finais",
                    "conformidade_legal": "Atendimento às normas e regulamentações"
                }},
                "indicadores_desempenho": ["Indicador específico 1", "Indicador específico 2"],
                "prazo_resultados": "Prazo realista para obtenção dos resultados"
            }},
            "servico_continuo": false,
            "justificativa_servico_continuo": "Justificativa se for serviço de natureza continuada (ou null se não for)",
            "providencias_necessarias": {{
                "pre_contratacao": [
                    "Elaboração detalhada do Termo de Referência/Projeto Básico",
                    "Aprovação pela autoridade competente",
                    "Processo licitatório conforme modalidade adequada",
                    "Dotação orçamentária específica"
                ],
                "durante_execucao": [
                    "Fiscalização técnica especializada",
                    "Acompanhamento sistemático da execução",
                    "Controle rigoroso de qualidade",
                    "Gestão de riscos identificados no PGR"
                ],
                "pos_contratacao": [
                    "Avaliação final dos resultados obtidos",
                    "Documentação completa do processo",
                    "Lições aprendidas para futuras contratações"
                ],
                "responsaveis": {{
                    "gestor_contrato": "Perfil do gestor responsável",
                    "fiscal_tecnico": "Competências técnicas necessárias",
                    "equipe_apoio": "Equipe de apoio necessária"
                }}
            }},
            "impactos_ambientais": "Análise detalhada dos impactos ambientais considerando todo o ciclo de vida",
            "alinhamento_pls": [
                "Critério específico de sustentabilidade 1",
                "Critério específico de sustentabilidade 2",
                "Conformidade com PLS da Administração Pública"
            ],
            "posicao_conclusiva": true,
            "justificativa_posicao": "Justificativa técnica fundamentada da posição conclusiva",
            "equipe_planejamento": "Identificação completa da equipe responsável pelo planejamento"
        }}

        INSTRUÇÕES CRÍTICAS PARA GERAÇÃO:
        1. INTEGRE OBRIGATORIAMENTE os dados reais dos artefatos fornecidos (DFD, PDP, PGR, Soluções)
        2. INCORPORE os riscos identificados no PGR nas seções apropriadas
        3. USE os dados de preços e fornecedores do PDP no levantamento de mercado
        4. MANTENHA absoluta coerência com o objeto e justificativas definidos no DFD
        5. FUNDAMENTE a solução proposta nas soluções identificadas previamente
        6. SEJA específico, detalhado e tecnicamente preciso em todas as seções
        7. CONSIDERE obrigatoriamente aspectos de sustentabilidade conforme PLS
        8. GARANTA que a posição conclusiva seja baseada em análise técnica sólida
        9. ATENDA às exigências da Lei 14.133/2021 e normas correlatas
        10. APRESENTE conteúdo profissional compatível com padrões da Administração Pública

        Gere um ETP de excelência técnica que justifique adequadamente a contratação proposta.
        """

        print("--- Enviando prompt para Gemini ---")
        print(f"Tamanho do prompt: {len(prompt_completo)} caracteres")

        generate_content_config = types.GenerateContentConfig(
            response_mime_type="application/json"
        )
        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt_completo)])]
        
        print("--- Aguardando resposta da API Gemini para ETP... ---")
        
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config
        )
        
        resposta_json = json.loads(response.text)
        print("\n--- Resposta da API Gemini para ETP (JSON Estruturado) ---")
        print(json.dumps(resposta_json, indent=2, ensure_ascii=False)[:1000] + "..." if len(str(resposta_json)) > 1000 else json.dumps(resposta_json, indent=2, ensure_ascii=False))
        
        # Validar e enriquecer resposta
        resposta_json = validar_resposta_etp(resposta_json, artefatos)
        
        return resposta_json
        
    except Exception as e:
        print(f"Erro na consulta à IA para ETP: {e}")
        logger.error(f"Erro na geração do ETP via IA: {e}")
        return criar_etp_fallback(artefatos, project_id)


def validar_resposta_etp(resposta_ia: Dict, artefatos: Dict) -> Dict:
    """
    Valida e enriquece a resposta da IA para ETP com mapeamento EXATO para o modelo ETP
    """
    dfd_data = artefatos.get("dfd", {})
    pdp_data = artefatos.get("pdp", [{}])[0] if artefatos.get("pdp") else {}
    pgr_data = artefatos.get("pgr", [])
    solucoes_data = artefatos.get("solucoes", [])
    
    logger.info("Iniciando validação e enriquecimento da resposta do ETP")
    
    # Campos obrigatórios com fallbacks inteligentes - NOMES EXATOS DO MODELO ETP
    resposta_ia.setdefault("unidade_demandante", dfd_data.get("unidade_demandante", "Unidade Demandante"))
    resposta_ia.setdefault("objeto_contratacao", dfd_data.get("objeto_contratacao", "Objeto da contratação"))
    resposta_ia.setdefault("sist_reg_preco", False)
    resposta_ia.setdefault("justificativa", dfd_data.get("justificativa_necessidade", "Justificativa da necessidade"))
    resposta_ia.setdefault("alinhamento_estrategico", dfd_data.get("alinhamento_estrategico", ["Eficiência Operacional", "Qualidade dos Serviços"]))
    resposta_ia.setdefault("info_contratacao", "Informações técnicas sobre a contratação")
    resposta_ia.setdefault("previsto_pca", dfd_data.get("previsto_pca", True))
    resposta_ia.setdefault("item_pca", dfd_data.get("item_pca", 1))
    
    # Requisitos de contratação - enriquecidos com base na complexidade
    if not resposta_ia.get("req_contratacao"):
        requisitos_base = [
            "Experiência comprovada na área de atuação",
            "Capacidade técnica adequada ao objeto",
            "Regularidade jurídica e fiscal"
        ]
        
        # Adiciona requisitos específicos baseados no tipo de solução
        if solucoes_data:
            for solucao in solucoes_data[:2]:  # Pega as 2 primeiras soluções
                complexidade = solucao.get("complexidade_estimada", "").lower()
                if "alta" in complexidade:
                    requisitos_base.append("Certificação técnica específica")
                    requisitos_base.append("Equipe com especialização comprovada")
                elif "média" in complexidade:
                    requisitos_base.append("Atestados de capacidade técnica")
        
        resposta_ia["req_contratacao"] = requisitos_base
    
    # Levantamento de mercado - integração com dados do PDP
    if "lev_mercado" not in resposta_ia:
        resposta_ia["lev_mercado"] = {}
    
    lev_mercado = resposta_ia["lev_mercado"]
    lev_mercado.setdefault("pesquisa_mercado", "Pesquisa baseada em análise de contratos similares e consulta ao mercado")
    
    # Calcula preço médio baseado no PDP se disponível
    if pdp_data.get("tabela_itens"):
        valor_total = 0.0
        for item in pdp_data["tabela_itens"]:
            if isinstance(item, dict) and "valor_total" in item:
                try:
                    valor_total += float(item["valor_total"])
                except (ValueError, TypeError):
                    continue
        if valor_total > 0:
            lev_mercado["preco_medio"] = valor_total
        else:
            lev_mercado.setdefault("preco_medio", 0.0)
    else:
        lev_mercado.setdefault("preco_medio", 0.0)
    
    lev_mercado.setdefault("variacao_percentual", 15.0)
    lev_mercado.setdefault("fontes", ["PDP - Análise de contratos similares", "Consulta ao mercado", "Dados históricos"])
    lev_mercado.setdefault("data_pesquisa", datetime.now().strftime("%Y-%m-%d"))
    lev_mercado.setdefault("observacoes", "Pesquisa realizada com base nos dados disponíveis")
    
    # Solução proposta - integra dados das soluções identificadas
    if not resposta_ia.get("solucao") and solucoes_data:
        solucao_principal = next((s for s in solucoes_data if s.get("tipo") == "principal"), solucoes_data[0] if solucoes_data else None)
        if solucao_principal:
            resposta_ia["solucao"] = f"{solucao_principal.get('nome', 'Solução técnica')}: {solucao_principal.get('descricao', 'Descrição técnica da solução proposta')}"
        else:
            resposta_ia.setdefault("solucao", "Solução técnica baseada na análise do projeto")
    else:
        resposta_ia.setdefault("solucao", "Solução técnica baseada na análise do projeto")
    
    # Quantidade estimada
    if "quantidade_estimada" not in resposta_ia:
        resposta_ia["quantidade_estimada"] = {}
    
    quant_est = resposta_ia["quantidade_estimada"]
    if "item_principal" not in quant_est:
        quant_est["item_principal"] = {
            "descricao": dfd_data.get("objeto_contratacao", "Item principal da contratação"),
            "quantidade": 1,
            "unidade": "un",
            "valor_unitario": lev_mercado.get("preco_medio", 0.0),
            "valor_total": lev_mercado.get("preco_medio", 0.0)
        }
    
    quant_est.setdefault("itens_adicionais", [])
    quant_est.setdefault("total_estimado", lev_mercado.get("preco_medio", 0.0))
    quant_est.setdefault("criterios_dimensionamento", "Baseado na necessidade identificada e análise de mercado")
    
    # Outros campos essenciais - NOMES EXATOS DO MODELO
    resposta_ia.setdefault("just_nao_parc", "A natureza da contratação não permite parcelamento sem prejuízo da funcionalidade e eficiência")
    
    # Formatação do valor total
    valor_total_num = lev_mercado.get("preco_medio", 0.0)
    if isinstance(valor_total_num, (int, float)) and valor_total_num > 0:
        valor_formatado = f"R$ {valor_total_num:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        resposta_ia["valor_total"] = valor_formatado
    else:
        resposta_ia.setdefault("valor_total", "A definir mediante pesquisa detalhada")
    
    # Demonstração de resultados
    if "demonst_resultados" not in resposta_ia:
        resposta_ia["demonst_resultados"] = {}
    
    demo_result = resposta_ia["demonst_resultados"]
    demo_result.setdefault("resultados_quantitativos", {
        "eficiencia_operacional": "Melhoria estimada de 20% na eficiência",
        "tempo_implementacao": "Implementação em prazo adequado",
        "conformidade_legal": "100% de conformidade com normas vigentes"
    })
    demo_result.setdefault("resultados_qualitativos", {
        "qualidade_servicos": "Melhoria significativa na qualidade dos serviços",
        "satisfacao_usuarios": "Maior satisfação dos usuários finais",
        "padronizacao": "Padronização de processos e procedimentos"
    })
    demo_result.setdefault("indicadores_desempenho", ["Tempo de resposta", "Qualidade do serviço", "Satisfação do usuário"])
    demo_result.setdefault("prazo_resultados", "12 meses")
    
    # Serviço contínuo
    resposta_ia.setdefault("serv_continuo", False)
    if resposta_ia.get("serv_continuo"):
        resposta_ia.setdefault("justif_serv_continuo", "Serviço de natureza continuada conforme análise técnica")
    else:
        resposta_ia["justif_serv_continuo"] = None
    
    # Providências necessárias - enriquecidas com dados dos riscos
    if "providencias" not in resposta_ia:
        resposta_ia["providencias"] = {}
    
    prov_nec = resposta_ia["providencias"]
    prov_nec.setdefault("pre_contratacao", [
        "Elaboração detalhada do Termo de Referência/Projeto Básico",
        "Aprovação pela autoridade competente",
        "Processo licitatório conforme modalidade adequada",
        "Dotação orçamentária específica"
    ])
    
    # Adiciona providências baseadas nos riscos do PGR
    durante_execucao = [
        "Fiscalização técnica especializada",
        "Acompanhamento sistemático da execução",
        "Controle rigoroso de qualidade"
    ]
    
    if pgr_data:
        durante_execucao.append("Monitoramento ativo dos riscos identificados no PGR")
        durante_execucao.append("Implementação de medidas mitigatórias conforme plano de riscos")
    
    prov_nec.setdefault("durante_execucao", durante_execucao)
    prov_nec.setdefault("pos_contratacao", [
        "Avaliação final dos resultados obtidos",
        "Documentação completa do processo",
        "Lições aprendidas para futuras contratações"
    ])
    
    prov_nec.setdefault("responsaveis", {
        "gestor_contrato": "Servidor com competência técnica para gestão do contrato",
        "fiscal_tecnico": "Profissional com conhecimento específico na área do objeto",
        "equipe_apoio": "Equipe multidisciplinar conforme necessidade"
    })
    
    # Outros campos finais - NOMES EXATOS DO MODELO
    resposta_ia.setdefault("impac_ambientais", "Impacto ambiental baixo a moderado. Serão adotadas medidas de sustentabilidade conforme PLS e legislação vigente")
    resposta_ia.setdefault("alinhamento_pls", [
        "Uso racional de recursos naturais",
        "Práticas sustentáveis na execução",
        "Responsabilidade socioambiental",
        "Conformidade com critérios de sustentabilidade"
    ])
    resposta_ia.setdefault("posic_conclusivo", True)
    resposta_ia.setdefault("justif_posic_conclusivo", "A contratação é recomendada considerando a necessidade identificada, viabilidade técnica e econômica, e os benefícios esperados para a Administração")
    resposta_ia.setdefault("equipe_de_planejamento", dfd_data.get("equipe_planejamento", "Equipe técnica multidisciplinar responsável pelo planejamento da contratação"))
    
    logger.info("Validação e enriquecimento da resposta do ETP concluída")
    return resposta_ia


def criar_etp_fallback(artefatos: Dict, project_id: int) -> Dict:
    """
    Cria ETP de fallback quando a IA falha
    """
    dfd_data = artefatos.get("dfd", {})
    pdp_data = artefatos.get("pdp", [{}])[0] if artefatos.get("pdp") else {}
    
    return {
        "unidade_demandante": dfd_data.get("unidade_demandante", "Unidade Demandante"),
        "objeto_contratacao": dfd_data.get("objeto_contratacao", "Objeto da contratação"),
        "sist_reg_preco": False,
        "justificativa_necessidade": dfd_data.get("justificativa_necessidade", "Justificativa da necessidade da contratação"),
        "alinhamento_estrategico": dfd_data.get("alinhamento_estrategico", ["Eficiência Operacional", "Qualidade dos Serviços"]),
        "informacoes_contratacao": "Contratação necessária conforme análise técnica realizada",
        "previsto_pca": dfd_data.get("previsto_pca", True),
        "item_pca": dfd_data.get("item_pca", 1),
        "requisitos_contratacao": [
            "Experiência comprovada na área",
            "Capacidade técnica adequada",
            "Regularidade jurídica e fiscal"
        ],
        "levantamento_mercado": {
            "pesquisa_mercado": "Pesquisa básica de mercado realizada",
            "preco_medio": 0.0,
            "variacao_percentual": 15.0,
            "fontes": ["Consulta de mercado", "Dados históricos"],
            "data_pesquisa": datetime.now().strftime("%Y-%m-%d"),
            "observacoes": "Pesquisa automática gerada devido a falha no sistema de IA"
        },
        "solucao_proposta": "Solução técnica adequada às necessidades identificadas",
        "quantidade_estimada": {
            "item_principal": {
                "descricao": "Item principal da contratação",
                "quantidade": 1,
                "unidade": "un",
                "valor_unitario": 0.0,
                "valor_total": 0.0
            },
            "total_estimado": 0.0,
            "criterios_dimensionamento": "Baseado na necessidade identificada"
        },
        "justificativa_nao_parcelamento": "A natureza da contratação não permite parcelamento sem prejuízo da funcionalidade",
        "valor_total_estimado": "A definir mediante pesquisa detalhada",
        "demonst_resultados": {
            "resultados_quantitativos": {
                "eficiencia": "Melhoria esperada",
                "prazo": "Atendimento nos prazos"
            },
            "resultados_qualitativos": {
                "qualidade": "Melhoria na qualidade dos serviços",
                "satisfacao": "Maior satisfação dos usuários"
            },
            "indicadores_desempenho": ["Tempo de resposta", "Qualidade do serviço"],
            "prazo_resultados": "12 meses"
        },
        "servico_continuo": False,
        "justificativa_servico_continuo": None,
        "providencias_necessarias": {
            "pre_contratacao": [
                "Elaboração do Termo de Referência",
                "Aprovação da documentação técnica",
                "Processo licitatório"
            ],
            "durante_execucao": [
                "Fiscalização técnica da execução",
                "Acompanhamento dos resultados",
                "Controle de qualidade"
            ],
            "pos_contratacao": [
                "Avaliação final dos resultados",
                "Documentação do processo"
            ],
            "responsaveis": {
                "gestor": "Gestor do contrato",
                "fiscal": "Fiscal técnico"
            }
        },
        "impactos_ambientais": "Impacto ambiental baixo. Medidas de sustentabilidade serão adotadas conforme legislação vigente",
        "alinhamento_pls": [
            "Uso racional de recursos",
            "Práticas sustentáveis",
            "Responsabilidade socioambiental"
        ],
        "posicao_conclusiva": True,
        "justificativa_posicao": "A contratação é recomendada considerando a necessidade identificada e os benefícios esperados",
        "equipe_planejamento": dfd_data.get("equipe_planejamento", "Equipe técnica responsável pelo planejamento"),
        "status_ia": "fallback"
    }


async def inicializar_analise_etp_projeto(projeto_id: int, db: AsyncSession) -> Dict[str, any]:
    """
    Inicializa análise para ETP, verificando artefatos disponíveis
    """
    try:
        # Buscar dados do projeto
        stmt = select(Projeto).where(Projeto.id_projeto == projeto_id)
        result = await db.execute(stmt)
        projeto = result.scalar_one_or_none()
        
        if not projeto:
            raise ValueError("Projeto não encontrado")
        
        # Buscar artefatos disponíveis
        artefatos = await buscar_artefatos_projeto(projeto_id, db)
        
        if not artefatos.get("tem_artefatos"):
            return {
                "status": "sem_artefatos",
                "mensagem": "É necessário criar DFD e PDP antes de gerar o ETP.",
                "projeto": {
                    "id": projeto_id,
                    "nome": projeto.nome,
                    "tipo": projeto.tipo,
                    "objeto": projeto.descricao
                }
            }
        
        # Análise dos artefatos para ETP
        analise_etp = analisar_artefatos_para_etp(artefatos)
        
        resultado = {
            "projeto": {
                "id": projeto_id,
                "nome": projeto.nome,
                "tipo": projeto.tipo,
                "objeto": projeto.descricao or "Não informado",
                "unidade_demandante": artefatos.get("dfd", {}).get("unidade_demandante", "N/D"),
                "data_criacao": projeto.dt_created.isoformat() if projeto.dt_created else None
            },
            "artefatos_disponiveis": {
                "dfd": bool(artefatos.get("dfd")),
                "pdp": bool(artefatos.get("pdp")),
                "pgr": bool(artefatos.get("pgr")),
                "solucoes": bool(artefatos.get("solucoes"))
            },
            "analise_etp": analise_etp,
            "dados_etp_preliminar": gerar_dados_preliminares_etp(artefatos),
            "status": "sucesso",
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"✅ Análise ETP inicializada com sucesso para projeto {projeto_id}")
        return resultado
        
    except Exception as e:
        print(f"Erro na inicialização da análise ETP para projeto {projeto_id}: {e}")
        return {
            "projeto": {"id": projeto_id},
            "artefatos_disponiveis": {},
            "analise_etp": {},
            "status": "erro",
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }


def analisar_artefatos_para_etp(artefatos: Dict) -> Dict:
    """
    Analisa os artefatos disponíveis para gerar insights para o ETP
    """
    dfd_data = artefatos.get("dfd", {})
    pdp_data = artefatos.get("pdp", [])
    pgr_data = artefatos.get("pgr", [])
    solucoes_data = artefatos.get("solucoes", [])
    
    # Análise básica
    objeto_principal = dfd_data.get("objeto_contratacao", "Objeto não definido")
    
    # Estimativa de valor baseada no PDP
    valor_estimado_total = 0.0
    if pdp_data:
        for pdp in pdp_data:
            tabela_itens = pdp.get("tabela_itens", [])
            for item in tabela_itens:
                if isinstance(item, dict) and "valor_total" in item:
                    try:
                        valor_estimado_total += float(item["valor_total"])
                    except (ValueError, TypeError):
                        continue
    
    # Análise de complexidade
    complexidade = "Média"
    if len(solucoes_data) > 3:
        complexidade = "Alta"
    elif len(solucoes_data) == 1:
        complexidade = "Baixa"
    
    # Riscos principais do PGR
    riscos_principais = []
    for pgr in pgr_data:
        risco_data = pgr.get("risco", {})
        if isinstance(risco_data, dict):
            riscos_por_solucao = risco_data.get("riscos_por_solucao", [])
            for risco_solucao in riscos_por_solucao:
                if isinstance(risco_solucao, dict):
                    nivel_risco = risco_solucao.get("nivel_risco_geral", "")
                    if nivel_risco in ["Alto", "Crítico"]:
                        nome_solucao = risco_solucao.get("nome_solucao", "Solução")
                        riscos_principais.append(f"Risco {nivel_risco.lower()} na {nome_solucao}")
    
    return {
        "resumo_projeto": f"Projeto de {objeto_principal}",
        "objeto_principal": objeto_principal,
        "valor_estimado_total": valor_estimado_total if valor_estimado_total > 0 else None,
        "complexidade_geral": complexidade,
        "riscos_principais": riscos_principais[:5],  # Top 5 riscos
        "solucoes_disponiveis": [s.get("nome", "Solução") for s in solucoes_data[:3]],
        "recomendacoes_tecnicas": [
            "Definir especificações técnicas detalhadas",
            "Estabelecer critérios de aceitação claros",
            "Prever mecanismos de acompanhamento"
        ],
        "alertas_importantes": [
            "Verificar conformidade com legislação vigente",
            "Considerar aspectos de sustentabilidade",
            "Definir equipe de fiscalização"
        ],
        "requisitos_especiais": []
    }


def gerar_dados_preliminares_etp(artefatos: Dict) -> Dict:
    """
    Gera dados preliminares para pré-preenchimento do ETP
    """
    dfd_data = artefatos.get("dfd", {})
    
    return {
        "unidade_demandante": dfd_data.get("unidade_demandante"),
        "objeto_contratacao": dfd_data.get("objeto_contratacao"),
        "justificativa_necessidade": dfd_data.get("justificativa_necessidade"),
        "alinhamento_estrategico": dfd_data.get("alinhamento_estrategico", []),
        "equipe_planejamento": dfd_data.get("equipe_planejamento"),
        "previsto_pca": dfd_data.get("previsto_pca", True),
        "item_pca": dfd_data.get("item_pca", 1)
    }