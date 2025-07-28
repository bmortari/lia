const URL = window.location.origin;
const pathParts = window.location.pathname.split('/'); // divide a URL em partes
const idProjeto = parseInt(pathParts[2]); // index 2 corresponde ao "2" em /projetos/2/curar_dfd
let pcaAllOptions = []; // Armazena as opções do PCA para referência posterior

// Função para popular as opções no DOM
const populateOptions = (options, container) => {
    container.innerHTML = ''; // Limpa opções existentes
    options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'flex items-center pca-option';
        
        const input = document.createElement('input');
        input.id = `radio-${index}`;
        input.type = 'radio';
        input.value = option.obj;
        input.name = 'pca-2026-option';
        input.className = 'custom-radio w-4 h-4 bg-gray-100 border-gray-300 focus:outline-none';
        input.style.accentColor = '#0097B2';
        
        // O primeiro item, "NÃO POSSUI PLANO", deve ser marcado por padrão.
        if (option.item === 0) {
            input.checked = true;
        }

        const label = document.createElement('label');
        label.htmlFor = `radio-${index}`;
        label.className = 'ms-3 text-sm font-medium text-gray-900';
        label.textContent = option.obj;

        div.appendChild(input);
        div.appendChild(label);
        container.appendChild(div);
    });
};

// Busca e popula os dados do PCA
async function loadPcaOptions() {
    const optionsContainer = document.getElementById('pca-options-container');
    const searchInput = document.getElementById('pca-search');

    try {
        const response = await fetch(URL + '/dfd_pca');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Assumindo que o endpoint retorna um JSON com a chave 'pca' contendo o array
        const options = data || [];
        
        // Adiciona "NÃO ESTÁ PREVISTO NO PLANO" como a primeira opção e armazena globalmente
        pcaAllOptions = [
            { "item": 0, "obj": "NÃO ESTÁ PREVISTO NO PLANO" },
            ...options
        ];

        populateOptions(pcaAllOptions, optionsContainer);

        // --- Lógica de Busca/Filtro ---
        searchInput.addEventListener('input', function (e) {
            const filter = e.target.value.toLowerCase();
            const optionElements = optionsContainer.querySelectorAll('.pca-option');
            
            optionElements.forEach(optionEl => {
                const label = optionEl.querySelector('label');
                if (label.textContent.toLowerCase().includes(filter)) {
                    optionEl.style.display = '';
                } else {
                    optionEl.style.display = 'none';
                }
            });
        });
    } catch (error) {
        console.error('Error fetching or processing PCA data:', error);
        optionsContainer.innerHTML = '<p class="text-red-500">Erro ao carregar dados.</p>';
    }
}

// Função para lidar com o envio do formulário
async function handleFormSubmit(event) {
    event.preventDefault(); // Previne o recarregamento da página

    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('progress-bar');
    
    // Coleta dos dados do formulário
    const descricao = document.getElementById('solicitation').value;
    const selectedObj = document.querySelector('input[name="pca-2026-option"]:checked').value;
    
    // Encontra o 'item' correspondente ao 'obj' selecionado
    const selectedOption = pcaAllOptions.find(opt => opt.obj === selectedObj);
    const item = selectedOption ? selectedOption.item : 0;


    const requestBody = {
        descricao: descricao,
        item: item
    };

    // Mostra a sobreposição de carregamento
    loadingOverlay.classList.remove('hidden');

    // Simulação de progresso
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 3;
        progressBar.style.width = `${progress}%`;
        if (progress >= 95) clearInterval(progressInterval);
    }, 100);

    try {
        const response = await fetch(URL + '/projetos/'+ idProjeto +'/create_dfd', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'remote-user': 'user.test', // REMOVER HARDCODING
                'remote-groups': 'TI,OUTROS' // REMOVER HARDCODING
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: [{ msg: 'Erro desconhecido' }] }));
            const errorMsg = errorData.detail && errorData.detail[0] ? errorData.detail[0].msg : 'Erro desconhecido';
            throw new Error(`Erro ${response.status}: ${errorMsg}`);
        }

        const result = await response.json();
        
        // Garantindo que o item seja salvo junto com o resultado no localStorage
        const draftWithItem = {
            ...result,
            item: item // Incluindo o item selecionado do PCA
        };
        
        window.localStorage.setItem("draftDFD", JSON.stringify(draftWithItem));
        window.location.href = window.location.href.replace("criar_dfd", "confere_dfd");

    } catch (error) {
        console.error('Falha ao enviar formulário:', error);
        alert(`Um erro ocorreu. Tente novamente mais tarde.`);
        loadingOverlay.classList.add('hidden'); // Esconde o overlay em caso de erro
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Carrega as opções do PCA ao iniciar
    loadPcaOptions();

    // Adiciona o listener de submit ao formulário
    const form = document.getElementById('dfd-solicitacao-form');
    form.addEventListener('submit', handleFormSubmit);
});