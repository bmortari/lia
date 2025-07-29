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

    // Event listeners para botões de editar, visualizar e deletar
    const actionButtons = document.querySelectorAll('button[data-action]');
    actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Se o botão está desabilitado, não fazer nada
            if (button.disabled || button.classList.contains('btn-disabled')) {
                console.log('Botão desabilitado clicado');
                return false;
            }
            
            const action = button.getAttribute('data-action');
            const service = button.getAttribute('data-service');
            const projectId = button.getAttribute('data-project-id');
            
            console.log(`Action: ${action}, Service: ${service}, Project: ${projectId}`);
            
            // Verifica se é ação de delete
            if (action === 'delete') {
                // Só permite delete para DFD por enquanto
                if (service === 'dfd') {
                    showDeleteConfirmation(projectId, service);
                } else {
                    showServiceNotAvailable(service.toUpperCase() + ' DELETE');
                }
                return;
            }
            
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

    // Event listeners para o modal de confirmação de delete
    setupDeleteModal();
});

// Função para configurar o modal de delete
function setupDeleteModal() {
    const cancelBtn = document.getElementById('cancelDelete');
    const modal = document.getElementById('deleteModal');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            hideDeleteConfirmation();
        });
    }
    
    // Fecha modal ao clicar fora dele
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideDeleteConfirmation();
            }
        });
    }
    
    // Fecha modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            hideDeleteConfirmation();
        }
    });
}

// Função para mostrar modal de confirmação de delete
function showDeleteConfirmation(projectId, service) {
    console.log(`Mostrando confirmação de delete para projeto ${projectId}, serviço ${service}`);
    
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDelete');
    
    if (!modal || !confirmBtn) {
        console.error('Modal ou botão de confirmação não encontrado');
        return;
    }
    
    // Remove event listeners anteriores clonando o botão
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Adiciona novo event listener
    newConfirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        executeDelete(projectId, service);
    });
    
    // Mostra o modal
    modal.classList.remove('hidden');
    
    // Impede scroll do body
    document.body.style.overflow = 'hidden';
    
    console.log('Modal de confirmação exibido');
}

// Função para esconder modal de confirmação
function hideDeleteConfirmation() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('hidden');
        
        // Restaura scroll do body
        document.body.style.overflow = '';
    }
}

// Função para executar o delete
async function executeDelete(projectId, service) {
    console.log(`Executando delete para projeto ${projectId}, serviço ${service}`);
    
    try {
        // Mostra loading no botão
        const confirmBtn = document.getElementById('confirmDelete');
        if (confirmBtn) {
            confirmBtn.textContent = 'Deletando...';
            confirmBtn.disabled = true;
        }
        
        // Faz a requisição de delete
        const response = await fetch(`/projetos/${projectId}/dfd`, {
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'remote-user': 'user.test', // REMOVER O HARDCODING AO COLOCAR EM PRODUÇÃO
                'remote-groups': 'TI,OUTROS' // REMOVER O HARDCODING AO COLOCAR EM PRODUÇÃO
            }
        });
        
        if (response.ok) {
            console.log('DFD deletado com sucesso');
            
            // Sucesso - atualiza a interface
            updateCardState(service, false);
            hideDeleteConfirmation();
            
            // Mostra mensagem de sucesso
            showSuccessMessage('DFD deletado com sucesso!');
            
        } else {
            const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
            throw new Error(errorData.detail || `Erro HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('Erro ao deletar:', error);
        alert('Erro ao deletar DFD: ' + error.message);
        
        // Restaura botão
        const confirmBtn = document.getElementById('confirmDelete');
        if (confirmBtn) {
            confirmBtn.textContent = 'Sim, deletar';
            confirmBtn.disabled = false;
        }
    }
}

// Função para mostrar mensagem de sucesso
function showSuccessMessage(message) {
    // Cria elemento de notificação
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="uil uil-check-circle mr-2"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove após 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

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
    const deleteButtons = document.querySelectorAll('button[title="Deletar documento"]');

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

    deleteButtons.forEach(button => {
        if (button.disabled) {
            button.title = "Crie o artefato primeiro para poder deletá-lo";
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
    console.log(`Atualizando estado do card ${cardType} para hasArtifact: ${hasArtifact}`);
    
    const cardElement = document.querySelector(`[data-card-type="${cardType}"]`);
    if (!cardElement) {
        console.error(`Card do tipo ${cardType} não encontrado`);
        return;
    }

    const card = cardElement.querySelector('.w-full.max-w-xs');
    const icon = cardElement.querySelector('.text-6xl');
    const statusElement = cardElement.querySelector('.artifact-status');
    const generateButton = cardElement.querySelector('button[id^="gera_"], button:first-of-type');
    const editButton = cardElement.querySelector('button[data-action="edit"]');
    const viewButton = cardElement.querySelector('button[data-action="view"]');
    const deleteButton = cardElement.querySelector('button[data-action="delete"]');

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
        
        // Habilita botão de deletar (apenas para DFD por enquanto)
        if (deleteButton && cardType === 'dfd') {
            deleteButton.disabled = false;
            deleteButton.classList.remove('btn-disabled');
            deleteButton.title = 'Deletar documento';
            
            // Força a cor vermelha do botão delete
            if (!deleteButton.classList.contains('btn-danger')) {
                deleteButton.classList.add('btn-danger');
            }
            
            console.log('Botão de delete habilitado para DFD');
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
        
        // Desabilita botão de deletar
        if (deleteButton) {
            deleteButton.disabled = true;
            if (!deleteButton.classList.contains('btn-disabled')) {
                deleteButton.classList.add('btn-disabled');
            }
            deleteButton.title = 'Crie o artefato primeiro para poder deletá-lo';
            
            console.log('Botão de delete desabilitado');
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
        'ED': 'Edital',
        'PDP DELETE': 'Deletar Pesquisa de Preços',
        'ETP DELETE': 'Deletar Estudo Técnico Preliminar',
        'MR DELETE': 'Deletar Mapa de Riscos',
        'TR DELETE': 'Deletar Termo de Referência',
        'ED DELETE': 'Deletar Edital'
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