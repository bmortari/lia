const BASE_URL = window.location.origin;


// Função para extrair project_id da URL
function getProjectIdFromUrl() {
    const url = window.location.pathname;
    const match = url.match(/\/projetos\/(\d+)\//);
    return match ? match[1] : null;
}

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
    // Esfera
    document.querySelectorAll('.esfera-option').forEach(option => option.checked = true);
    const esferaAll = document.getElementById('esfera-all');
    if (esferaAll) esferaAll.checked = true;

    // UF
    document.querySelectorAll('.uf-option').forEach(option => option.checked = true);
    const ufAll = document.getElementById('uf-all');
    if (ufAll) ufAll.checked = true;

    // Modalidade
    document.querySelectorAll('.modalidade-option').forEach(option => option.checked = true);
    const modalidadeAll = document.getElementById('modalidade-all');
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

// Função para criar card de resultado
function createResultCard(item) {
    return `
        <div class="search-result-item bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-all">
            <div class="flex items-start justify-between mb-3">
                <h4 class="text-lg font-semibold text-gray-900 line-clamp-2">${item.objeto || 'Objeto não informado'}</h4>
                <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                    ${item.esfera || 'N/A'}
                </span>
            </div>
            
            <div class="space-y-2 mb-4">
                <div class="flex items-center text-sm text-gray-600">
                    <i class="uil uil-map-marker mr-2"></i>
                    <span>${item.orgao || 'Órgão não informado'} - ${item.uf || 'N/A'}</span>
                </div>
                
                <div class="flex items-center text-sm text-gray-600">
                    <i class="uil uil-calendar-alt mr-2"></i>
                    <span>${item.data || 'Data não informada'}</span>
                </div>
                
                <div class="flex items-center text-sm text-gray-600">
                    <i class="uil uil-file-alt mr-2"></i>
                    <span>Modalidade: ${item.modalidade || 'N/A'}</span>
                </div>
            </div>
            
            <div class="flex items-center justify-between">
                <div class="text-right">
                    <div class="text-xs text-gray-500">Valor Total</div>
                    <div class="text-lg font-bold text-green-600">
                        R$ ${item.valor ? parseFloat(item.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}
                    </div>
                </div>
                
                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors" onclick="viewDetails('${item.id}')">
                    Ver detalhes
                    <i class="uil uil-external-link-alt ml-1"></i>
                </button>
            </div>
        </div>
    `;
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
        
        // Simular progresso
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 95) progress = 95;
            progressBar.style.width = `${progress}%`;
        }, 200);

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

        // Parar o progresso e completar a barra
        clearInterval(progressInterval);
        progressBar.style.width = '100%';

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
            throw new Error(`Erro ${response.status}: ${errorData.detail || 'Erro na pesquisa'}`);
        }

        const results = await response.json();
        
        // Salvar resultados no localStorage se necessário
        localStorage.setItem('draftPDP', JSON.stringify(results));

        // Navegar para a página de curadoria PDP (editar com o caminho correto)
        window.location.href = window.location.href.replace("criar_pdp", "confere_pdp");

    } catch (error) {
        console.error('Erro na pesquisa:', error);
        
        // Esconder loading em caso de erro
        loadingOverlay.classList.add('hidden');
        
        // Mostrar erro para o usuário
        alert(`Ocorreu um erro ao pesquisar. Tente novamente mais tarde.`);
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
    
    const object = document.getElementById('pesquisa-objeto').value.trim();
    const palavrasChaveInput = document.getElementById('palavras-chave').value.trim();
    
    if (!object) {
        alert('Por favor, descreva o objeto que deseja pesquisar.');
        return;
    }
    
    // Aplicar lógica dos filtros
    const filterValues = getFilterValues();
    
    // Coletar dados dos filtros no formato correto
    const searchData = {
        "palavras-chave": palavrasChaveInput ? palavrasChaveInput.split(',').map(kw => kw.trim()) : [],
        descricao: object,
        ufs: filterValues.ufs,
        esferas: filterValues.esferas,
        modalidades: filterValues.modalidades
    };
    
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

    // Event listener para limpar todos os filtros
    document.getElementById('clear-all-filters').addEventListener('click', clearFilters);

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
        // TODO: Implementar navegação para página inicial
        window.history.back();
    });
    
    // Auto-focus no textarea
    document.getElementById('pesquisa-objeto').focus();
});