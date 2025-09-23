import { getProjectIdFromUrl } from "/static/js/utils/getProject.js";

const BASE_URL = window.location.origin;

// Estado dos filtros
let filterState = {
    esfera: ['distrital', 'estadual', 'federal', 'municipal'],
    uf: ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'],
    modalidade: ['concorrencia_eletronica', 'concorrencia_presencial', 'credenciamento', 'dispensa', 'inexigibilidade', 'leilao_eletronico', 'leilao_presencial', 'pre_qualificacao', 'pregao_eletronico', 'pregao_presencial']
};

// Função para limpar filtros
function clearFilters() {
    // Resetar estado dos filtros
    filterState.esfera = ['distrital', 'estadual', 'federal', 'municipal'];
    filterState.uf = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    filterState.modalidade = ['concorrencia_eletronica', 'concorrencia_presencial', 'credenciamento', 'dispensa', 'inexigibilidade', 'leilao_eletronico', 'leilao_presencial', 'pre_qualificacao', 'pregao_eletronico', 'pregao_presencial'];

    // Marcar todas as checkboxes nos modais
    document.querySelectorAll('.esfera-option').forEach(option => option.checked = true);
    document.querySelectorAll('.uf-option').forEach(option => option.checked = true);
    document.querySelectorAll('.modalidade-option').forEach(option => option.checked = true);

    const esferaAll = document.getElementById('esfera-all');
    const ufAll = document.getElementById('uf-all');
    const modalidadeAll = document.getElementById('modalidade-all');
    
    if (esferaAll) esferaAll.checked = true;
    if (ufAll) ufAll.checked = true;
    if (modalidadeAll) modalidadeAll.checked = true;

    updateFilterButtons();
}

// Função para atualizar os botões de filtro
function updateFilterButtons() {
    // Atualizar botão Esfera
    const sphereButton = document.getElementById('esfera-btn-text');
    const sphereCounter = document.getElementById('esfera-count');
    const totalSphere = 4;
    if (filterState.esfera.length === totalSphere) {
        sphereButton.textContent = 'Esfera';
        sphereCounter.textContent = totalSphere;
        sphereCounter.className = 'ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full';
    } else if (filterState.esfera.length === 0) {
        sphereButton.textContent = 'Esfera';
        sphereCounter.textContent = '0';
        sphereCounter.className = 'ml-1.5 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full';
    } else {
        sphereButton.textContent = 'Esfera';
        sphereCounter.textContent = filterState.esfera.length;
        sphereCounter.className = 'ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full';
    }

    // Atualizar botão UF
    const ufButton = document.getElementById('uf-btn-text');
    const ufCounter = document.getElementById('uf-count');
    const totalUf = 27;
    if (filterState.uf.length === totalUf) {
        ufButton.textContent = 'UF';
        ufCounter.textContent = totalUf;
        ufCounter.className = 'ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full';
    } else if (filterState.uf.length === 0) {
        ufButton.textContent = 'UF';
        ufCounter.textContent = '0';
        ufCounter.className = 'ml-1.5 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full';
    } else {
        ufButton.textContent = 'UF';
        ufCounter.textContent = filterState.uf.length;
        ufCounter.className = 'ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full';
    }

    // Atualizar botão Modalidade
    const modalityButton = document.getElementById('modalidade-btn-text');
    const modalityCounter = document.getElementById('modalidade-count');
    const totalModality = 10;
    if (filterState.modalidade.length === totalModality) {
        modalityButton.textContent = 'Modalidade';
        modalityCounter.textContent = totalModality;
        modalityCounter.className = 'ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full';
    } else if (filterState.modalidade.length === 0) {
        modalityButton.textContent = 'Modalidade';
        modalityCounter.textContent = '0';
        modalityCounter.className = 'ml-1.5 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full';
    } else {
        modalityButton.textContent = 'Modalidade';
        modalityCounter.textContent = filterState.modalidade.length;
        modalityCounter.className = 'ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full';
    }
}

