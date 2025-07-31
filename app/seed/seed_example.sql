-- Arquivo seed_completo.sql - Dados completos de exemplo para todas as tabelas
-- Limpa dados demo existentes
DELETE FROM core.pgr;
DELETE FROM core.solucao_identificada;
DELETE FROM core.etp;
DELETE FROM core.pdp;
DELETE FROM core.dfd;
DELETE FROM core.projeto;

-- ========================================
-- INSERIR PROJETOS
-- ========================================

-- Projeto 1: Sistema de Gestão de Contratos
INSERT INTO core.projeto (
    nome,
    descricao,
    tipo,
    user_created,
    dt_created,
    exist_dfd,
    exist_pdp,
    exist_solucao,
    exist_pgr,
    exist_etp,
    exist_tr,
    exist_ed
) VALUES (
    'Sistema de Gestão de Contratos',
    'Desenvolvimento de sistema para automação e gestão de contratos institucionais',
    'TI',
    'user.demo',
    CURRENT_TIMESTAMP,
    true,
    true,
    true,
    true,
    true,
    false,
    false
);

-- Projeto 2: Reforma do Auditório Principal
INSERT INTO core.projeto (
    nome,
    descricao,
    tipo,
    user_created,
    dt_created,
    exist_dfd,
    exist_pdp,
    exist_solucao,
    exist_pgr,
    exist_etp,
    exist_tr,
    exist_ed
) VALUES (
    'Reforma do Auditório Principal',
    'Modernização completa do auditório principal com novos equipamentos audiovisuais',
    'OBRAS',
    'user.demo',
    CURRENT_TIMESTAMP,
    true,
    true,
    true,
    true,
    true,
    false,
    false
);

-- ========================================
-- INSERIR DFDs (Documento de Formalização de Demanda)
-- ========================================

-- DFD para Projeto 1
INSERT INTO core.dfd (
    id_projeto,
    usuario_criacao,
    data_criacao,
    previsto_pca,
    item_pca,
    unidade_demandante,
    objeto_contratacao,
    justificativa,
    quantidade,
    previsao_da_entrega,
    alinhamento_estrategico,
    equipe_de_planejamento,
    status
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Sistema de Gestão de Contratos'),
    'user.demo',
    CURRENT_TIMESTAMP,
    true,
    125,
    'Diretoria de Tecnologia da Informação',
    'Contratação de empresa especializada para desenvolvimento de sistema de gestão de contratos',
    'Necessidade de modernizar o processo de gestão de contratos, atualmente manual e propenso a erros',
    '{"licencas": 50, "horas_desenvolvimento": 2000, "manutencao_meses": 12}',
    CURRENT_TIMESTAMP + INTERVAL '6 months',
    ARRAY['Transformação Digital', 'Eficiência Operacional', 'Transparência'],
    'João Silva (Coordenador), Maria Santos (Analista), Pedro Costa (Desenvolvedor)',
    true
);

-- DFD para Projeto 2
INSERT INTO core.dfd (
    id_projeto,
    usuario_criacao,
    data_criacao,
    previsto_pca,
    item_pca,
    unidade_demandante,
    objeto_contratacao,
    justificativa,
    quantidade,
    previsao_da_entrega,
    alinhamento_estrategico,
    equipe_de_planejamento,
    status
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Reforma do Auditório Principal'),
    'user.demo',
    CURRENT_TIMESTAMP,
    true,
    087,
    'Diretoria de Infraestrutura',
    'Serviços de reforma e modernização do auditório com instalação de equipamentos audiovisuais',
    'Auditório atual apresenta problemas estruturais e equipamentos obsoletos, comprometendo eventos institucionais',
    '{"area_m2": 300, "assentos": 150, "equipamentos_av": 1, "prazo_dias": 120}',
    CURRENT_TIMESTAMP + INTERVAL '4 months',
    ARRAY['Modernização de Infraestrutura', 'Qualidade dos Serviços', 'Sustentabilidade'],
    'Ana Oliveira (Engenheira), Carlos Mendes (Arquiteto), Lucia Ferreira (Gestora)',
    true
);

-- ========================================
-- INSERIR SOLUÇÕEs IDENTIFICADAS
-- ========================================

