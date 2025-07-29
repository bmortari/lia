// Event listener para o botão DFD
document.addEventListener('DOMContentLoaded', () => {
    const btnGerarDFD = document.getElementById('gera_dfd');
    const btnGerarPDP = document.getElementById('gera_pdp');

    // Verifica se os botões existem antes de adicionar event listeners
    if (btnGerarDFD && !btnGerarDFD.disabled) {
        btnGerarDFD.addEventListener('click', () => {
            const currentUrl = window.location.href;
            const newUrl = currentUrl.endsWith('/')
                ? currentUrl + 'criar_dfd'
                : currentUrl + '/criar_dfd';
            window.location.href = newUrl;
        });
    }

    if (btnGerarPDP && !btnGerarPDP.disabled) {
        btnGerarPDP.addEventListener('click', () => {
            const currentUrl = window.location.href;
            const newUrl = currentUrl.endsWith('/')
                ? currentUrl + 'criar_pdp'
                : currentUrl + '/criar_pdp';
            window.location.href = newUrl;
        });
    }

    // Event listener para o botão "Voltar ao Início"
    const btnVoltarInicio = document.getElementById('logo-lia');
    if (btnVoltarInicio) {
        btnVoltarInicio.addEventListener('click', () => {
            const url = new URL(window.location.href);
            window.location.href = url.origin;
        });
    }

    // Adiciona comportamento para botões desabilitados
    const buttonsDisabled = document.querySelectorAll('.btn-disabled');
    buttonsDisabled.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    });

    // Event listeners para botões de editar e visualizar
    const actionButtons = document.querySelectorAll('button[data-action]');
    actionButtons.forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                const action = button.getAttribute('data-action');
                const service = button.getAttribute('data-service');
                const projectId = button.getAttribute('data-project-id');
                
                // Verifica se o serviço está disponível
                if (!isServiceAvailable(service) && action !== 'view') {
                    showServiceNotAvailable(service.toUpperCase());
                    return;
                }
                
                // Monta a URL baseada no serviço e ação
                let url = `/projetos/${projectId}`;
                
                if (action === 'edit') {
                    // Rotas para edição
                    switch (service) {
                        case 'dfd':
                            url += '/confere_dfd';
                            break;
                        case 'pdp':
                            url += '/criar_pdp';
                            break;
                        case 'etp':
                            url += '/criar_etp';
                            break;
                        case 'mr':
                            url += '/criar_mr';
                            break;
                        case 'tr':
                            url += '/criar_tr';
                            break;
                        case 'ed':
                            url += '/criar_ed';
                            break;
                        default:
                            console.error('Serviço não reconhecido:', service);
                            return;
                    }
                } else if (action === 'view') {
                    // Rotas para visualização
                    switch (service) {
                        case 'dfd':
                            url += '/visualizacao_dfd';
                            break;
                        case 'pdp':
                            url += '/visualizacao_pdp';
                            break;
                        case 'etp':
                            url += '/visualizacao_etp';
                            break;
                        case 'mr':
                            url += '/visualizacao_mr';
                            break;
                        case 'tr':
                            url += '/visualizacao_tr';
                            break;
                        case 'ed':
                            url += '/visualizacao_ed';
                            break;
                        default:
                            console.error('Serviço não reconhecido:', service);
                            return;
                    }
                }
                
                // Redireciona para a URL construída
                window.location.href = url;
            });
        }
    });

    // Inicializar estado dos cards baseado nos dados do projeto
    initializeCardStates();

    // Adiciona tooltips para botões desabilitados
    updateTooltips();

    // Event listeners para botões de serviços em desenvolvimento
    const devButtons = document.querySelectorAll('.btn-custom-dev');
    devButtons.forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const cardElement = button.closest('[data-card-type]');
                const cardType = cardElement?.getAttribute('data-card-type');
                if (cardType) {
                    showServiceNotAvailable(cardType.toUpperCase());
                }
            });
        }
    });
});

// Função para inicializar o estado visual dos cards
function initializeCardStates() {
    const cards = document.querySelectorAll('[data-card-type]');
    cards.forEach(card => {
        const cardType = card.getAttribute('data-card-type');
        const cardElement = card.querySelector('.w-full.max-w-xs');
        
        // Verifica se o card tem a classe de artefato existente
        const hasArtifact = cardElement.classList.contains('card-with-artifact');
        
        // Garante que o estado visual está correto
        updateCardVisualState(cardType, hasArtifact);
    });
}

// Função para atualizar tooltips
function updateTooltips() {
    const editButtons = document.querySelectorAll('button[title="Editar documento"]');
    const viewButtons = document.querySelectorAll('button[title="Visualizar documento"]');

    editButtons.forEach(button => {
        if (button.disabled) {
            button.title = "Crie o artefato primeiro para poder editá-lo";
        }
    });

    viewButtons.forEach(button => {
        if (button.disabled) {
            button.title = "Crie o artefato primeiro para poder visualizá-lo";
        }
    });
}