// Funções para abrir/fechar modals
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Função para popular opções nos modals
function populateModalOptions() {
    // Popular UF
    const ufContainer = document.getElementById('uf-options-modal');
    if (ufContainer) {
        const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
        ufContainer.innerHTML = ufs.map(uf => `
            <label class="flex items-center">
                <input type="checkbox" value="${uf}" class="checkbox-custom uf-option w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" checked>
                <span class="ml-3 text-sm text-gray-700">${uf}</span>
            </label>
        `).join('');
    }

    // Popular Modalidades
    const modalityContainer = document.getElementById('modalidade-options-modal');
    if (modalityContainer) {
        const modalities = [
            { label: 'Concorrência Eletrônica', value: 'concorrencia_eletronica' },
            { label: 'Concorrência Presencial', value: 'concorrencia_presencial' },
            { label: 'Credenciamento', value: 'credenciamento' },
            { label: 'Dispensa', value: 'dispensa' },
            { label: 'Inexigibilidade', value: 'inexigibilidade' },
            { label: 'Leilão Eletrônico', value: 'leilao_eletronico' },
            { label: 'Leilão Presencial', value: 'leilao_presencial' },
            { label: 'Pré Qualificação', value: 'pre_qualificacao' },
            { label: 'Pregão Eletrônico', value: 'pregao_eletronico' },
            { label: 'Pregão Presencial', value: 'pregao_presencial' }
        ];
        modalityContainer.innerHTML = modalities.map(modality => `
            <label class="flex items-center">
                <input type="checkbox" value="${modality.value}" class="checkbox-custom modalidade-option w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" checked>
                <span class="ml-3 text-sm text-gray-700">${modality.label}</span>
            </label>
        `).join('');
    }
}

// Função para exibir PDPs criados
function displayPDPResults(pdps) {
    console.log('PDPs recebidos:', pdps);
    
    if (!Array.isArray(pdps) || pdps.length === 0) {
        console.warn('Nenhum PDP foi retornado');
        alert('Nenhum PDP foi gerado. Verifique os dados e tente novamente.');
        return;
    }

    // Criar resumo dos PDPs
    const resultadosSection = document.getElementById('resultados-section');
    const totalResultados = document.getElementById('total-resultados');
    const resultadosGrid = document.getElementById('resultados-grid');
    
    if (!resultadosSection || !totalResultados || !resultadosGrid) {
        console.error('Elementos de resultado não encontrados no DOM');
        return;
    }

    // Atualizar contador
    totalResultados.textContent = `${pdps.length} PDP(s) gerado(s)`;
    
    // Limpar grid anterior
    resultadosGrid.innerHTML = '';
    
    // Criar cards para cada PDP
    pdps.forEach((pdp, index) => {
        const card = createPDPCard(pdp, index + 1);
        resultadosGrid.appendChild(card);
    });
    
    // Mostrar seção de resultados
    resultadosSection.classList.remove('hidden');
    
    // Scroll para resultados
    resultadosSection.scrollIntoView({ behavior: 'smooth' });
}

// Função para criar card de PDP
function createPDPCard(pdp, index) {
    const card = document.createElement('div');
    card.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-all';
    
    // Calcular valor total dos itens
    let valorTotal = 0;
    let quantidadeItens = 0;
    
    if (Array.isArray(pdp.tabela_itens)) {
        quantidadeItens = pdp.tabela_itens.length;
        valorTotal = pdp.tabela_itens.reduce((total, item) => {
            return total + (parseFloat(item.valor_total) || 0);
        }, 0);
    }

    // CORREÇÃO: usar data_created em vez de created_at para formatação de datas se necessário
    let dataFormatada = 'N/A';
    if (pdp.data_created) {
        try {
            const data = new Date(pdp.data_created);
            dataFormatada = data.toLocaleDateString('pt-BR');
        } catch (e) {
            console.warn('Erro ao formatar data:', e);
        }
    }

    card.innerHTML = `
        <div class="flex items-start justify-between mb-3">
            <h4 class="text-lg font-semibold text-gray-900 line-clamp-2">PDP ${index}</h4>
            <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                ${pdp.tipo_fonte || 'N/A'}
            </span>
        </div>
        
        <div class="space-y-2 mb-4">
            <div class="text-sm">
                <span class="font-medium text-gray-700">Objeto:</span>
                <span class="text-gray-600 ml-1">${pdp.objeto || 'N/A'}</span>
            </div>
            
            <div class="text-sm">
                <span class="font-medium text-gray-700">Órgão:</span>
                <span class="text-gray-600 ml-1">${pdp.orgao_contratante || 'N/A'}</span>
            </div>
            
            <div class="text-sm">
                <span class="font-medium text-gray-700">Processo:</span>
                <span class="text-gray-600 ml-1">${pdp.processo_pregao || 'N/A'}</span>
            </div>

            <div class="text-sm">
                <span class="font-medium text-gray-700">Empresa:</span>
                <span class="text-gray-600 ml-1">${pdp.empresa_adjudicada || 'N/A'}</span>
            </div>

            <div class="text-sm">
                <span class="font-medium text-gray-700">Criado em:</span>
                <span class="text-gray-600 ml-1">${dataFormatada}</span>
            </div>
        </div>
        
        <div class="flex items-center justify-between pt-3 border-t border-gray-100">
            <div class="text-left">
                <div class="text-xs text-gray-500">Valor Total</div>
                <div class="text-lg font-bold text-green-600">
                    R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>
                <div class="text-xs text-gray-500">${quantidadeItens} item(ns)</div>
            </div>
            
            <button class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors" onclick="viewPDPDetails(${pdp.id})">
                Ver detalhes
                <i class="uil uil-external-link-alt ml-1"></i>
            </button>
        </div>
    `;
    
    return card;
}

