document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let contractsData = [];
    let currentContractId = null;

    // --- MOCK DATA (mantido para referência) ---
    const mockData = [
        // ... (seus dados mockados aqui) ...
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
            const cleanContract = { ...contract };
            delete cleanContract.id;
            
            cleanContract.tabela_itens = contract.tabela_itens.map(item => {
                const cleanItem = { ...item };
                delete cleanItem.id;
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
        if (!contractsData || contractsData.length === 0) {
            alert('Não há dados para salvar.');
            return false;
        }

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
                            <input type="text" value="${item.item || ''}" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 cursor-not-allowed" disabled>
                        </div>
                        <div class="flex flex-col space-y-1 md:col-span-10">
                            <label class="block text-sm font-medium text-gray-700">Descrição</label>
                            <div class="flex items-center space-x-3">
                                <input type="text" value="${item.descricao_item || ''}" data-field="descricao_item" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                                <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col space-y-1">
                        <label class="block text-sm font-medium text-gray-700">Marca/Modelo</label>
                        <div class="flex items-center space-x-3">
                            <input type="text" value="${item.marca_modelo || ''}" data-field="marca_modelo" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                            <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="flex flex-col space-y-1">
                            <label class="block text-sm font-medium text-gray-700">Unidade Medida</label>
                            <div class="flex items-center space-x-3">
                                <input type="text" value="${item.unidade_medida || ''}" data-field="unidade_medida" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                                <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                            </div>
                        </div>
                        <div class="flex flex-col space-y-1">
                            <label class="block text-sm font-medium text-gray-700">Quantidade</label>
                            <div class="flex items-center space-x-3">
                                <input type="number" value="${item.quantidade || 0}" data-field="quantidade" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                                <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                            </div>
                        </div>
                        <div class="flex flex-col space-y-1">
                            <label class="block text-sm font-medium text-gray-700">Valor Unitário (R$)</label>
                            <div class="flex items-center space-x-3">
                                <input type="text" value="${parseFloat(item.valor_unitario || 0).toFixed(2).replace('.', ',')}" data-field="valor_unitario" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900" disabled>
                                <button class="edit-btn inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            itemsListEl.insertAdjacentHTML('beforeend', itemCard);
        });

        detailsContainerEl.querySelectorAll('input, textarea').forEach(input => input.disabled = true);
        detailsPlaceholderEl.classList.add('hidden');
        detailsContainerEl.classList.remove('hidden');
    };

    /**
     * Handles the click event on a contract in the list.
     */
    const handleContractClick = (contractId) => {
        currentContractId = contractId;
        const contract = contractsData.find(c => c.id === contractId);
        if (contract) {
            populateDetails(contract);
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
        contractsListEl.innerHTML = ''; // Clear list
        contractsData.forEach(contract => {
            const listItem = `
                <div class="contract-item p-4 border-b border-l-4 border-transparent cursor-pointer hover:bg-gray-50" data-id="${contract.id}">
                    <h3 class="font-semibold text-gray-800">${contract.orgao_contratante}</h3>
                    <p class="text-sm text-gray-500">${contract.processo_pregao}</p>
                </div>
            `;
            contractsListEl.insertAdjacentHTML('beforeend', listItem);
        });

        document.querySelectorAll('.contract-item').forEach(item => {
            item.addEventListener('click', () => handleContractClick(parseInt(item.dataset.id)));
        });
    };

    /**
     * Initializes the application.
     */
    const init = () => {
        let dataSource = null;

        // 1. Verifica os dados do servidor. Um array vazio é considerado válido.
        if (window.serverData && Array.isArray(window.serverData)) {
            if (window.serverData.length > 0 && !validateDataStructure(window.serverData)) {
                console.warn('Os dados recebidos do servidor possuem uma estrutura inválida.');
            } else {
                dataSource = window.serverData;
                console.log(`Dados carregados do servidor. ${dataSource.length} contratos encontrados.`);
            }
        }

        // 2. Se os dados do servidor não foram usados, tenta o localStorage como fallback.
        if (dataSource === null) {
            try {
                const draftPDP = localStorage.getItem('draftPDP');
                if (draftPDP) {
                    const parsedData = JSON.parse(draftPDP);
                    if (validateDataStructure(parsedData)) {
                        dataSource = parsedData;
                        console.log('Dados carregados do localStorage (draftPDP).');
                    } else {
                        console.warn('A estrutura dos dados no localStorage é inválida.');
                    }
                }
            } catch (error) {
                console.error('Erro ao processar dados do localStorage:', error);
            }
        }

        // 3. Se dataSource ainda for null, inicializa como um array vazio para evitar erros.
        if (dataSource === null) {
            dataSource = [];
        }

        // 4. Se não houver dados, exibe a mensagem apropriada e interrompe.
        if (dataSource.length === 0) {
            console.log("Nenhuma fonte de dados encontrada. Exibindo placeholder.");
            contractsListEl.innerHTML = '<div class="text-center text-gray-500 p-4">Nenhum contrato encontrado para este projeto.</div>';
            detailsPlaceholderEl.classList.remove('hidden');
            detailsContainerEl.classList.add('hidden');
            return; 
        }

        // 5. A partir daqui, dataSource é um array.
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

                if (input.type === 'number' || fieldName === 'valor_unitario') {
                    value = parseFloat(String(value).replace(',', '.')) || 0;
                }

                const itemCard = input.closest('[data-item-id]');
                const itemId = itemCard ? parseInt(itemCard.dataset.itemId) : null;

                saveData(fieldName, value, itemId);

                if (fieldName === 'valor_unitario') {
                    input.value = value.toFixed(2).replace('.', ',');
                }

                input.disabled = true;
                button.innerHTML = `<i class="las la-edit mr-1"></i> Editar`;
                button.classList.remove('text-white', 'bg-blue-700', 'hover:bg-blue-800');
                button.classList.add('text-blue-700', 'hover:text-white', 'border', 'border-blue-700', 'hover:bg-blue-700');
            } else {
                // --- EDIT LOGIC ---
                input.disabled = false;
                input.focus();
                button.innerHTML = `<i class="las la-save mr-1"></i> Salvar`;
                button.classList.remove('text-blue-700', 'border-blue-700', 'hover:bg-blue-700');
                button.classList.add('text-white', 'bg-blue-700', 'hover:bg-blue-800');
            }
        });

        // EVENT LISTENER: Configurar o botão "Salvar alterações"
        const botaoSalvarAlteracoes = document.getElementById('btn-salvar-alteracoes');
        if (botaoSalvarAlteracoes) {
            botaoSalvarAlteracoes.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (validarFormulario()) {
                    const dados = extrairDadosFormulario();
                    localStorage.setItem('pdpDados', JSON.stringify(dados));
                    console.log('Dados PDP salvos no localStorage:', dados);
                    alert('Alterações salvas com sucesso!');
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