-- Solução para Projeto 1
INSERT INTO core.solucao_identificada (
    id_projeto,
    usuario_criacao,
    data_criacao,
    nome,
    descricao,
    palavras_chave,
    complexidade_estimada,
    tipo,
    analise_riscos
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Sistema de Gestão de Contratos'),
    'user.demo',
    CURRENT_TIMESTAMP,
    'Plataforma Web de Gestão de Contratos',
    'Sistema web responsivo desenvolvido em tecnologias modernas com integração a sistemas existentes',
    '["gestao_contratos", "automacao", "workflow", "integracao", "web_system"]',
    'ALTA',
    'DESENVOLVIMENTO_CUSTOMIZADO',
    '{"tecnicos": ["Integração com sistemas legados", "Migração de dados"], "cronograma": ["Atraso na entrega", "Mudança de escopo"], "orcamentarios": ["Variação cambial", "Custos adicionais"], "operacionais": ["Resistência dos usuários", "Treinamento insuficiente"]}'
);

-- Solução para Projeto 2
INSERT INTO core.solucao_identificada (
    id_projeto,
    usuario_criacao,
    data_criacao,
    nome,
    descricao,
    palavras_chave,
    complexidade_estimada,
    tipo,
    analise_riscos
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Reforma do Auditório Principal'),
    'user.demo',
    CURRENT_TIMESTAMP,
    'Reforma Completa com Tecnologia Integrada',
    'Reforma estrutural completa com instalação de sistema audiovisual de última geração e mobiliário ergonômico',
    '["reforma", "audiovisual", "acustica", "climatizacao", "acessibilidade"]',
    'MEDIA',
    'OBRA_E_FORNECIMENTO',
    '{"tecnicos": ["Problemas estruturais não previstos", "Compatibilidade de equipamentos"], "cronograma": ["Condições climáticas", "Fornecimento de materiais"], "orcamentarios": ["Inflação de materiais", "Serviços extras"], "ambientais": ["Ruído durante execução", "Destinação de resíduos"]}'
);

-- ========================================
-- INSERIR PDPs (Pesquisa de Dados e Preços)
-- ========================================

-- PDP para Projeto 1
INSERT INTO core.pdp (
    id_projeto,
    usuario_criacao,
    data_criacao,
    orgao_contratante,
    processo_pregao,
    empresa_adjudicada,
    cnpj_empresa,
    objeto,
    data_vigencia_inicio,
    data_vigencia_fim,
    tipo_fonte,
    tabela_itens,
    status
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Sistema de Gestão de Contratos'),
    'user.demo',
    CURRENT_TIMESTAMP,
    'Tribunal Regional Federal da 3ª Região',
    'PE 045/2024',
    'TechSolutions Desenvolvimento Ltda',
    '12.345.678/0001-90',
    'Desenvolvimento de Sistema de Gestão de Contratos',
    '2024-08-01',
    '2025-08-01',
    'PREGAO_ELETRONICO',
    '[
        {
            "item": 1,
            "descricao": "Desenvolvimento do Sistema Base",
            "unidade": "UN",
            "quantidade": 1,
            "valor_unitario": 180000.00,
            "valor_total": 180000.00
        },
        {
            "item": 2,
            "descricao": "Licenças de Software",
            "unidade": "UN",
            "quantidade": 50,
            "valor_unitario": 500.00,
            "valor_total": 25000.00
        },
        {
            "item": 3,
            "descricao": "Treinamento de Usuários",
            "unidade": "HORA",
            "quantidade": 40,
            "valor_unitario": 150.00,
            "valor_total": 6000.00
        }
    ]',
    true
);

-- PDP para Projeto 2
INSERT INTO core.pdp (
    id_projeto,
    usuario_criacao,
    data_criacao,
    orgao_contratante,
    processo_pregao,
    empresa_adjudicada,
    cnpj_empresa,
    objeto,
    data_vigencia_inicio,
    data_vigencia_fim,
    tipo_fonte,
    tabela_itens,
    status
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Reforma do Auditório Principal'),
    'user.demo',
    CURRENT_TIMESTAMP,
    'Universidade Federal de São Paulo',
    'CC 012/2024',
    'Construtora Moderna S.A.',
    '98.765.432/0001-10',
    'Reforma de Auditório com Equipamentos Audiovisuais',
    '2024-09-01',
    '2025-01-01',
    'CONCORRENCIA',
    '[
        {
            "item": 1,
            "descricao": "Serviços de Reforma Civil",
            "unidade": "M2",
            "quantidade": 300,
            "valor_unitario": 800.00,
            "valor_total": 240000.00
        },
        {
            "item": 2,
            "descricao": "Sistema de Som Profissional",
            "unidade": "CONJUNTO",
            "quantidade": 1,
            "valor_unitario": 85000.00,
            "valor_total": 85000.00
        },
        {
            "item": 3,
            "descricao": "Projetor 4K com Tela Retrátil",
            "unidade": "CONJUNTO",
            "quantidade": 1,
            "valor_unitario": 35000.00,
            "valor_total": 35000.00
        },
        {
            "item": 4,
            "descricao": "Poltronas Ergonômicas",
            "unidade": "UN",
            "quantidade": 150,
            "valor_unitario": 450.00,
            "valor_total": 67500.00
        }
    ]',
    true
);

