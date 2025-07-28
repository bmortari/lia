document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let contractsData = [];
    let currentContractId = null;

    // --- MOCK DATA ---
    const mockData = [
        {
        "orgao_contratante": "CÂMARA MUNICIPAL DE VARZEA PAULISTA/SP",
        "processo_pregao": "Processo Licitatório N° 21/2024 / Dispensa Eletrônica n° 22/2024",
        "empresa_adjudicada": "RT ENGENHARIA E CONSULTORIA LTDA",
        "cnpj_empresa": "42.792.118/0001-40",
        "objeto": "Contratação de empresa especializada em serviços na área de áudio, para elaboração de Projeto Básico de Sistema de Sonorização do Plenário para a Câmara Municipal de Várzea Paulista/SP, conforme condições, quantidades e exigências estabelecidas no Aviso de Contratação Direta e seus anexos.",
        "data_vigencia_inicio": "2024-10-20",
        "data_vigencia_fim": null,
        "tipo_fonte": "CONTRATO",
        "tabela_itens": [
            {
                "item": "1",
                "descricao_item": "Serviço de locação de equipamentos de audiovisual e sonorização juntamente com equipe técnica",
                "marca_modelo": "Não especificado",
                "unidade_medida": "Execução única",
                "quantidade": 3,
                "valor_unitario": 0.0
            }
        ]
    },
    {
        "orgao_contratante": "PREFEITURA DO MUNICÍPIO DE PIRACICABA",
        "processo_pregao": "Processo Administrativo n° 2024/8.300 / Pregão Eletrônico n.º 272/2024",
        "empresa_adjudicada": "PONTO ALTO SOM LTDA",
        "cnpj_empresa": "00.224.029/0001-57",
        "objeto": "A CONTRATADA se obriga a prestação dos serviços de sonorização dos itens 01 (03 unid.) e 02 (03 unid.), conforme descrição detalhada constante do Edital da Ata de Registro de Preços nº 370/2024, bem como seu Termo de Referência, o qual fica fazendo parte integrante do presente instrumento.",
        "data_vigencia_inicio": "2025-02-13",
        "data_vigencia_fim": "2025-12-31",
        "tipo_fonte": "CONTRATO",
        "tabela_itens": [
            {
                "item": "2.1",
                "descricao_item": "Serviços de sonorização",
                "marca_modelo": "Não especificado",
                "unidade_medida": "Unid",
                "quantidade": 2,
                "valor_unitario": 0.0
            }
        ]
    },
    {
        "orgao_contratante": "PREFEITURA DO MUNICÍPIO DE PIRACICABA",
        "processo_pregao": "Processo Administrativo n° 2024/8.300 / Pregão Eletrônico n.º 272/2024",
        "empresa_adjudicada": "PONTO ALTO SOM LTDA",
        "cnpj_empresa": "00.224.029/0001-57",
        "objeto": "A CONTRATADA se obriga a prestação dos serviços de sonorização do item 02 (02 unid.), conforme descrição detalhada constante do Edital da Ata de Registro de Preços nº 370/2024, bem como seu Termo de Referência, o qual fica fazendo parte integrante do presente instrumento.",
        "data_vigencia_inicio": "2025-05-27",
        "data_vigencia_fim": "2025-12-31",
        "tipo_fonte": "CONTRATO",
        "tabela_itens": [
            {
                "item": "2.1",
                "descricao_item": "Serviços de sonorização",
                "marca_modelo": "Não especificado",
                "unidade_medida": "Unid",
                "quantidade": 2,
                "valor_unitario": 0.0
            }
        ]
    },
    {
        "orgao_contratante": "CÂMARA MUNICIPAL DE LARANJAL PAULISTA",
        "processo_pregao": "Processo nº 040/2024 / DISPENSA ELETRÔNICA N° 0013/2024",
        "empresa_adjudicada": "ARCHITHEUS – ARQUITETURA E ENGENHARIA",
        "cnpj_empresa": "30.165.886/0001-94",
        "objeto": "Contratação de empresa especializada na elaboração de projeto técnico para instalação de equipamentos de sonorização e áudio visual no auditório, plenário e sala de reuniões da Câmara Municipal de Laranjal Paulista, com todo planejamento de montagem das instalações, como intervenções, tubulações, fiações e definição dos equipamentos em geral, descritos graficamente em desenhos técnicos e detalhadamente especificados em documentos complementares, bem como assessoramento técnico durante a licitação, acompanhamento e fiscalização durante a execução, conforme especificações e exigências descritas no ANEXO II – TERMO DE REFERÊNCIA.",
        "data_vigencia_inicio": "2025-01-06",
        "data_vigencia_fim": "2026-01-06",
        "tipo_fonte": "CONTRATO",
        "tabela_itens": [
            {
                "item": "1",
                "descricao_item": "Contratação de empresa especializada na elaboração de projeto técnico para instalação de equipamentos de sonorização e áudio visual no auditório, plenário e sala de reuniões da Câmara Municipal de Laranjal Paulista, com todo planejamento de montagem das instalações, como intervenções, tubulações, fiações e definição dos equipamentos em geral, descritos graficamente em desenhos técnicos e detalhadamente especificados em documentos complementares.",
                "marca_modelo": "Não especificado",
                "unidade_medida": "Não especificado",
                "quantidade": 1,
                "valor_unitario": 16000.0
            },
            {
                "item": "2",
                "descricao_item": "ASSESSORAMENTO E ANÁLISE TÉCNICA DURANTE O PROCESSO LICITATÓRIO para futura contratação, com emissão de pareces técnicos, se necessário. (ETAPA 3)",
                "marca_modelo": "Não especificado",
                "unidade_medida": "Não especificado",
                "quantidade": 1,
                "valor_unitario": 2000.0
            },
            {
                "item": "3",
                "descricao_item": "ACOMPANHAMENTO, FISCALIZAÇÃO E EMISSÃO DE LAUDOS PARA PAGAMENTOS DA FUTURA CONTRATADA E TERMO DE RECEBIMENTO DEFINITIVO. Ocorrerão de forma presencial, por meio da visita técnica, que foram ESTIMADAS e serão pagas se realmente realizadas. (ETAPA 4)",
                "marca_modelo": "Não especificado",
                "unidade_medida": "Não especificado",
                "quantidade": 6,
                "valor_unitario": 2000.0
            }
        ]
    },
    {
        "orgao_contratante": "CONSELHO REGIONAL DE FARMÁCIA DO ESTADO DE SÃO PAULO (CRF-SP)",
        "processo_pregao": "Pregão Eletrônico nº 90011/2025",
        "empresa_adjudicada": "AV PLAY SERVICOS E LOCACAO DE EQUIPAMENTOS PARA EVENTOS LTDA",
        "cnpj_empresa": "53.657.567/0001-00",
        "objeto": "contratação de empresa especializada em serviço de sonorização e equipamentos de audiovisual, juntamente com equipe técnica para o estande do CRF-SP durante a realização do 20º Congresso Consulfarma, nos dias 03 a 05 de julho de 2025 no “Distrito Anhembi\" na cidade de São Paulo, nas condições estabelecidas no Termo de Referência.",
        "data_vigencia_inicio": "2025-07-03",
        "data_vigencia_fim": "2025-08-05",
        "tipo_fonte": "CONTRATO",
        "tabela_itens": [
            {
                "item": "1",
                "descricao_item": "Serviço de locação de equipamentos de audiovisual e sonorização juntamente com equipe técnica",
                "marca_modelo": "Não especificado",
                "unidade_medida": "Execução única",
                "quantidade": 3,
                "valor_unitario": 0.0
            },
            {
                "item": "1",
                "descricao_item": "Locação de microfones sem fio – multifrequencial",
                "marca_modelo": "Shure, Sennheiser ou similar",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 500.0
            },
            {
                "item": "2",
                "descricao_item": "Locação de microfones head set",
                "marca_modelo": "Cardioide",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 250.0
            },
            {
                "item": "3",
                "descricao_item": "Amplificador de antena",
                "marca_modelo": "Não especificado",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 250.0
            },
            {
                "item": "4",
                "descricao_item": "Mesa de som",
                "marca_modelo": "Não especificado",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 2000.0
            },
            {
                "item": "5",
                "descricao_item": "Sistema de transmissão para palestra silenciosa com 30 receptores",
                "marca_modelo": "Não especificado",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 3000.0
            },
            {
                "item": "6",
                "descricao_item": "Painel de led - p3",
                "marca_modelo": "LED",
                "unidade_medida": "metros",
                "quantidade": 8,
                "valor_unitario": 437.5
            },
            {
                "item": "7",
                "descricao_item": "Switcher de vídeo",
                "marca_modelo": "Não especificado",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 1000.0
            },
            {
                "item": "8",
                "descricao_item": "Notebook",
                "marca_modelo": "HP",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 250.0
            },
            {
                "item": "9",
                "descricao_item": "Apresentador multimídia",
                "marca_modelo": "Logitech Presenter R800",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 100.0
            },
            {
                "item": "10",
                "descricao_item": "Operador de vídeo",
                "marca_modelo": "Não especificado",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 1500.0
            },
            {
                "item": "11",
                "descricao_item": "Operador de áudio",
                "marca_modelo": "Não especificado",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 2000.0
            },
            {
                "item": "12",
                "descricao_item": "Televisor 50 polegadas",
                "marca_modelo": "4k",
                "unidade_medida": "unidades",
                "quantidade": 0,
                "valor_unitario": 500.0
            },
        ]
    }
    ];

    // --- DOM ELEMENTS ---
    const contractsListEl = document.getElementById('contracts-list');
    const detailsContainerEl = document.getElementById('contract-details-container');
    const detailsPlaceholderEl = document.getElementById('details-placeholder');
    const itemsListEl = document.getElementById('items-list');

    // --- FUNCTIONS ---

    /**
     * Validates if the data has the expected structure.
     * @param {any} data - Data to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    const validateDataStructure = (data) => {
        if (!Array.isArray(data)) return false;
        
        // Verificar se pelo menos um item tem a estrutura esperada
        return data.some(item => 
            item && 
            typeof item === 'object' &&
            Array.isArray(item.tabela_itens)
        );
    };

    /**
     * Limpa os dados do formulario utilizados para logica interna.
     * @returns {Array} - JSON formatado.
     */
    const extrairDadosFormulario = () => {
        return contractsData.map(contract => {
            // Remove apenas o ID interno que foi criado para controle
            const cleanContract = { ...contract };
            delete cleanContract.id;
            
            // Limpar apenas os IDs internos dos itens, mantendo todos os outros campos
            cleanContract.tabela_itens = contract.tabela_itens.map(item => {
                const cleanItem = { ...item };
                delete cleanItem.id; // Remove apenas o ID interno
                return cleanItem;
            });
            
            return cleanContract;
        });
    };

    /**
     * Validates the form data before saving.
     * @returns {boolean} - True if valid, false otherwise
     */
    const validarFormulario = () => {
        // Verificar se há pelo menos um contrato
        if (!contractsData || contractsData.length === 0) {
            alert('Não há dados para salvar.');
            return false;
        }

        // Verificar se todos os contratos têm dados obrigatórios
        for (const contract of contractsData) {
            if (!contract.orgao_contratante || !contract.objeto) {
                alert('Todos os contratos devem ter órgão contratante e objeto preenchidos.');
                return false;
            }
        }

        return true;
    };

    /**
     * Saves the current state of an input field back to the data object.
     * @param {string} fieldName - The name of the field in the data object.
     * @param {any} value - The new value.
     * @param {number|null} itemId - The ID of the item if it's an item field.
     */
    const saveData = (fieldName, value, itemId = null) => {
        if (!currentContractId) return;

        const contract = contractsData.find(c => c.id === currentContractId);
        if (!contract) return;

        if (itemId) {
            const item = contract.tabela_itens.find(i => i.id === itemId);
            if (item) {
                item[fieldName] = value;
            }
        } else {
            contract[fieldName] = value;
        }
        console.log('Data saved:', contractsData);
    };

    /**
     * Populates the right-side form with data from the selected contract.
     * @param {object} contract - The contract data object.
     */
    const populateDetails = (contract) => {
        document.getElementById('orgao-contratante').value = contract.orgao_contratante;
        document.getElementById('processo-pregao').value = contract.processo_pregao;
        document.getElementById('empresa-adjudicada').value = contract.empresa_adjudicada;
        document.getElementById('cnpj-empresa').value = contract.cnpj_empresa;
        document.getElementById('objeto').value = contract.objeto;
        document.getElementById('data-vigencia-inicio').value = contract.data_vigencia_inicio;
        document.getElementById('data-vigencia-fim').value = contract.data_vigencia_fim;
        document.getElementById('tipo-fonte').value = contract.tipo_fonte;

        itemsListEl.innerHTML = ''; // Clear previous items
        contract.tabela_itens.forEach(item => {
            const itemCard = `
                <div class="p-4 border rounded-md space-y-4 bg-gray-50" data-item-id="${item.id}">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div class="flex flex-col space-y-1 md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700">N. Item</label>
                            <input type="text" value="${item.item}" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 cursor-not-allowed" disabled>
                        </div>
                        <div class="flex flex-col space-y-1 md:col-span-10">
                            <label class="block text-sm font-medium text-gray-700">Descrição</label>
                            <div class="flex items-center space-x-3">
                                <input type="text" value="${item.descricao_item}" data-field="descricao_item" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                                <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col space-y-1">
                        <label class="block text-sm font-medium text-gray-700">Marca/Modelo</label>
                        <div class="flex items-center space-x-3">
                            <input type="text" value="${item.marca_modelo}" data-field="marca_modelo" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                            <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="flex flex-col space-y-1">
                            <label class="block text-sm font-medium text-gray-700">Unidade Medida</label>
                            <div class="flex items-center space-x-3">
                                <input type="text" value="${item.unidade_medida}" data-field="unidade_medida" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                                <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                            </div>
                        </div>
                        <div class="flex flex-col space-y-1">
                            <label class="block text-sm font-medium text-gray-700">Quantidade</label>
                            <div class="flex items-center space-x-3">
                                <input type="number" value="${item.quantidade}" data-field="quantidade" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                                <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                            </div>
                        </div>
                        <div class="flex flex-col space-y-1">
                            <label class="block text-sm font-medium text-gray-700">Valor Unitário (R$)</label>
                            <div class="flex items-center space-x-3">
                                <input type="text" value="${parseFloat(item.valor_unitario).toFixed(2).replace('.', ',')}" data-field="valor_unitario" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                                <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            itemsListEl.insertAdjacentHTML('beforeend', itemCard);
        });

        // Disable all fields initially
        detailsContainerEl.querySelectorAll('input, textarea').forEach(input => input.disabled = true);
        detailsPlaceholderEl.classList.add('hidden');
        detailsContainerEl.classList.remove('hidden');
    };

    /**
     * Handles the click event on a contract in the list.
     * @param {number} contractId - The ID of the clicked contract.
     */
    const handleContractClick = (contractId) => {
        currentContractId = contractId;
        const contract = contractsData.find(c => c.id === contractId);
        if (contract) {
            populateDetails(contract);
            // Update active state in the list
            document.querySelectorAll('.contract-item').forEach(item => {
                const isCurrent = parseInt(item.dataset.id) === contractId;
                item.classList.toggle('bg-blue-100', isCurrent);
                item.classList.toggle('border-blue-500', isCurrent);
                item.classList.toggle('border-transparent', !isCurrent);
            });
        }
    };

    /**
     * Populates the left-side list with contracts.
     */
    const populateContractsList = () => {
        contractsListEl.innerHTML = ''; // Clear loading message
        contractsData.forEach(contract => {
            const listItem = `
                <div class="contract-item p-4 border-b border-l-4 border-transparent cursor-pointer hover:bg-gray-50" data-id="${contract.id}">
                    <h3 class="font-semibold text-gray-800">${contract.orgao_contratante}</h3>
                    <p class="text-sm text-gray-500">${contract.processo_pregao}</p>
                </div>
            `;
            contractsListEl.insertAdjacentHTML('beforeend', listItem);
        });

        // Add event listeners to the new list items
        document.querySelectorAll('.contract-item').forEach(item => {
            item.addEventListener('click', () => handleContractClick(parseInt(item.dataset.id)));
        });
    };

    /**
     * Initializes the application.
     */
    const init = () => {
        // Tentar carregar dados do localStorage (draftPDP do pdp-solicitacao)
        let dataSource = null;
        try {
            const draftPDP = localStorage.getItem('draftPDP');
            if (draftPDP) {
                const parsedData = JSON.parse(draftPDP);
                if (validateDataStructure(parsedData)) {
                    dataSource = parsedData;
                    console.log('Dados carregados do localStorage (draftPDP):', dataSource);
                } else {
                    console.warn('Erro ao carregar dados da solicitação do documento.');
                }
            }
            // dataSource = mockData; // Usar dados mockados para desenvolvimento
        } catch (error) {
            console.error('Erro ao carregar dados da solicitação do documento:', error);
        }

        // Cria ids unicos para cada item para permitir a logica de manipulação do conteúdo dos campos
        let idCounter = 1;
        let itemIdCounter = 1;
        contractsData = JSON.parse(JSON.stringify(dataSource)).map(c => ({
            ...c,
            id: idCounter++,
            tabela_itens: (c.tabela_itens || []).map(item => ({
                ...item,
                id: itemIdCounter++
            }))
        }));

        populateContractsList();

        // General event listener for edit/save buttons
        detailsContainerEl.addEventListener('click', (e) => {
            const button = e.target.closest('.edit-btn');
            if (!button) return;

            const input = button.parentElement.querySelector('input, textarea');
            if (!input) return;

            const isEditing = !input.disabled;

            if (isEditing) {
                // --- SAVE LOGIC ---
                const fieldName = input.dataset.field;
                let value = input.value;

                // Convert to number if the input type is number or it's a currency field
                if (input.type === 'number' || fieldName === 'valor_unitario') {
                    value = parseFloat(String(value).replace(',', '.')) || 0;
                }

                const itemCard = input.closest('[data-item-id]');
                const itemId = itemCard ? parseInt(itemCard.dataset.itemId) : null;

                saveData(fieldName, value, itemId);

                if (fieldName === 'valor_unitario') {
                    input.value = value.toFixed(2).replace('.',',');
                }

                input.disabled = true;
                button.innerHTML = `<i class="las la-edit mr-1"></i> Editar`;
                button.classList.remove('text-white', 'bg-blue-700', 'hover:bg-blue-800', 'focus:ring-blue-300');
                button.classList.add('text-blue-700', 'hover:text-white', 'border', 'border-blue-700', 'hover:bg-blue-700', 'focus:ring-4', 'focus:outline-none', 'focus:ring-blue-300');

            } else {
                // --- EDIT LOGIC ---
                input.disabled = false;
                input.focus();
                button.innerHTML = `<i class="las la-save mr-1"></i> Salvar`;
                button.classList.remove('text-blue-700', 'border-blue-700', 'hover:bg-blue-700', 'focus:ring-blue-300');
                button.classList.add('text-white', 'bg-blue-700', 'hover:bg-blue-800', 'focus:ring-blue-300');
            }
        });

        // EVENT LISTENER: Configurar o botão "Salvar alterações"
        const botaoSalvarAlteracoes = document.getElementById('btn-salvar-alteracoes');
        if (botaoSalvarAlteracoes) {
            botaoSalvarAlteracoes.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (validarFormulario()) {
                    const dados = extrairDadosFormulario();
                    
                    // Salva os dados no localStorage
                    localStorage.setItem('pdpDados', JSON.stringify(dados));
                    console.log('Dados PDP salvos no localStorage:', dados);
                    
                    // Exibir alert de sucesso
                    alert('Alterações salvas com sucesso!');
                    
                    // Redireciona para página de visualização
                    window.location.href = window.location.href.replace("confere_pdp", "visualizacao_pdp");
                }
            });
        } else {
            console.warn('Botão "Salvar alterações" não encontrado na página');
        }
    };

    // --- START APPLICATION ---
    init();

    // Expor funções úteis globalmente (para debug ou uso em outras partes)
    window.pdpCuradoria = {
        getCurrentData: () => contractsData,
        reloadFromLocalStorage: () => {
            init();
        },
        clearDraftPDP: () => {
            try {
                localStorage.removeItem('draftPDP');
                console.log('draftPDP removido do localStorage');
            } catch (error) {
                console.error('Erro ao remover draftPDP do localStorage:', error);
            }
        },
        clearPdpDados: () => {
            try {
                localStorage.removeItem('pdpDados');
                console.log('pdpDados removido do localStorage');
            } catch (error) {
                console.error('Erro ao remover pdpDados do localStorage:', error);
            }
        },
        extractFormData: extrairDadosFormulario,
        validateForm: validarFormulario
    };
});