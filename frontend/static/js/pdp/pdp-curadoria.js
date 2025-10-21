import { getProjectIdFromUrl } from "../utils/projeto/getProject.js";

/**
 * Tenta recuperar uma string JSON malformada.
 * @param {string} text - A string JSON potencialmente malformada.
 * @returns {any} - O objeto JSON parseado ou null se a recuperação falhar.
 */
function tryRecoverJson(text) {
    if (!text || typeof text !== 'string') {
        return null;
    }
    try {
        // Tenta o parse direto
        return JSON.parse(text);
    } catch (e) {
        console.warn("Falha no parsing inicial do JSON. Tentando recuperação...", e);

        // Remove lixo e marcadores de código comuns
        let correctedText = text.trim().replace(/^```json\s*|```\s*$/g, '');

        // Adiciona vírgulas faltantes entre "}" e "{" (comum em listas de objetos)
        correctedText = correctedText.replace(/}\s*{/g, '},{');

        // Remove vírgulas finais (trailing commas) antes de "}" ou "]"
        correctedText = correctedText.replace(/,\s*([}\]])/g, '$1');
        
        // Se a IA retorna múltiplos objetos sem envolvê-los em um array
        if (!correctedText.startsWith('[') && correctedText.includes('},{')) {
             correctedText = `[${correctedText}]`;
        }

        try {
            console.log("JSON após tentativa de correção:", correctedText);
            const parsed = JSON.parse(correctedText);
            // Se o resultado for um único objeto, mas a lógica espera um array, envolve-o
            if (!Array.isArray(parsed)) {
                return [parsed];
            }
            return parsed;
        } catch (e2) {
            console.error("Não foi possível recuperar o JSON após as tentativas de correção.", e2);
            return null; // Retorna null se tudo falhar
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let contractsData = [];
    let currentContractId = null;
    let currentProjectId = null;
    let currentPdpId = null;

    // Função para obter token de autenticação
    function obterTokenAutenticacao() {
        const tokenLocalStorage = localStorage.getItem('access_token') || localStorage.getItem('token');
        const tokenSessionStorage = sessionStorage.getItem('access_token') || sessionStorage.getItem('token');
        
        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }
        
        const tokenCookie = getCookie('access_token') || getCookie('token') || getCookie('auth_token');
        
        return tokenLocalStorage || tokenSessionStorage || tokenCookie;
    }

    // Função para fazer requisição com autenticação
    async function fazerRequisicaoAutenticada(url, options = {}) {
        const token = obterTokenAutenticacao();
        
        const requestConfig = {
            ...options,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'remote-user': 'user.test',
                'remote-groups': 'TI,OUTROS',
                ...options.headers
            }
        };
        
        if (token) {
            requestConfig.headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('Fazendo requisição para:', url, requestConfig);
        
        try {
            const response = await fetch(url, requestConfig);
            
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

    // Função para exibir alertas customizados
    function exibirAlerta(titulo, mensagem, tipo = 'info') {
        const icones = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };

        const icone = icones[tipo] || icones['info'];
        alert(`${icone} ${titulo}\n\n${mensagem}`);
    }

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
            typeof item.id !== 'undefined' &&
            Array.isArray(item.tabela_itens)
        );
    };

    /**
     * Limpa os dados do formulario utilizados para logica interna.
     * @returns {Object} - JSON formatado.
     */
    const extrairDadosFormulario = () => {
        if (!currentContractId) return null;

        const contract = contractsData.find(c => c.id === currentContractId);
        if (!contract) return null;

        const updatedContract = {
            id: contract.id, // Manter o ID original
            id_projeto: contract.id_projeto,
            orgao_contratante: document.getElementById('orgao-contratante').value,
            processo_pregao: document.getElementById('processo-pregao').value,
            empresa_adjudicada: document.getElementById('empresa-adjudicada').value,
            cnpj_empresa: document.getElementById('cnpj-empresa').value,
            objeto: document.getElementById('objeto').value,
            data_vigencia_inicio: document.getElementById('data-vigencia-inicio').value,
            data_vigencia_fim: document.getElementById('data-vigencia-fim').value,
            tipo_fonte: document.getElementById('tipo-fonte').value,
            user_created: contract.user_created,
            data_created: contract.data_created,
            tabela_itens: []
        };

        // Extract item data
        itemsListEl.querySelectorAll('[data-item-id]').forEach(itemEl => {
            const itemId = parseInt(itemEl.dataset.itemId);
            const originalItem = contract.tabela_itens.find(item => item.id === itemId);
            
            const updatedItem = {
                ...originalItem, // Keep original fields not being edited
                descricao: itemEl.querySelector('[data-field="descricao"]').value,
                marca_referencia: itemEl.querySelector('[data-field="marca_referencia"]').value,
                unidade: itemEl.querySelector('[data-field="unidade"]').value,
                quantidade: parseFloat(itemEl.querySelector('[data-field="quantidade"]').value) || 0,
                valor_unitario: parseFloat(itemEl.querySelector('[data-field="valor_unitario"]').value.replace(',', '.')) || 0
            };
            updatedContract.tabela_itens.push(updatedItem);
        });

        return updatedContract;
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
        document.getElementById('orgao-contratante').value = contract.orgao_contratante || '';
        document.getElementById('processo-pregao').value = contract.processo_pregao || '';
        document.getElementById('empresa-adjudicada').value = contract.empresa_adjudicada || '';
        document.getElementById('cnpj-empresa').value = contract.cnpj_empresa || '';
        document.getElementById('objeto').value = contract.objeto || '';
        document.getElementById('data-vigencia-inicio').value = contract.data_vigencia_inicio || '';
        document.getElementById('data-vigencia-fim').value = contract.data_vigencia_fim || '';
        document.getElementById('tipo-fonte').value = contract.tipo_fonte || '';

        itemsListEl.innerHTML = ''; // Clear previous items
        
        if (contract.tabela_itens && contract.tabela_itens.length > 0) {
            contract.tabela_itens.forEach(item => {
                const itemCard = `
                    <div class="p-4 border border-gray-200 rounded-md space-y-4 bg-gray-50" data-item-id="${item.id}">
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div class="flex flex-col space-y-1 md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700">N. Item</label>
                                <input type="text" value="${item.item || ''}" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 cursor-not-allowed" disabled>
                            </div>
                            <div class="flex flex-col space-y-1 md:col-span-10">
                                <label class="block text-sm font-medium text-gray-700">Descrição</label>
                                <div class="flex items-center space-x-3">
                                    <input type="text" value="${item.descricao || ''}" data-field="descricao" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900 focus:border-primary focus:ring-primary" disabled>
                                    <button class="edit-btn btn-outlined inline-flex items-center focus:ring-1 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col space-y-1">
                            <label class="block text-sm font-medium text-gray-700">Marca/Modelo</label>
                            <div class="flex items-center space-x-3">
                                <input type="text" value="${item.marca_referencia || ''}" data-field="marca_referencia" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900 focus:border-primary focus:ring-primary" disabled>
                                <button class="edit-btn btn-outlined inline-flex items-center borderfocus:ring-1 font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="flex flex-col space-y-1">
                                <label class="block text-sm font-medium text-gray-700">Unidade Medida</label>
                                <div class="flex items-center space-x-3">
                                    <input type="text" value="${item.unidade || ''}" data-field="unidade" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900 focus:border-primary focus:ring-primary" disabled>
                                    <button class="edit-btn btn-outlined inline-flex items-center focus:ring-1 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                                </div>
                            </div>
                            <div class="flex flex-col space-y-1">
                                <label class="block text-sm font-medium text-gray-700">Quantidade</label>
                                <div class="flex items-center space-x-3">
                                    <input type="number" value="${item.quantidade || 0}" data-field="quantidade" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900 focus:border-primary focus:ring-primary" disabled>
                                    <button class="edit-btn btn-outlined inline-flex items-center focus:ring-1 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                                </div>
                            </div>
                            <div class="flex flex-col space-y-1">
                                <label class="block text-sm font-medium text-gray-700">Valor Unitário (R$)</label>
                                <div class="flex items-center space-x-3">
                                    <input type="text" value="${parseFloat(item.valor_unitario || 0).toFixed(2).replace('.', ',')}" data-field="valor_unitario" class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 disabled:cursor-not-allowed enabled:bg-white enabled:text-gray-900 focus:border-primary focus:ring-primary" disabled>
                                    <button class="edit-btn btn-outlined inline-flex items-center focus:ring-1 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5"><i class="las la-edit mr-1"></i> Editar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                itemsListEl.insertAdjacentHTML('beforeend', itemCard);
            });
        }

        detailsContainerEl.querySelectorAll('input, textarea').forEach(input => input.disabled = true);
        detailsPlaceholderEl.classList.add('hidden');
        detailsContainerEl.classList.remove('hidden');
    };

    /**
     * Função para verificar estrutura dos dados - DEBUG
     */
    const verificarEstruturaDados = () => {
        console.log('=== VERIFICAÇÃO DA ESTRUTURA DOS DADOS ===');
        
        if (window.serverData) {
            console.log('window.serverData existe:', !!window.serverData);
            console.log('É array:', Array.isArray(window.serverData));
            if (Array.isArray(window.serverData) && window.serverData.length > 0) {
                console.log('Primeiro item serverData:', window.serverData[0]);
                console.log('Campos disponíveis:', Object.keys(window.serverData[0]));
            }
        }
        
        if (contractsData && contractsData.length > 0) {
            console.log('contractsData primeiro item:', contractsData[0]);
            console.log('Campos disponíveis em contractsData:', Object.keys(contractsData[0]));
        }
        
        console.log('Variáveis globais possíveis:');
        console.log('window.pdpId:', window.pdpId);
        console.log('window.currentProject:', window.currentProject);
        console.log('window.currentPdp:', window.currentPdp);
        console.log('=========================================');
    };

    /**
     * Handles the click event on a contract in the list.
     */
    const handleContractClick = (contractId) => {
        currentContractId = contractId;
        const contract = contractsData.find(c => c.id === contractId);
        if (contract) {
            // Usar o id_projeto diretamente do JSON
            currentProjectId = getProjectIdFromUrl();
            // O PDP ID é o próprio ID do contrato/PDP
            currentPdpId = contract.id || null;
            
            // Debug para verificar os valores
            console.log('Contract clicked - ID:', contractId);
            console.log('Contract data:', contract);
            console.log('currentProjectId:', currentProjectId);
            console.log('currentPdpId:', currentPdpId);
            
            // Verificar se os IDs foram encontrados
            if (!currentProjectId || !currentPdpId) {
                console.warn('IDs do projeto/PDP não encontrados no contrato:', contract);
                console.warn('Campos disponíveis no contrato:', Object.keys(contract));
            }
            
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
                    <h3 class="font-semibold text-gray-800">${contract.orgao_contratante || 'Órgão não informado'}</h3>
                    <p class="text-sm text-gray-500">${contract.processo_pregao || 'Processo não informado'}</p>
                </div>
            `;
            contractsListEl.insertAdjacentHTML('beforeend', listItem);
        });

        document.querySelectorAll('.contract-item').forEach(item => {
            item.addEventListener('click', () => handleContractClick(parseInt(item.dataset.id)));
        });
    };

    /**
     * Define valores iniciais para o primeiro contrato
     */
    const definirValoresIniciais = () => {
        if (contractsData.length > 0) {
            const firstContract = contractsData[0];
            currentContractId = firstContract.id;
            
            // Usar campos diretamente do JSON
            currentProjectId = getProjectIdFromUrl();
            currentPdpId = firstContract.id || null;
            
            console.log('Valores iniciais definidos:');
            console.log('currentContractId:', currentContractId);
            console.log('currentProjectId:', currentProjectId);
            console.log('currentPdpId:', currentPdpId);
            console.log('First contract data:', firstContract);
            console.log('Available fields:', Object.keys(firstContract));
            
            // Selecionar visualmente o primeiro contrato
            const firstContractElement = document.querySelector(`[data-id="${firstContract.id}"]`);
            if (firstContractElement) {
                firstContractElement.classList.add('bg-blue-100', 'border-blue-500');
                firstContractElement.classList.remove('border-transparent');
            }
            
            // Carregar os detalhes do primeiro contrato
            populateDetails(firstContract);
        }
    };

    /**
     * Atribui IDs únicos aos itens da tabela_itens que não possuem ID
     */
    const processarItensTabela = (contracts) => {
        let itemIdCounter = 1;
        
        return contracts.map(contract => ({
            ...contract,
            tabela_itens: (contract.tabela_itens || []).map(item => ({
                ...item,
                id: item.id || itemIdCounter++ // Usar ID existente ou gerar novo
            }))
        }));
    };

    /**
     * Initializes the application.
     */
    const init = () => {
        // Verificar estrutura dos dados primeiro
        verificarEstruturaDados();
        
        let dataSource = null;

        // 1. Tenta carregar e recuperar os dados do servidor.
        if (window.serverData && typeof window.serverData === 'string') {
            // tryRecoverJson foi implementado devido à constantes falhas na formação correta da sintaxe do JSON por parte da IA
            dataSource = tryRecoverJson(window.serverData);
            if (dataSource) {
                 console.log(`Dados carregados e parseados do servidor. ${dataSource.length} contratos encontrados.`);
            } else {
                 console.error('Falha ao parsear dados do servidor, mesmo após tentativa de recuperação.');
            }
        } else if (window.serverData && Array.isArray(window.serverData)) {
            // Fallback para caso o dado já venha parseado
            dataSource = window.serverData;
        }

        // 2. Se os dados do servidor não foram usados, tenta o localStorage como fallback.
        if (dataSource === null) {
            try {
                const draftPDP = localStorage.getItem('draftPDP');
                if (draftPDP) {
                    const parsedData = tryRecoverJson(draftPDP);
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

        // 5. Processar dados mantendo IDs originais do JSON
        contractsData = processarItensTabela(JSON.parse(JSON.stringify(dataSource)));

        populateContractsList();
        
        // Definir valores iniciais do primeiro contrato
        definirValoresIniciais();

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
                button.classList.replace('btn-primary', 'btn-outlined');
            } else {
                // --- EDIT LOGIC ---
                input.disabled = false;
                input.focus();
                button.innerHTML = `<i class="las la-save mr-1"></i> Salvar`;
                button.classList.replace('btn-outlined', 'btn-primary');
            }
        });

        // EVENT LISTENER: Configurar o botão "Salvar alterações"
        const botaoSalvarAlteracoes = document.getElementById('btn-salvar-alteracoes');
        if (botaoSalvarAlteracoes) {
            botaoSalvarAlteracoes.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Adicionar debug antes da validação
                console.log('=== TENTATIVA DE SALVAR ===');
                console.log('currentProjectId:', currentProjectId);
                console.log('currentPdpId:', currentPdpId);
                console.log('currentContractId:', currentContractId);
                
                if (!validarFormulario()) {
                    return;
                }

                // Tentar obter os IDs novamente antes de falhar
                if (!currentProjectId || !currentPdpId) {
                    console.log('IDs não encontrados, tentando recuperar...');
                    
                    if (currentContractId) {
                        const contract = contractsData.find(c => c.id === currentContractId);
                        if (contract) {
                            console.log('Tentando extrair IDs do contrato atual:', contract);
                            
                            currentProjectId = getProjectIdFromUrl();
                            currentPdpId = contract.id || null;
                            
                            console.log('IDs extraídos - ProjectId:', currentProjectId, 'PdpId:', currentPdpId);
                        }
                    }
                    
                    if (!currentProjectId || !currentPdpId) {
                        console.error('IDs não encontrados após tentativa de recuperação:', { 
                            currentProjectId, 
                            currentPdpId, 
                            contractsData: contractsData[0],
                            availableFields: contractsData[0] ? Object.keys(contractsData[0]) : 'No data'
                        });
                        exibirAlerta(
                            'Erro', 
                            `Nenhum PDP selecionado para salvar.\n\nDetalhes:\n- Project ID: ${currentProjectId || 'não encontrado'}\n- PDP ID: ${currentPdpId || 'não encontrado'}\n- Contract ID: ${currentContractId || 'não encontrado'}`, 
                            'error'
                        );
                        return;
                    }
                }

                const dadosParaPatch = extrairDadosFormulario();
                console.log('Dados para salvar:', dadosParaPatch);

                // Mostrar loading
                botaoSalvarAlteracoes.disabled = true;
                botaoSalvarAlteracoes.innerHTML = '<i class="las la-spinner la-spin text-lg mr-2"></i>Salvando...';
                
                try {
                    const url = `/projetos/${currentProjectId}/pdp/${currentPdpId}`;
                    console.log('URL da requisição:', url);
                    
                    const response = await fazerRequisicaoAutenticada(url, {
                        method: 'PATCH',
                        body: JSON.stringify(dadosParaPatch)
                    });
                    
                    if (response.ok) {
                        const pdpAtualizado = await response.json();
                        console.log('PDP atualizado com sucesso:', pdpAtualizado);
                        
                        // Atualizar dados locais no contractsData
                        const index = contractsData.findIndex(c => c.id === currentContractId);
                        if (index !== -1) {
                            contractsData[index] = { ...contractsData[index], ...pdpAtualizado };
                        }

                        exibirAlerta(
                            'Alterações Salvas com Sucesso!', 
                            'Todas as alterações foram salvas no banco de dados!', 
                            'success'
                        );
                        
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
                                'Você não tem permissão para editar este PDP.', 
                                'error'
                            );
                        } else {
                            exibirAlerta(
                                'Erro ao Salvar', 
                                `Erro ${response.status}: ${errorData.detail || errorData.message || 'Erro ao salvar no banco.'}`, 
                                'error'
                            );
                        }
                    }
                    
                } catch (error) {
                    console.error('Erro ao salvar PDP:', error);
                    exibirAlerta(
                        'Erro de Conexão', 
                        'Não foi possível conectar com o servidor. Verifique sua conexão e tente novamente.', 
                        'error'
                    );
                } finally {
                    // Restaurar botão
                    botaoSalvarAlteracoes.disabled = false;
                    botaoSalvarAlteracoes.innerHTML = '<i class="las la-save text-lg mr-2"></i>Salvar alterações';
                }
            });
        } else {
            console.warn('Botão "Salvar alterações" não encontrado na página');
        }

        // EVENT LISTENER: Configurar o botão "Visualizar resultado"
        const botaoVisualizar = document.getElementById('btn-visualizar-resultado');
        if (botaoVisualizar) {
            botaoVisualizar.addEventListener('click', () => {
                window.location.href = window.location.href.replace('confere_pdp', 'visualizacao_pdp');
            });
        } else {
            console.warn('Botão "Visualizar resultado" não encontrado na página');
        }
    };

    /**
     * Função auxiliar para debug dos dados de contrato
     */
    const debugContractData = () => {
        console.log('=== DEBUG CONTRACT DATA ===');
        console.log('window.serverData:', window.serverData);
        console.log('contractsData sample:', contractsData[0]);
        console.log('Available fields in first contract:', contractsData[0] ? Object.keys(contractsData[0]) : 'No contracts');
        console.log('currentProjectId:', currentProjectId);
        console.log('currentPdpId:', currentPdpId);
        console.log('========================');
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
        validateForm: validarFormulario,
        debugContractData: debugContractData,
        verificarEstruturaDados: verificarEstruturaDados,
        getCurrentIds: () => ({
            contractId: currentContractId,
            projectId: currentProjectId,
            pdpId: currentPdpId
        }),
        setIds: (projectId, pdpId) => {
            currentProjectId = projectId;
            currentPdpId = pdpId;
            console.log('IDs definidos manualmente:', { projectId, pdpId });
        }
    };
});