// Função para visualizar detalhes do PDP
function viewPDPDetails(pdpId) {
    const projectId = getProjectIdFromUrl();
    if (projectId) {
        window.location.href = `${BASE_URL}/projetos/${projectId}/confere_pdp?pdp_id=${pdpId}`;
    }
}

// Função para pesquisar preços

async function searchPrices(searchData) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('progress-bar');
    
    try {
        // Obter project_id da URL
        const projectId = getProjectIdFromUrl();
        if (!projectId) {
            throw new Error('Projeto não encontrado');
        }

        // Mostrar loading
        loadingOverlay.classList.remove('hidden');
        
        // Simulação de progresso para 3 minutos (180 segundos)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 0.53; // 95% ÷ 180 segundos ≈ 0.53% por segundo
            progressBar.style.width = `${progress}%`;
            if (progress >= 95) clearInterval(progressInterval);
        }, 1000); // Atualiza a cada 1 segundo

        console.log('Enviando dados para API:', searchData);

        // Fazer requisição para a API
        const response = await fetch(`${BASE_URL}/projetos/${projectId}/create_pdp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'remote-user': 'user.test', // TODO: Remover hardcoding
                'remote-groups': 'TI,OUTROS' // TODO: Remover hardcoding
            },
            body: JSON.stringify(searchData)
        });

        // Quando a resposta chegar, parar o progresso e completar a barra
        clearInterval(progressInterval);
        progressBar.style.width = '100%';

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
            throw new Error(`Erro ${response.status}: ${errorData.detail || 'Erro na pesquisa'}`);
        }

        const results = await response.json();
        console.log('Resposta da API:', results);
        
        // Esconder loading
        loadingOverlay.classList.add('hidden');
        
        // Exibir resultados
        displayPDPResults(results);

    } catch (error) {
        console.error('Erro na pesquisa:', error);
        
        // Esconder loading em caso de erro
        loadingOverlay.classList.add('hidden');
        
        // Mostrar erro para o usuário
        alert(`Ocorreu um erro ao pesquisar: ${error.message}. Tente novamente mais tarde.`);
    }
}

// Função para aplicar lógica dos filtros
function getFilterValues() {
    // Valores totais possíveis para cada filtro
    const totalEsferas = ['distrital', 'estadual', 'federal', 'municipal'];
    const totalUfs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    const totalModalidades = ['concorrencia_eletronica', 'concorrencia_presencial', 'credenciamento', 'dispensa', 'inexigibilidade', 'leilao_eletronico', 'leilao_presencial', 'pre_qualificacao', 'pregao_eletronico', 'pregao_presencial'];
    
    // Aplicar lógica: se todos estão marcados, enviar array vazio; senão, enviar os selecionados
    const esferas = filterState.esfera.length === totalEsferas.length ? [] : filterState.esfera;
    const ufs = filterState.uf.length === totalUfs.length ? [] : filterState.uf;
    const modalidades = filterState.modalidade.length === totalModalidades.length ? [] : filterState.modalidade;
    
    return { esferas, ufs, modalidades };
}

// Função para lidar com o envio do formulário
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const palavrasChaveInput = document.getElementById('palavras-chave').value.trim();
    
    if (!palavrasChaveInput) {
        alert('Por favor, insira palavras-chave para a pesquisa.');
        return;
    }
    
    // Aplicar lógica dos filtros
    const filterValues = getFilterValues();
    
    // Coletar dados dos filtros no formato correto
    const searchData = {
        "palavras_chave": palavrasChaveInput ? palavrasChaveInput.split(',').map(kw => kw.trim()) : [],
        descricao: palavrasChaveInput, // Usar as palavras-chave como descrição também
        ufs: filterValues.ufs,
        esferas: filterValues.esferas,
        modalidades: filterValues.modalidades
    };
    
    console.log('Dados da pesquisa:', searchData);
    
    await searchPrices(searchData);
}

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    // Popular opções nos modals
    populateModalOptions();
    
    // Atualizar botões de filtro
    updateFilterButtons();

    // Event listeners para abrir modals
    document.getElementById('filter-esfera-btn').addEventListener('click', () => {
        openModal('filter-esfera-modal');
    });

    document.getElementById('filter-uf-btn').addEventListener('click', () => {
        openModal('filter-uf-modal');
    });

    document.getElementById('filter-modalidade-btn').addEventListener('click', () => {
        openModal('filter-modalidade-modal');
    });

    // Event listeners para fechar modals
    document.getElementById('close-esfera-modal').addEventListener('click', () => {
        closeModal('filter-esfera-modal');
    });

    document.getElementById('close-uf-modal').addEventListener('click', () => {
        closeModal('filter-uf-modal');
    });

    document.getElementById('close-modalidade-modal').addEventListener('click', () => {
        closeModal('filter-modalidade-modal');
    });

    // Event listeners para cancelar modals
    document.getElementById('cancel-esfera').addEventListener('click', () => {
        closeModal('filter-esfera-modal');
    });

    document.getElementById('cancel-uf').addEventListener('click', () => {
        closeModal('filter-uf-modal');
    });

    document.getElementById('cancel-modalidade').addEventListener('click', () => {
        closeModal('filter-modalidade-modal');
    });

    // Event listeners para aplicar filtros
    document.getElementById('apply-esfera').addEventListener('click', () => {
        const checkedOptions = Array.from(document.querySelectorAll('.esfera-option:checked')).map(cb => cb.value);
        filterState.esfera = checkedOptions;
        updateFilterButtons();
        closeModal('filter-esfera-modal');
    });

    document.getElementById('apply-uf').addEventListener('click', () => {
        const checkedOptions = Array.from(document.querySelectorAll('.uf-option:checked')).map(cb => cb.value);
        filterState.uf = checkedOptions;
        updateFilterButtons();
        closeModal('filter-uf-modal');
    });

    document.getElementById('apply-modalidade').addEventListener('click', () => {
        const checkedOptions = Array.from(document.querySelectorAll('.modalidade-option:checked')).map(cb => cb.value);
        filterState.modalidade = checkedOptions;
        updateFilterButtons();
        closeModal('filter-modalidade-modal');
    });

    // Event listeners para "Selecionar Todos"
    document.getElementById('esfera-all').addEventListener('change', function() {
        const sphereOptions = document.querySelectorAll('.esfera-option');
        sphereOptions.forEach(option => {
            option.checked = this.checked;
        });
    });

    document.getElementById('uf-all').addEventListener('change', function() {
        const ufOptions = document.querySelectorAll('.uf-option');
        ufOptions.forEach(option => {
            option.checked = this.checked;
        });
    });

    document.getElementById('modalidade-all').addEventListener('change', function() {
        const modalityOptions = document.querySelectorAll('.modalidade-option');
        modalityOptions.forEach(option => {
            option.checked = this.checked;
        });
    });

    // Event listener para fechar modals ao clicar fora
    document.addEventListener('click', function(event) {
        const modals = ['filter-esfera-modal', 'filter-uf-modal', 'filter-modalidade-modal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                closeModal(modalId);
            }
        });
    });
    
    // Event listener para o formulário
    const form = document.getElementById('pesquisa-preco-form');
    form.addEventListener('submit', handleFormSubmit);
    
    // Event listener para voltar ao início
    const backToStart = document.getElementById('voltar-inicio');
    backToStart.addEventListener('click', function() {
        window.history.back();
    });
    
    // Auto-focus no campo de palavras-chave
    const palavrasChaveField = document.getElementById('palavras-chave');
    if (palavrasChaveField) {
        palavrasChaveField.focus();
    }
});