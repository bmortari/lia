import { getProjectIdFromUrl } from "../utils/projeto/getProject.js";
import { fazerRequisicaoAutenticada } from "../utils/auth/auth.js";

document.addEventListener('DOMContentLoaded', function () {

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

    const permitePrecosDiferentesSim = document.getElementById('permite_precos_diferentes_sim');
    const permitePrecosDiferentesNao = document.getElementById('permite_precos_diferentes_nao');
    const justificativaContainer = document.getElementById('justificativa_precos_diferentes_container');

    function toggleJustificativa() {
        if (permitePrecosDiferentesSim.checked) {
            justificativaContainer.classList.remove('hidden');
        } else {
            justificativaContainer.classList.add('hidden');
        }
    }

    if(permitePrecosDiferentesSim && permitePrecosDiferentesNao){
        permitePrecosDiferentesSim.addEventListener('change', toggleJustificativa);
        permitePrecosDiferentesNao.addEventListener('change', toggleJustificativa);
        toggleJustificativa();
    }

    // --- LÓGICA DO CÓDIGO PCA ---
    const previsaoPcaCheckbox = document.getElementById('previsao-pca');
    const codigoPcaContainer = document.getElementById('codigo-pca-container');

    function toggleCodigoPcaField() {
        if (codigoPcaContainer) {
            if (previsaoPcaCheckbox.checked) {
                codigoPcaContainer.classList.remove('hidden');
            } else {
                codigoPcaContainer.classList.add('hidden');
            }
        }
    }

    if (previsaoPcaCheckbox) {
        previsaoPcaCheckbox.addEventListener('change', toggleCodigoPcaField);
        toggleCodigoPcaField(); // Estado inicial
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
            newItemRow.className = 'p-4 border border-gray-200 rounded-md item-row flex items-start gap-4';
            // Usa o template HTML corrigido e completo para novos itens
            newItemRow.innerHTML = `
            <div class="space-y-2 flex-grow">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Descrição do item</label>
                        <input type="text" value="" placeholder="Descrição do item" class="p-2 border-gray-300 border rounded-md item-description focus:ring-primary focus:border-primary editable-content w-full">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Código CATMAT/CATSER</label>
                        <input type="text" value="" placeholder="Código CATMAT/CATSER" class="p-2 border-gray-300 border rounded-md item-codigo focus:ring-primary focus:border-primary editable-content w-full">
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                        <input type="number" value="" placeholder="Qtd." class="p-2 border-gray-300 border rounded-md item-quantity focus:ring-primary focus:border-primary editable-content w-full" min="1" step="0.001">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Unidade de medida</label>
                        <input type="text" value="" placeholder="Unidade" class="p-2 border-gray-300 border rounded-md item-unidade focus:ring-primary focus:border-primary editable-content w-full">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Valor Unitário</label>
                        <input type="number" value="" placeholder="Valor Unit." class="p-2 border-gray-300 border rounded-md item-valor-unitario focus:ring-primary focus:border-primary editable-content w-full" step="0.01">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
                        <input type="number" value="" placeholder="Valor Total" class="p-2 border-gray-300 border rounded-md bg-gray-100 item-valor-total w-full" disabled>
                    </div>
                </div>
            </div>
            <div>
                <button type="button" class="text-red-500 hover:text-red-700 remove-item-btn"><i class="las la-trash-alt text-2xl"></i></button>
            </div>
            `;
            itemsContainer.appendChild(newItemRow);
        });
    }

    // Event Delegation para remover itens e calcular totais
    if (itemsContainer) {
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
    }
    
    // Calcula totais iniciais
    document.querySelectorAll('.item-row').forEach(calculateItemTotal);

    // --- LÓGICA PARA HABILITAÇÃO E OBRIGAÇÕES ---
    function criarLinhaInput(container, placeholder, valor = '', rowClass, inputClass, removeBtnClass) {
        const div = document.createElement('div');
        div.className = `flex items-center gap-3 p-2 border border-gray-200 rounded-md ${rowClass}`;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = valor;
        input.placeholder = placeholder;
        input.className = `flex-grow p-2 border-gray-300 focus:border-primary focus:ring-primary border rounded-md ${inputClass}`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = `text-red-500 hover:text-red-700 ${removeBtnClass}`;
        removeBtn.innerHTML = '<i class="las la-trash-alt text-xl"></i>';

        div.appendChild(input);
        div.appendChild(removeBtn);
        container.appendChild(div);
    }

    document.getElementById('add-juridica-btn')?.addEventListener('click', () => {
        criarLinhaInput(document.getElementById('habilitacao-juridica-container'), 'Habilitação Jurídica', '', 'habilitacao-row', 'habilitacao-input', 'remove-habilitacao-btn');
    });
    document.getElementById('add-fiscal-btn')?.addEventListener('click', () => {
        criarLinhaInput(document.getElementById('habilitacao-fiscal-container'), 'Habilitação Fiscal e Trabalhista', '', 'habilitacao-row', 'habilitacao-input', 'remove-habilitacao-btn');
    });
    document.getElementById('add-economico-btn')?.addEventListener('click', () => {
        criarLinhaInput(document.getElementById('habilitacao-economico-container'), 'Habilitação Econômico-Financeira', '', 'habilitacao-row', 'habilitacao-input', 'remove-habilitacao-btn');
    });
    document.getElementById('add-tecnica-btn')?.addEventListener('click', () => {
        criarLinhaInput(document.getElementById('habilitacao-tecnica-container'), 'Habilitação Técnica', '', 'habilitacao-row', 'habilitacao-input', 'remove-habilitacao-btn');
    });
    document.getElementById('add-obrigacao-contratante-btn')?.addEventListener('click', () => {
        criarLinhaInput(document.getElementById('obrigacoes-contratante-container'), 'Obrigação do Contratante', '', 'obrigacao-row', 'obrigacao-input', 'remove-obrigacao-btn');
    });
    document.getElementById('add-obrigacao-contratada-btn')?.addEventListener('click', () => {
        criarLinhaInput(document.getElementById('obrigacoes-contratada-container'), 'Obrigação da Contratada', '', 'obrigacao-row', 'obrigacao-input', 'remove-obrigacao-btn');
    });

    // Delegação de evento para remoção
    document.querySelector('.max-w-4xl.mx-auto.space-y-6').addEventListener('click', function(e) {
        if (e.target.closest('.remove-habilitacao-btn')) {
            e.target.closest('.habilitacao-row').remove();
        }
        if (e.target.closest('.remove-obrigacao-btn')) {
            e.target.closest('.obrigacao-row').remove();
        }
    });

    // --- LÓGICA PARA AVALIAÇÃO ---
    const avaliacaoGroup = document.getElementById('avaliacao-group');
    if (avaliacaoGroup) {
        const radios = avaliacaoGroup.querySelectorAll('input[type="radio"]');
        const textInputs = {
            instrumento_medicao_resultado: avaliacaoGroup.querySelector('input[name="avaliacao_anexo"]'),
            outro_instrumento: avaliacaoGroup.querySelector('input[name="avaliacao_instrumento"]'),
            disposto_item: avaliacaoGroup.querySelector('input[name="avaliacao_descricao_item"]'),
        };

        function handleAvaliacaoChange() {
            const selectedRadio = avaliacaoGroup.querySelector('input[type="radio"]:checked');
            
            // Desabilita todos
            Object.values(textInputs).forEach(input => {
                if(input) input.disabled = true;
            });

            // Habilita o correto
            if (selectedRadio) {
                const inputToEnable = textInputs[selectedRadio.value];
                if (inputToEnable) {
                    inputToEnable.disabled = false;
                }
            }
        }

        radios.forEach(radio => radio.addEventListener('change', handleAvaliacaoChange));
        
        // Estado inicial
        handleAvaliacaoChange();
    }


    // --- LÓGICA PRINCIPAL DE SALVAR ---
    async function saveChanges() {
        if (!projectId) return;
        console.log('💾 Salvando alterações do TR para o projeto:', projectId);

        // Helper para pegar valor de arrays em textareas
        const getArrayFromTextarea = (id) => {
            const element = document.getElementById(id);
            return element ? element.value.split('\n').map(line => line.trim()).filter(line => line) : [];
        };

        // Helper para pegar valor de arrays de inputs
        const getArrayFromInputs = (containerId, inputClass) => {
            const container = document.getElementById(containerId);
            if (!container) return [];
            const inputs = container.querySelectorAll(`.${inputClass}`);
            return Array.from(inputs).map(input => input.value.trim()).filter(value => value);
        };

        const fundamentacaoLegalInput = document.getElementById('fundamentacao-legal');
        const vedacaoMarcaProdutoEl = document.getElementById('vedacao-marca-produto');
        const condicoesExecucaoEl = document.getElementById('condicoes-execucao');
        const materiaisDisponibilizadosEl = document.getElementById('materiais-disponibilizados');
        const informacoesRelevantesEl = document.getElementById('informacoes-relevantes');
        const prazoProvisorioRecebimentoEl = document.getElementById('prazo-provisorio-recebimento');
        const prazoDefinitivoRecebimentoEl = document.getElementById('prazo-definitivo-recebimento'); 

        const fundamentacaoLegal = fundamentacaoLegalInput ? fundamentacaoLegalInput.value : '';
        const vedacaoMarcaProduto = vedacaoMarcaProdutoEl ? vedacaoMarcaProdutoEl.value : '';
        const condicoesExecucao = condicoesExecucaoEl ? condicoesExecucaoEl.value : '';
        const materiaisDisponibilizados = materiaisDisponibilizadosEl ? materiaisDisponibilizadosEl.value : '';
        const informacoesRelevantes = informacoesRelevantesEl ? informacoesRelevantesEl.value : '';
        const prazoProvisorioRecebimento = prazoProvisorioRecebimentoEl ? prazoProvisorioRecebimentoEl.value : '';
        const prazoDefinitivoRecebimento = prazoDefinitivoRecebimentoEl ? prazoDefinitivoRecebimentoEl.value : '';

        const formData = {
            // Informações Básicas
            orgao_contratante: document.getElementById('orgao-contratante').value || '',
            tipo_contratacao: document.querySelector('input[name="tipo-contratacao"]:checked')?.value || null,
            objeto_contratacao: document.getElementById('objeto-contratacao').value || '',
            descricao_solucao: document.getElementById('descricao-solucao').value || '',
            modalidade_licitacao: document.querySelector('input[name="modalidade-licitacao"]:checked')?.value || null,
            fundamentacao_legal: fundamentacaoLegal,

            // Requisitos da Contratação
            requisitos_contratacao: {
                sustentabilidade: document.getElementById('sustentabilidade').value || '',
                indicacao_marcas: document.getElementById('indicacao-marcas').value || '',
                vedacao_marca_produto: vedacaoMarcaProduto,
                garantia_produto_servico: document.getElementById('garantia-produto-servico').value || '',
                exige_amostra: document.getElementById('exige-amostra').checked,
                exige_carta_solidariedade: document.getElementById('exige-carta-solidariedade').checked,
                exige_vistoria: document.getElementById('exige-vistoria').checked
            },

            // Modelo de Execução
            modelo_execucao: {
                condicoes_entrega: document.getElementById('condicoes-entrega').value || '',
                condicoes_execucao: condicoesExecucao,
                materiais_disponibilizados: materiaisDisponibilizados,
                informacoes_relevantes: informacoesRelevantes,
                garantia_manutencao: document.getElementById('garantia-manutencao').value || '',
                materiais_fornecidos: null, // Campo não presente no HTML, pode ser adicionado se necessário
                informacoes_proposta: null // Campo não presente no HTML, pode ser adicionado se necessário
            },

            // Prazos e Local
            prazo_vigencia_contrato: document.getElementById('prazo-vigencia').value || '',
            prazo_entrega_prestacao: document.getElementById('prazo-entrega').value || '',
            local_entrega_prestacao: document.getElementById('local-entrega').value || '',

            // Obrigações
            obrigacoes_contratante: getArrayFromInputs('obrigacoes-contratante-container', 'obrigacao-input'),
            obrigacoes_contratada: getArrayFromInputs('obrigacoes-contratada-container', 'obrigacao-input'),

            // Gestão do Contrato
            gestao_contrato: {
                modelo_gestao: document.getElementById('modelo-gestao').value || '',
                papeis_responsabilidades: document.getElementById('papeis-responsabilidades').value || ''
            },
            
            // Critérios de Pagamento
            criterios_pagamento: {
                 recebimento_objeto: document.getElementById('recebimento-objeto').value || '',
                 avaliacao: (() => {
                    const selectedRadio = document.querySelector('input[name="avaliacao-opcao"]:checked');
                    if (!selectedRadio) return null;

                    const criterio = selectedRadio.value;
                    let anexo = null;
                    let instrumento = null;
                    let descricao_item = null;

                    if (criterio === 'instrumento_medicao_resultado') {
                        anexo = document.querySelector('input[name="avaliacao_anexo"]').value;
                    } else if (criterio === 'outro_instrumento') {
                        instrumento = document.querySelector('input[name="avaliacao_instrumento"]').value;
                    } else if (criterio === 'disposto_item') {
                        descricao_item = document.querySelector('input[name="avaliacao_descricao_item"]').value;
                    }

                    return {
                        criterio: criterio,
                        anexo: anexo,
                        instrumento: instrumento,
                        descricao_item: descricao_item
                    };
                })(),
                 liquidacao: document.getElementById('liquidacao').value || '',
                 prazo_pagamento: document.getElementById('prazo-pagamento').value || '',
                 forma_pagamento: document.getElementById('forma-pagamento').value || '',
                 antecipacao_pagamento: document.querySelector('input[name="antecipacao-pagamento"]:checked').value === 'true', // Adicionar checkbox se necessário
                 cessao_credito: '', // Adicionar campo se necessário
                 prazo_provisorio_recebimento: prazoProvisorioRecebimento,
                 prazo_definitivo_recebimento: prazoDefinitivoRecebimento
            },
            condicoes_pagamento: document.getElementById('condicoes-pagamento').value || '',

            // Seleção do Fornecedor
            selecao_fornecedor: {
                forma_selecao: document.getElementById('forma-selecao').value || '',
                criterio_julgamento: document.getElementById('criterio-julgamento-selecao').value || '',
                exigencias_habilitacao: {
                    juridica: getArrayFromInputs('habilitacao-juridica-container', 'habilitacao-input'),
                    fiscal_trabalhista: getArrayFromInputs('habilitacao-fiscal-container', 'habilitacao-input'),
                    economico_financeira: getArrayFromInputs('habilitacao-economico-container', 'habilitacao-input'),
                    tecnica: getArrayFromInputs('habilitacao-tecnica-container', 'habilitacao-input')
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
                codigo_pca: document.getElementById('previsao-pca').checked ? document.getElementById('codigo-pca').value : null
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
                // tipo_srp: document.getElementById('srp-tipo').value || '',
                quantidade_maxima: document.querySelector('input[name="quantidade_maxima"]:checked')?.value === 'true',
                quantidade_minima_cotacao: document.getElementById('quantidade_minima_cotacao').value || '',
                permite_precos_diferentes: document.querySelector('input[name="permite_precos_diferentes"]:checked')?.value === 'true',
                justificativa_precos_diferentes: document.getElementById('justificativa_precos_diferentes').value || '',
                permite_proposta_inferior: document.querySelector('input[name="permite_proposta_inferior"]:checked')?.value === 'true',
                criterio_julgamento: document.getElementById('srp-criterio')?.value || 'item',
                registro_limitado: document.querySelector('input[name="registro_limitado"]:checked')?.value === 'true',
                criterio_reajuste: document.getElementById('criterio-reajuste').value || '',
                vigencia_ata: document.getElementById('srp-vigencia')?.value || ''
            };
        }

        // Coleta de Itens
        document.querySelectorAll('.item-row').forEach(row => {
            const descricao = row.querySelector('.item-description').value.trim();
            if (descricao) {
                formData.itens.push({
                    descricao: descricao,
                    especificacoes_tecnicas: [],
                    quantidade: parseFloat(row.querySelector('.item-quantity').value) || 0,
                    valor_unitario: parseFloat(row.querySelector('.item-valor-unitario').value) || 0,
                    valor_total: parseFloat(row.querySelector('.item-valor-total').value) || 0,
                    unidade_medida: row.querySelector('.item-unidade').value.trim(),
                    codigo_catmat_catser: row.querySelector('.item-codigo').value.trim(),
                    finalidade: ''
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