-- ========================================
-- INSERIR ETPs (Estudo Técnico Preliminar)
-- ========================================

-- ETP para Projeto 1
INSERT INTO core.etp (
    id_projeto,
    usuario_criacao,
    data_criacao,
    unidade_demandante,
    objeto_contratacao,
    sist_reg_preco,
    justificativa,
    alinhamento_estrategico,
    info_contratacao,
    previsto_pca,
    item_pca,
    req_contratacao,
    lev_mercado,
    solucao,
    quantidade_estimada,
    just_nao_parc,
    valor_total,
    demonst_resultados,
    serv_continuo,
    justif_serv_continuo,
    providencias,
    impac_ambientais,
    alinhamento_pls,
    posic_conclusivo,
    justif_posic_conclusivo,
    equipe_de_planejamento,
    status
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Sistema de Gestão de Contratos'),
    'user.demo',
    CURRENT_TIMESTAMP,
    'Diretoria de Tecnologia da Informação',
    'Desenvolvimento de Sistema de Gestão de Contratos com integração aos sistemas existentes',
    false,
    'Sistema atual é obsoleto, manual e não atende às demandas de transparência e eficiência exigidas',
    ARRAY['Modernização Tecnológica', 'Transparência Pública', 'Eficiência Operacional'],
    'Contratação de empresa especializada em desenvolvimento de sistemas para o setor público',
    true,
    125,
    ARRAY['Experiência comprovada em sistemas públicos', 'Certificação ISO 27001', 'Equipe técnica qualificada'],
    '{
        "pesquisa_mercado": "Foram consultadas 5 empresas especializadas",
        "preco_medio": 211000.00,
        "variacao_percentual": 15,
        "fontes": ["ComprasNet", "Painel de Preços", "Pesquisa direta"]
    }',
    'Sistema web responsivo com módulos de cadastro, gestão e relatórios de contratos',
    '{
        "desenvolvimento": {"horas": 2000, "valor_hora": 90},
        "licencas": {"quantidade": 50, "valor_unitario": 500},
        "treinamento": {"horas": 40, "valor_hora": 150}
    }',
    'Contratação não é passível de parcelamento devido à necessidade de integração completa dos módulos',
    'R$ 211.000,00',
    '{
        "economia_anual": 120000,
        "reducao_tempo_processos": 60,
        "melhoria_transparencia": "Acesso online a informações contratuais",
        "roi_meses": 18
    }',
    true,
    'Sistema requer manutenção e suporte contínuos para garantir funcionamento adequado',
    '{
        "pre_contratacao": ["Aprovação orçamentária", "Elaboração de TR"],
        "pos_contratacao": ["Acompanhamento técnico", "Treinamento usuários"],
        "cronograma": "6 meses para desenvolvimento + 3 meses para implantação"
    }',
    'Redução do uso de papel através da digitalização de processos',
    ARRAY['Governança Digital', 'Eficiência Administrativa'],
    true,
    'Contratação é tecnicamente viável, economicamente vantajosa e estrategicamente alinhada aos objetivos institucionais',
    'João Silva (Coordenador TI), Maria Santos (Analista de Sistemas), Pedro Costa (Arquiteto de Software)',
    true
);

