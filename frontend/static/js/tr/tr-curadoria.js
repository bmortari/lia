    import { getProjectIdFromUrl } from "/static/js/utils/getProject.js";

    // ✅ FUNÇÃO AUXILIAR: Obter token de autenticação
    function obterTokenAutenticacao() {
        // Tenta buscar token em várias fontes
        const tokenLocalStorage = localStorage.getItem('access_token') || localStorage.getItem('token');
        const tokenSessionStorage = sessionStorage.getItem('access_token') || sessionStorage.getItem('token');
        
        // Função para buscar cookie por nome
        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }
        
        const tokenCookie = getCookie('access_token') || getCookie('token') || getCookie('auth_token');
        
        return tokenLocalStorage || tokenSessionStorage || tokenCookie;
    }

    // ✅ FUNÇÃO AUXILIAR: Fazer requisição com autenticação
    async function fazerRequisicaoAutenticada(url, options = {}) {
        const token = obterTokenAutenticacao();
        
        // Configuração base da requisição
        const requestConfig = {
            ...options,
            credentials: 'include', // Inclui cookies automaticamente
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            }
        };
        
        // Se tiver token, adiciona ao header Authorization
        if (token) {
            requestConfig.headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('Fazendo requisição com config:', requestConfig);
        
        try {
            const response = await fetch(url, requestConfig);
            
            // Se retornar 401, tenta sem token (talvez use só cookies)
            if (response.status === 401 && token) {
                console.log('Tentativa com token falhou, tentando só com cookies...');
                delete requestConfig.headers['Authorization'];
                return await fetch(url, requestConfig);
            }
            
            return response;
            
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }

document.addEventListener('DOMContentLoaded', function () {
    console.log('🔄 tr-curadoria.js v2.0 carregado');

    const salvarButton = document.getElementById('salvar-alteracoes');
    const addItemBtn = document.getElementById('add-item-btn');
    const itemsContainer = document.getElementById('items-container');
    const adotaSrpCheckbox = document.getElementById('adota-srp');
    const projectId = getProjectIdFromUrl();

    // Event listener para botões de edição
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-btn')) {
            e.preventDefault();
            const button = e.target.closest('.edit-btn');
            const targetId = button.getAttribute('data-target');

            // Verificar se está desabilitado
            let isCurrentlyDisabled;
            if (targetId === 'items-section') {
                const firstInput = document.querySelector('#items-container .editable-content');
                isCurrentlyDisabled = firstInput ? firstInput.disabled : true;
            } else {
                const targetElement = document.getElementById(targetId);
                if (!targetElement) {
                    console.warn(`Elemento com ID ${targetId} não encontrado`);
                    return;
                }
                isCurrentlyDisabled = targetElement.disabled;
            }

            if (isCurrentlyDisabled) {
                // Habilitar edição
                habilitarEdicao(targetId, button);
            } else {
                // Desabilitar edição
                desabilitarEdicao(targetId, button);
            }
        }
    });

    // Função para habilitar edição
    function habilitarEdicao(targetId, button) {
        if (targetId === 'items-section') {
            // Habilitar seção de itens
            document.querySelectorAll('#items-container .editable-content').forEach(field => {
                field.disabled = false;
            });
            const addItemBtn = document.getElementById('add-item-btn');
            if (addItemBtn) addItemBtn.disabled = false;
            // Mostrar botões de remoção se existirem (já visíveis)
        } else {
            // Campo normal ou específico
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.disabled = false;
                targetElement.focus();
            }
            // Para campos SRP, habilitar checkbox se necessário
            if (targetId.startsWith('srp-')) {
                const adotaSrp = document.getElementById('adota-srp');
                if (adotaSrp) adotaSrp.disabled = false;
            }
        }

        button.innerHTML = '<i class="las la-save mr-1"></i>Salvar';
    }

    // Função para desabilitar edição
    function desabilitarEdicao(targetId, button) {
        if (targetId === 'items-section') {
            // Desabilitar seção de itens
            document.querySelectorAll('#items-container .editable-content').forEach(field => {
                field.disabled = true;
            });
            const addItemBtn = document.getElementById('add-item-btn');
            if (addItemBtn) addItemBtn.disabled = true;
        } else {
            // Campo normal ou específico
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.disabled = true;
            }
            // Para campos SRP, desabilitar checkbox
            if (targetId.startsWith('srp-')) {
                const adotaSrp = document.getElementById('adota-srp');
                if (adotaSrp) adotaSrp.disabled = true;
            }
        }

        button.innerHTML = '<i class="las la-edit mr-1"></i>Editar';
    }


    // --- LÓGICA DO SISTEMA DE REGISTRO DE PREÇOS (SRP) ---
    function toggleSrpFields() {
        const srpContainer = document.querySelector('.srp-fields-container');
        if (adotaSrpCheckbox && srpContainer) {
            srpContainer.style.display = adotaSrpCheckbox.checked ? 'block' : 'none';
        }
    }
    if (adotaSrpCheckbox) {
        adotaSrpCheckbox.addEventListener('change', toggleSrpFields);
        toggleSrpFields(); // Garante o estado inicial correto ao carregar a página
    }


    // --- LÓGICA DE GERENCIAMENTO DE ITENS ---
    function calculateItemTotal(itemRow) {
        const quantidade = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
        const valorUnitario = parseFloat(itemRow.querySelector('.item-valor-unitario').value) || 0;
        const valorTotalInput = itemRow.querySelector('.item-valor-total');
        if (valorTotalInput) {
            valorTotalInput.value = (quantidade * valorUnitario).toFixed(2);
        }
    }

    if (addItemBtn) {
        addItemBtn.addEventListener('click', function () {
            const newItemRow = document.createElement('div');
            newItemRow.className = 'p-4 border rounded-md item-row space-y-2 border-gray-200';
            // Usa o template HTML corrigido e completo para novos itens
            newItemRow.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" value="" placeholder="Descrição do item" class="p-2 border-gray-300 border rounded-md item-description focus:ring-primary focus:border-primary">
                    <input type="text" value="" placeholder="Código CATMAT/CATSER" class="p-2 border-gray-300 border rounded-md item-codigo focus:ring-primary focus:border-primary">
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input type="number" value="" placeholder="Qtd." class="p-2 border-gray-300 border rounded-md item-quantity focus:ring-primary focus:border-primary" min="1" step="0.001">
                    <input type="text" value="" placeholder="Unidade" class="p-2 border-gray-300 border rounded-md item-unidade focus:ring-primary focus:border-primary">
                    <input type="number" value="" placeholder="Valor Unit." class="p-2 border-gray-300 border rounded-md item-valor-unitario focus:ring-primary focus:border-primary" step="0.01">
                    <input type="number" value="" placeholder="Valor Total" class="p-2 border-gray-300 border rounded-md bg-gray-100 item-valor-total" disabled>
                </div>
                <textarea class="item-especificacoes p-2 w-full border-gray-300 border rounded-md focus:ring-primary focus:border-primary resize-none" rows="3" placeholder="Especificações Técnicas (uma por linha)"></textarea>
                <div class="flex justify-between items-start gap-3">
                    <textarea class="item-finalidade flex-grow p-2 border-gray-300 border rounded-md focus:ring-primary focus:border-primary resize-none" rows="2" placeholder="Finalidade"></textarea>
                    <button type="button" class="text-red-500 hover:text-red-700 remove-item-btn self-center"><i class="las la-trash-alt text-2xl"></i></button>
                </div>
            `;
            itemsContainer.appendChild(newItemRow);
        });
    }

    // Event Delegation para remover itens e calcular totais
    itemsContainer.addEventListener('click', function (e) {
        if (e.target.closest('.remove-item-btn')) {
            e.target.closest('.item-row').remove();
        }
    });

    itemsContainer.addEventListener('input', function (e) {
        if (e.target.matches('.item-quantity, .item-valor-unitario')) {
            const itemRow = e.target.closest('.item-row');
            calculateItemTotal(itemRow);
        }
    });
    
    // Calcula totais iniciais
    document.querySelectorAll('.item-row').forEach(calculateItemTotal);


    // --- LÓGICA PRINCIPAL DE SALVAR ---
    async function saveChanges() {
        if (!projectId) return;
        console.log('💾 Salvando alterações do TR para o projeto:', projectId);

        // Helper para pegar valor de arrays em textareas
        const getArrayFromTextarea = (id) => {
            const element = document.getElementById(id);
            return element ? element.value.split('\n').map(line => line.trim()).filter(line => line) : [];
        };

        const formData = {
            // Informações Básicas
            orgao_contratante: document.getElementById('orgao-contratante').value || '',
            tipo_contratacao: document.querySelector('input[name="tipo-contratacao"]:checked')?.value || null,
            objeto_contratacao: document.getElementById('objeto-contratacao').value || '',
            descricao_solucao: document.getElementById('descricao-solucao').value || '',
            modalidade_licitacao: document.querySelector('input[name="modalidade-licitacao"]:checked')?.value || null,
            fundamentacao_legal: document.getElementById('fundamentacao-legal').value || '',

            // Requisitos da Contratação
            requisitos_contratacao: {
                sustentabilidade: document.getElementById('sustentabilidade').value || '',
                indicacao_marcas: document.getElementById('indicacao-marcas').value || '',
                vedacao_marca_produto: document.getElementById('vedacao-marca-produto').value || '',
                garantia_produto_servico: document.getElementById('garantia-produto-servico').value || '',
                exige_amostra: document.getElementById('exige-amostra').checked,
                exige_carta_solidariedade: document.getElementById('exige-carta-solidariedade').checked,
                exige_vistoria: document.getElementById('exige-vistoria').checked
            },

            // Modelo de Execução
            modelo_execucao: {
                condicoes_entrega: document.getElementById('condicoes-entrega').value || '',
                garantia_manutencao: document.getElementById('garantia-manutencao').value || '',
                materiais_fornecidos: null, // Campo não presente no HTML, pode ser adicionado se necessário
                informacoes_proposta: null // Campo não presente no HTML, pode ser adicionado se necessário
            },

            // Prazos e Local
            prazo_vigencia_contrato: document.getElementById('prazo-vigencia').value || '',
            prazo_entrega_prestacao: document.getElementById('prazo-entrega').value || '',
            local_entrega_prestacao: document.getElementById('local-entrega').value || '',

            // Obrigações
            obrigacoes_contratante: document.getElementById('obrigacoes-contratante').value.split('\n').filter(line => line.trim()),
            obrigacoes_contratada: document.getElementById('obrigacoes-contratada').value.split('\n').filter(line => line.trim()),

            // Gestão do Contrato
            gestao_contrato: {
                modelo_gestao: document.getElementById('modelo-gestao').value || '',
                papeis_responsabilidades: document.getElementById('papeis-responsabilidades').value || ''
            },
            
            // Critérios de Pagamento
            criterios_pagamento: {
                 recebimento_objeto: document.getElementById('recebimento-objeto').value || '',
                 liquidacao: document.getElementById('liquidacao').value || '',
                 prazo_pagamento: document.getElementById('prazo-pagamento').value || '',
                 forma_pagamento: "Ordem Bancária/SIAFI", // Assumindo valor fixo ou adicione um campo <select>
                 antecipacao_pagamento: false, // Adicionar checkbox se necessário
                 cessao_credito: '' // Adicionar campo se necessário
            },
            condicoes_pagamento: document.getElementById('condicoes-pagamento').value || '',

            // Seleção do Fornecedor
            selecao_fornecedor: {
                forma_selecao: document.getElementById('forma-selecao').value || '',
                criterio_julgamento: document.getElementById('criterio-julgamento-selecao').value || '',
                exigencias_habilitacao: {
                    juridica: getArrayFromTextarea('habilitacao-juridica'), // IDs precisam ser adicionados no HTML
                    fiscal_trabalhista: getArrayFromTextarea('habilitacao-fiscal'),
                    economico_financeira: getArrayFromTextarea('habilitacao-economico'),
                    tecnica: getArrayFromTextarea('habilitacao-tecnica')
                }
            },

            // Estimativa de Valor e Adequação Orçamentária
            estimativa_valor: {
                valor_total: parseFloat(document.getElementById('valor-total-estimado').value) || null,
                valor_unitario: null, // Para itens únicos, não aplicável com múltiplos itens
                metodologia_pesquisa: document.getElementById('metodologia-pesquisa').value || ''
            },
            adequacao_orcamentaria: {
                fonte_recursos: document.getElementById('fonte-recursos').value || '',
                classificacao_orcamentaria: document.getElementById('classificacao-orcamentaria').value || '',
                previsao_pca: document.getElementById('previsao-pca').checked,
                codigo_pca: null // Adicionar campo se necessário
            },

            // Sistema de Registro de Preços (coletado condicionalmente)
            sistema_registro_precos: null,

            // Disposições Gerais
            sancoes_administrativas: document.getElementById('sancoes-administrativas').value || '',
            admite_subcontratacao: document.getElementById('admite-subcontratacao').checked,
            exige_garantia_contratual: document.getElementById('exige-garantia').checked,

            // Responsável
            responsavel: document.getElementById('responsavel').value || '',
            cargo_responsavel: document.getElementById('cargo-responsavel').value || '',
            
            // Itens
            itens: []
        };

        // Coleta condicional do SRP
        if (adotaSrpCheckbox.checked) {
            formData.sistema_registro_precos = {
                adota_srp: true,
                tipo_srp: document.querySelector('.srp-fields-container textarea')?.value || '',
                quantidade_maxima: false, // Adicionar checkbox se necessário
                quantidade_minima_cotacao: '', // Adicionar campo se necessário
                permite_precos_diferentes: false, // Adicionar checkbox se necessário
                justificativa_precos_diferentes: '', // Adicionar campo se necessário
                permite_proposta_inferior: false, // Adicionar checkbox se necessário
                criterio_julgamento: document.querySelector('.srp-fields-container select')?.value || 'item',
                registro_limitado: false, // Adicionar checkbox se necessário
                criterio_reajuste: null, // Adicionar campo se necessário
                vigencia_ata: document.querySelector('.srp-fields-container input[type="text"]')?.value || ''
            };
        }

        // Coleta de Itens
        document.querySelectorAll('.item-row').forEach(row => {
            const descricao = row.querySelector('.item-description').value.trim();
            if (descricao) {
                formData.itens.push({
                    descricao: descricao,
                    especificacoes_tecnicas: (row.querySelector('.item-especificacoes').value || '').split('\n').map(s => s.trim()).filter(Boolean),
                    quantidade: parseFloat(row.querySelector('.item-quantity').value) || 0,
                    valor_unitario: parseFloat(row.querySelector('.item-valor-unitario').value) || 0,
                    valor_total: parseFloat(row.querySelector('.item-valor-total').value) || 0,
                    unidade_medida: row.querySelector('.item-unidade').value.trim(),
                    codigo_catmat_catser: row.querySelector('.item-codigo').value.trim(),
                    finalidade: row.querySelector('.item-finalidade').value.trim()
                });
            }
        });

        console.log('📤 Enviando dados atualizados:', JSON.stringify(formData, null, 2));

        try {
            const response = await fazerRequisicaoAutenticada(`/projetos/${projectId}/tr`, {
                method: 'PATCH',
                headers: {
                    'remote-user': 'user.test',
                    'remote-groups': 'TI,OUTROS'
                },
                body: JSON.stringify(formData)
            })

            if(response.ok) {
                const trAtualizado = await response.json();
                console.log('✅ Alterações salvas:', trAtualizado);
                alert('Alterações salvas com sucesso!');    
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Erro na resposta da API:', response.status, errorData);

                if (response.status === 401) {
                    exibirAlerta(
                        'Erro de Autenticação', 
                        'Você não está autenticado. Por favor, faça login novamente.', 
                        'error'
                    );
                } else if (response.status === 403) {
                    exibirAlerta(
                        'Erro de Permissão', 
                        'Você não tem permissão para editar este TR.', 
                        'error'
                    );
                } else if (response.status == 422) {
                    exibirAlerta(
                        'Erro ao Salvar',
                        '',
                        'error'
                    );
                } 
            }
        } catch (error) {
            console.error('❌ Erro ao salvar alterações:', error);
            alert('Erro ao salvar alterações: ' + error.message);
        }
    }

    if (salvarButton) {
        salvarButton.addEventListener('click', saveChanges);
    }
    
    // Botão para visualizar resultado
    const visualizarBtn = document.getElementById('visualizar-resultado');
    if (visualizarBtn && projectId) {
        visualizarBtn.addEventListener('click', function() {
            window.location.href = `/projetos/${projectId}/visualizacao_tr`;
        });
    }
});