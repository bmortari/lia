const URL = window.location.origin;
const pathParts = window.location.pathname.split('/');
const idProjeto = parseInt(pathParts[2]);

// Função para extrair ID do projeto da URL
function getProjectIdFromUrl() {
    const url = window.location.pathname;
    const match = url.match(/\/projetos\/(\d+)/);
    return match ? match[1] : null;
}

// Função para atualizar status dos artefatos
function updateArtefatoStatus(artefato, disponivel) {
    const statusElement = document.getElementById(`status-${artefato}`);
    if (statusElement) {
        if (disponivel) {
            statusElement.className = 'status-badge status-available';
            statusElement.innerHTML = '<i class="uil uil-check-circle mr-1"></i>Disponível';
        } else {
            statusElement.className = 'status-badge status-missing';
            statusElement.innerHTML = '<i class="uil uil-times-circle mr-1"></i>Não encontrado';
        }
    }
}

// Função para carregar análise dos artefatos
async function carregarAnaliseArtefatos() {
    const projectId = getProjectIdFromUrl();
    const conteudoAnalise = document.getElementById('conteudo-analise');
    
    try {
        const response = await fetch(`${URL}/projetos/${projectId}/analise_etp`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const analise = await response.json();
        
        // Atualizar status dos artefatos
        const artefatos = analise.artefatos_disponiveis || {};
        updateArtefatoStatus('dfd', artefatos.dfd || false);
        updateArtefatoStatus('pdp', artefatos.pdp || false);
        updateArtefatoStatus('pgr', artefatos.pgr || false);
        updateArtefatoStatus('solucoes', artefatos.solucoes || false);
        
        // Atualizar resumo da análise
        if (analise.status === 'erro') {
            conteudoAnalise.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div class="flex items-center mb-2">
                        <i class="uil uil-exclamation-triangle text-red-600 mr-2"></i>
                        <span class="font-medium text-red-800">Erro na Análise</span>
                    </div>
                    <p class="text-red-700 text-sm">${analise.erro || 'Erro desconhecido'}</p>
                </div>
            `;
            return;
        }
        
        if (analise.status === 'sem_artefatos') {
            conteudoAnalise.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div class="flex items-center mb-2">
                        <i class="uil uil-exclamation-triangle text-yellow-600 mr-2"></i>
                        <span class="font-medium text-yellow-800">Artefatos Insuficientes</span>
                    </div>
                    <p class="text-yellow-700 text-sm">É necessário criar DFD e PDP antes de gerar o ETP.</p>
                </div>
            `;
            
            // Desabilitar botão de envio
            const sendButton = document.getElementById('send-button');
            if (sendButton) {
                sendButton.disabled = true;
                sendButton.textContent = 'Artefatos Necessários Não Encontrados';
                sendButton.classList.add('opacity-50', 'cursor-not-allowed');
            }
            return;
        }
        
        // Análise bem-sucedida
        const analiseData = analise.analise_etp || {};
        conteudoAnalise.innerHTML = `
            <div class="space-y-3">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 class="font-medium text-blue-900 mb-1">Objeto Principal</h5>
                    <p class="text-blue-800 text-sm">${analiseData.objeto_principal || 'Não definido'}</p>
                </div>
                
                <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h5 class="font-medium text-green-900 mb-1">Complexidade</h5>
                    <p class="text-green-800 text-sm">${analiseData.complexidade_geral || 'Não avaliada'}</p>
                </div>
                
                ${analiseData.valor_estimado_total ? `
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <h5 class="font-medium text-purple-900 mb-1">Valor Estimado</h5>
                    <p class="text-purple-800 text-sm">R$ ${analiseData.valor_estimado_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
                ` : ''}
                
                ${analiseData.riscos_principais && analiseData.riscos_principais.length > 0 ? `
                <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h5 class="font-medium text-orange-900 mb-1">Riscos Principais</h5>
                    <ul class="text-orange-800 text-sm list-disc list-inside">
                        ${analiseData.riscos_principais.slice(0, 3).map(risco => `<li>${risco}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${analiseData.solucoes_disponiveis && analiseData.solucoes_disponiveis.length > 0 ? `
                <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <h5 class="font-medium text-indigo-900 mb-1">Soluções Disponíveis</h5>
                    <ul class="text-indigo-800 text-sm list-disc list-inside">
                        ${analiseData.solucoes_disponiveis.slice(0, 3).map(solucao => `<li>${solucao}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
        `;
        
    } catch (error) {
        console.error('Erro ao carregar análise dos artefatos:', error);
        conteudoAnalise.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                <div class="flex items-center mb-2">
                    <i class="uil uil-exclamation-triangle text-red-600 mr-2"></i>
                    <span class="font-medium text-red-800">Erro de Conexão</span>
                </div>
                <p class="text-red-700 text-sm">Não foi possível carregar a análise dos artefatos.</p>
            </div>
        `;
    }
}

// Função para lidar com o envio do formulário
async function handleFormSubmit(event) {
    event.preventDefault();

    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('progress-bar');
    
    // Coleta dos dados do formulário
    const promptUsuario = document.getElementById('solicitation').value.trim();
    
    if (!promptUsuario) {
        alert('Por favor, forneça orientações para a geração do ETP.');
        return;
    }

    const requestBody = {
        prompt_usuario: promptUsuario,
        parametros_etp: {
            incluir_sustentabilidade: true,
            detalhar_riscos: true,
            incluir_mercado: true
        }
    };

    // Mostra a sobreposição de carregamento
    loadingOverlay.classList.remove('hidden');

    // Simulação de progresso
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 2;
        progressBar.style.width = `${progress}%`;
        if (progress >= 95) clearInterval(progressInterval);
    }, 200);

    try {
        const response = await fetch(`${URL}/projetos/${idProjeto}/create_etp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'remote-user': 'user.test', // TODO: Remover hardcoding
                'remote-groups': 'TI,OUTROS' // TODO: Remover hardcoding
            },
            body: JSON.stringify(requestBody) 
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
                detail: response.status === 404 ? 'Projeto não encontrado ou artefatos insuficientes' : 'Erro desconhecido' 
            }));
            
            let errorMsg = 'Erro desconhecido';
            
            if (response.status === 404) {
                errorMsg = 'Certifique-se de que DFD e PDP foram criados antes de gerar o ETP.';
            } else if (errorData.detail) {
                if (Array.isArray(errorData.detail)) {
                    errorMsg = errorData.detail[0]?.msg || errorData.detail[0] || 'Erro de validação';
                } else {
                    errorMsg = errorData.detail;
                }
            }
            
            throw new Error(`Erro ${response.status}: ${errorMsg}`);
        }

        const result = await response.json();
        console.log('ETP criado com sucesso:', result);
        
        // Finalizar barra de progresso
        progressBar.style.width = '100%';
        
        // Salvar dados no localStorage como backup
        window.localStorage.setItem("etpGerado", JSON.stringify(result));
        
        // Redirecionar para a página de curadoria
        setTimeout(() => {
            window.location.href = window.location.href.replace("criar_etp", "confere_etp");
        }, 1000);

    } catch (error) {
        console.error('Falha ao gerar ETP:', error);
        
        // Limpar progresso
        clearInterval(progressInterval);
        loadingOverlay.classList.add('hidden');
        
        // Mostrar erro detalhado
        alert(`Erro ao gerar ETP:\n\n${error.message}\n\nVerifique se todos os artefatos necessários foram criados e tente novamente.`);
    }
}

// Função para exibir alertas customizados
function showAlert(title, message, type = 'info') {
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };

    const icon = icons[type] || icons['info'];
    alert(`${icon} ${title}\n\n${message}`);
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 ETP Solicitação carregado');
    
    // Carregar análise dos artefatos
    carregarAnaliseArtefatos();

    // Adicionar o listener de submit ao formulário
    const form = document.getElementById('etp-solicitacao-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    console.log('✅ Event listeners configurados para ETP');
});