-- ETP para Projeto 2
INSERT INTO core.etp (
    id_projeto,
    usuario_criacao,
    data_criacao,
    unidade_demandante,
    objeto_contratacao,
    sist_reg_preco,
    justificativa,
    alinhamento_estrategico,
    info_contratacao,
    previsto_pca,
    item_pca,
    req_contratacao,
    lev_mercado,
    solucao,
    quantidade_estimada,
    just_nao_parc,
    valor_total,
    demonst_resultados,
    serv_continuo,
    justif_serv_continuo,
    providencias,
    impac_ambientais,
    alinhamento_pls,
    posic_conclusivo,
    justif_posic_conclusivo,
    equipe_de_planejamento,
    status
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Reforma do Auditório Principal'),
    'user.demo',
    CURRENT_TIMESTAMP,
    'Diretoria de Infraestrutura',
    'Reforma completa do auditório principal com modernização dos equipamentos audiovisuais',
    false,
    'Auditório apresenta problemas estruturais, acústicos e equipamentos obsoletos que comprometem eventos institucionais',
    ARRAY['Modernização de Infraestrutura', 'Qualidade dos Serviços', 'Acessibilidade'],
    'Contratação de empresa especializada em reformas e fornecimento de equipamentos audiovisuais',
    true,
    087,
    ARRAY['Registro no CREA', 'Experiência em obras públicas', 'Atestados de capacidade técnica'],
    '{
        "pesquisa_mercado": "Consultadas 4 empresas do ramo",
        "preco_medio": 435000.00,
        "variacao_percentual": 12,
        "fontes": ["SINAPI", "Tabela SEINFRA", "Consulta mercado"]
    }',
    'Reforma estrutural completa com nova acústica, climatização, iluminação e sistema audiovisual digital',
    '{
        "area_reforma": {"m2": 300, "valor_m2": 800},
        "equipamentos_av": {"conjunto": 1, "valor": 85000},
        "mobiliario": {"poltronas": 150, "valor_unitario": 450}
    }',
    'Obra não pode ser parcelada pois comprometeria a funcionalidade e integridade estrutural do auditório',
    'R$ 427.500,00',
    '{
        "capacidade_eventos": "Aumento de 50% na capacidade",
        "qualidade_acustica": "Redução de 80% na reverberação",
        "economia_energia": "30% com nova iluminação LED",
        "acessibilidade": "100% conforme NBR 9050"
    }',
    false,
    'Obra com prazo definido de execução, sem necessidade de serviços contínuos',
    '{
        "pre_obra": ["Projeto executivo", "Licenças ambientais", "Licitação"],
        "durante_obra": ["Fiscalização técnica", "Controle de qualidade"],
        "pos_obra": ["Testes de equipamentos", "Treinamento operacional"]
    }',
    'Destinação adequada de resíduos de construção e uso de materiais sustentáveis quando possível',
    ARRAY['Infraestrutura de Qualidade', 'Sustentabilidade Ambiental'],
    true,
    'Reforma é essencial para manter a funcionalidade do espaço e atender às demandas institucionais com qualidade',
    'Ana Oliveira (Engenheira Civil), Carlos Mendes (Arquiteto), Lucia Ferreira (Gestora de Projetos)',
    true
);

-- ========================================
-- INSERIR PGRs (Plano de Gerenciamento de Riscos)
-- ========================================

-- PGR para Projeto 1
INSERT INTO core.pgr (
    id_projeto,
    id_solucao,
    usuario,
    data_criacao,
    objeto,
    risco
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Sistema de Gestão de Contratos'),
    (SELECT id_solucao FROM core.solucao_identificada WHERE nome = 'Plataforma Web de Gestão de Contratos'),
    'user.demo',
    CURRENT_TIMESTAMP,
    'Desenvolvimento de Sistema de Gestão de Contratos',
    '{
        "riscos_identificados": [
            {
                "id": 1,
                "categoria": "TECNICO",
                "descricao": "Dificuldades na integração com sistemas legados",
                "probabilidade": "MEDIA",
                "impacto": "ALTO",
                "nivel_risco": "ALTO",
                "mitigacao": "Realizar análise detalhada dos sistemas existentes e criar APIs de integração",
                "responsavel": "Equipe Técnica",
                "prazo": "30 dias"
            },
            {
                "id": 2,
                "categoria": "CRONOGRAMA",
                "descricao": "Atraso na entrega do projeto",
                "probabilidade": "MEDIA",
                "impacto": "MEDIO",
                "nivel_risco": "MEDIO",
                "mitigacao": "Implementar metodologia ágil com entregas incrementais",
                "responsavel": "Gerente de Projeto",
                "prazo": "Contínuo"
            },
            {
                "id": 3,
                "categoria": "OPERACIONAL",
                "descricao": "Resistência dos usuários ao novo sistema",
                "probabilidade": "ALTA",
                "impacto": "MEDIO",
                "nivel_risco": "ALTO",
                "mitigacao": "Programa intensivo de treinamento e comunicação",
                "responsavel": "Equipe de Mudança",
                "prazo": "60 dias"
            }
        ],
        "matriz_probabilidade_impacto": {
            "muito_baixo": {"probabilidade": "0-10%", "impacto": "Insignificante"},
            "baixo": {"probabilidade": "11-30%", "impacto": "Menor"},
            "medio": {"probabilidade": "31-60%", "impacto": "Moderado"},
            "alto": {"probabilidade": "61-80%", "impacto": "Maior"},
            "muito_alto": {"probabilidade": "81-100%", "impacto": "Catastrófico"}
        },
        "plano_monitoramento": {
            "frequencia_revisao": "Quinzenal",
            "responsavel_geral": "João Silva",
            "comite_riscos": ["João Silva", "Maria Santos", "Pedro Costa"],
            "ferramentas": ["Dashboard de riscos", "Reuniões de acompanhamento"]
        }
    }'
);