// Função para atualizar o estado visual de um card específico
function updateCardVisualState(cardType, hasArtifact) {
    const cardElement = document.querySelector(`[data-card-type="${cardType}"]`);
    if (!cardElement) return;

    const card = cardElement.querySelector('.w-full.max-w-xs');
    const icon = cardElement.querySelector('.text-6xl');
    const statusElement = cardElement.querySelector('.artifact-status');

    if (hasArtifact) {
        // Card com artefato - usando destaque turquesa/verde
        if (!card.classList.contains('card-with-artifact')) {
            card.classList.remove('card-without-artifact');
            card.classList.add('card-with-artifact');
        }
        
        // Atualiza ícone
        if (icon.classList.contains('icon-custom-gray')) {
            icon.classList.remove('icon-custom-gray');
            icon.classList.add('icon-custom');
        }
        
        // Atualiza status
        if (statusElement) {
            statusElement.innerHTML = '<i class="uil uil-check-circle mr-1"></i>Artefato criado';
            statusElement.classList.remove('artifact-not-exists');
            statusElement.classList.add('artifact-exists');
        }
    } else {
        // Card sem artefato - visual apagado
        if (!card.classList.contains('card-without-artifact')) {
            card.classList.remove('card-with-artifact');
            card.classList.add('card-without-artifact');
        }
        
        // Atualiza ícone
        if (icon.classList.contains('icon-custom')) {
            icon.classList.remove('icon-custom');
            icon.classList.add('icon-custom-gray');
        }
        
        // Atualiza status
        if (statusElement) {
            statusElement.innerHTML = '<i class="uil uil-exclamation-circle mr-1"></i>Não criado';
            statusElement.classList.remove('artifact-exists');
            statusElement.classList.add('artifact-not-exists');
        }
    }
}

// Função para atualizar o estado de um card (pode ser chamada via AJAX)
window.updateCardState = function(cardType, hasArtifact) {
    const cardElement = document.querySelector(`[data-card-type="${cardType}"]`);
    if (!cardElement) return;

    const card = cardElement.querySelector('.w-full.max-w-xs');
    const icon = cardElement.querySelector('.text-6xl');
    const statusElement = cardElement.querySelector('.artifact-status');
    const generateButton = cardElement.querySelector('button[id^="gera_"], button:first-of-type');
    const editButton = cardElement.querySelector('button[data-action="edit"]');
    const viewButton = cardElement.querySelector('button[data-action="view"]');

    // Atualiza estado visual
    updateCardVisualState(cardType, hasArtifact);

    if (hasArtifact) {
        // Atualiza botão de gerar
        if (generateButton) {
            generateButton.textContent = 'Já Criado';
            generateButton.disabled = true;
            if (!generateButton.classList.contains('btn-disabled')) {
                generateButton.classList.add('btn-disabled');
            }
        }
        
        // Habilita botões de editar e visualizar
        if (editButton) {
            editButton.disabled = false;
            editButton.classList.remove('btn-disabled');
            editButton.title = 'Editar documento';
        }
        
        if (viewButton) {
            viewButton.disabled = false;
            viewButton.classList.remove('btn-disabled');
            viewButton.title = 'Visualizar documento';
        }
    } else {
        // Atualiza botão de gerar
        if (generateButton) {
            const isAvailable = isServiceAvailable(cardType);
            generateButton.textContent = isAvailable ? 'Gerar' : 'Em Desenvolvimento';
            generateButton.disabled = false;
            generateButton.classList.remove('btn-disabled');
            
            // Atualiza classe do botão baseado na disponibilidade
            if (isAvailable) {
                generateButton.classList.remove('btn-custom-dev');
                if (!generateButton.classList.contains('btn-custom')) {
                    generateButton.classList.add('btn-custom');
                }
            } else {
                generateButton.classList.remove('btn-custom');
                if (!generateButton.classList.contains('btn-custom-dev')) {
                    generateButton.classList.add('btn-custom-dev');
                }
            }
        }
        
        // Desabilita botões de editar e visualizar
        if (editButton) {
            editButton.disabled = true;
            if (!editButton.classList.contains('btn-disabled')) {
                editButton.classList.add('btn-disabled');
            }
            editButton.title = 'Crie o artefato primeiro para poder editá-lo';
        }
        
        if (viewButton) {
            viewButton.disabled = true;
            if (!viewButton.classList.contains('btn-disabled')) {
                viewButton.classList.add('btn-disabled');
            }
            viewButton.title = 'Crie o artefato primeiro para poder visualizá-lo';
        }
    }
};

// Função auxiliar para verificar se um serviço está disponível
window.isServiceAvailable = function(service) {
    const availableServices = ['dfd', 'pdp'];
    return availableServices.includes(service);
};

// Função para mostrar notificação quando um serviço não está disponível
window.showServiceNotAvailable = function(serviceName) {
    const serviceNames = {
        'ETP': 'Estudo Técnico Preliminar',
        'MR': 'Mapa de Riscos',
        'TR': 'Termo de Referência',
        'ED': 'Edital'
    };
    
    const fullName = serviceNames[serviceName] || serviceName;
    alert(`O serviço ${fullName} ainda está em desenvolvimento.`);
};

// Função para atualizar todos os cards (útil após atualizações via AJAX)
window.refreshAllCards = function(projectData) {
    if (!projectData) return;
    
    updateCardState('dfd', projectData.exist_dfd || false);
    updateCardState('pdp', projectData.exist_pdp || false);
    updateCardState('etp', projectData.exist_etp || false);
    updateCardState('mr', projectData.exist_mr || false);
    updateCardState('tr', projectData.exist_tr || false);
    updateCardState('ed', projectData.exist_ed || false);
};