-- -- PGR para Projeto 2
INSERT INTO core.pgr (
    id_projeto,
    id_solucao,
    usuario,
    data_criacao,
    objeto,
    risco
) VALUES (
    (SELECT id_projeto FROM core.projeto WHERE nome = 'Reforma do Auditório Principal'),
    (SELECT id_solucao FROM core.solucao_identificada WHERE nome = 'Reforma Completa com Tecnologia Integrada'),
    'user.demo',
    CURRENT_TIMESTAMP,
    'Reforma do Auditório Principal com Modernização',
    '{
        "riscos_identificados": [
            {
                "id": 1,
                "categoria": "ESTRUTURAL",
                "descricao": "Descoberta de problemas estruturais não previstos",
                "probabilidade": "MEDIA",
                "impacto": "ALTO",
                "nivel_risco": "ALTO",
                "mitigacao": "Realizar sondagem detalhada antes do início da obra",
                "responsavel": "Engenheiro Responsável",
                "prazo": "15 dias"
            },
            {
                "id": 2,
                "categoria": "FORNECIMENTO",
                "descricao": "Atraso na entrega de equipamentos audiovisuais",
                "probabilidade": "MEDIA",
                "impacto": "MEDIO",
                "nivel_risco": "MEDIO",
                "mitigacao": "Contratar fornecedor com estoque disponível e prazo garantido",
                "responsavel": "Coordenador de Suprimentos",
                "prazo": "Antes da contratação"
            },
            {
                "id": 3,
                "categoria": "AMBIENTAL",
                "descricao": "Impacto de ruído nas atividades acadêmicas",
                "probabilidade": "ALTA",
                "impacto": "BAIXO",
                "nivel_risco": "MEDIO",
                "mitigacao": "Programar trabalhos ruidosos fora do horário de aulas",
                "responsavel": "Coordenador da Obra",
                "prazo": "Diário"
            },
            {
                "id": 4,
                "categoria": "ORCAMENTARIO",
                "descricao": "Variação de preços de materiais durante a execução",
                "probabilidade": "MEDIA",
                "impacto": "MEDIO",
                "nivel_risco": "MEDIO",
                "mitigacao": "Incluir cláusula de reajuste baseada em índices oficiais",
                "responsavel": "Gestor do Contrato",
                "prazo": "Na elaboração do contrato"
            }
        ],
        "matriz_probabilidade_impacto": {
            "muito_baixo": {"probabilidade": "0-10%", "impacto": "Sem impacto significativo"},
            "baixo": {"probabilidade": "11-30%", "impacto": "Pequenos ajustes"},
            "medio": {"probabilidade": "31-60%", "impacto": "Replanejamento necessário"},
            "alto": {"probabilidade": "61-80%", "impacto": "Grandes alterações"},
            "muito_alto": {"probabilidade": "81-100%", "impacto": "Inviabilização do projeto"}
        },
        "plano_monitoramento": {
            "frequencia_revisao": "Semanal",
            "responsavel_geral": "Ana Oliveira",
            "comite_riscos": ["Ana Oliveira", "Carlos Mendes", "Lucia Ferreira"],
            "ferramentas": ["Inspeções de campo", "Relatórios de progresso", "Reuniões de obra"]
        }
    }'
);