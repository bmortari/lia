// Função para configurar os botões de geração
function setupGenerateButtons() {
    console.log('🔄 Configurando botões de geração...');

    function getProjectId() {
        const pathname = window.location.pathname;
        const matches = pathname.match(/\/projetos\/(\d+)/);
        return matches ? matches[1] : null;
    }

    const projectId = getProjectId();
    if (!projectId) {
        console.error('❌ ID do projeto não encontrado na URL ao configurar botões.');
        return;
    }

    const serviceRoutes = {
        'dfd': { create: `/projetos/${projectId}/criar_dfd` },
        'pdp': { create: `/projetos/${projectId}/criar_pdp` },
        'pgr': { create: `/projetos/${projectId}/criar_pgr` },
        'etp': { create: `/projetos/${projectId}/criar_etp` },
        'tr':  { create: `/projetos/${projectId}/criar_tr` },
        'ed':  { create: `/projetos/${projectId}/criar_ed` }
    };

    const generateButtons = {
        'gera_dfd': 'dfd',
        'gera_pdp': 'pdp',
        'gera_pgr': 'pgr',
        'gera_etp': 'etp',
        'gera_tr': 'tr',
        'gera_ed': 'ed'
    };

    const availableServices = ['dfd', 'pdp', 'pgr', 'etp'];

    Object.entries(generateButtons).forEach(([buttonId, service]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            const isServiceAvailable = availableServices.includes(service);

            if (!newButton.disabled && !newButton.classList.contains('btn-disabled') && isServiceAvailable) {
                newButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    const route = serviceRoutes[service]?.create;
                    if (route) {
                        console.log(`🚀 Redirecionando para: ${route}`);
                        window.location.href = route;
                    } else {
                        console.warn(`⚠️ Rota não encontrada para serviço: ${service}`);
                        showToast(`Serviço ${service.toUpperCase()} em desenvolvimento`, 'warning');
                    }
                });
                console.log(`✅ Event listener adicionado para ${buttonId} -> ${service}`);
            } else {
                console.log(`⏸️ Botão ${buttonId} está desabilitado ou serviço não disponível`);
            }
        } else {
            console.warn(`⚠️ Botão ${buttonId} não encontrado`);
        }
    });
}

// projeto-servicos.js - Versão com PGR e ETP
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 projeto-servicos.js carregado (versão PGR + ETP)');
    
    // Extrair ID do projeto da URL
    function getProjectId() {
        const pathname = window.location.pathname;
        const matches = pathname.match(/\/projetos\/(\d+)/);
        return matches ? matches[1] : null;
    }
    
    const projectId = getProjectId();
    console.log('🔍 ID do projeto extraído:', projectId);
    
    if (!projectId) {
        console.error('❌ ID do projeto não encontrado na URL');
        return;
    }
    
    // === MAPEAMENTO DE ROTAS ===
    const serviceRoutes = {
        'dfd': {
            create: `/projetos/${projectId}/criar_dfd`,
            edit: `/projetos/${projectId}/confere_dfd`,
            view: `/projetos/${projectId}/visualizacao_dfd`,
            delete: `/projetos/${projectId}/dfd`
        },
        'pdp': {
            create: `/projetos/${projectId}/criar_pdp`,
            edit: `/projetos/${projectId}/confere_pdp`,
            view: `/projetos/${projectId}/visualizacao_pdp`,
            delete: `/projetos/${projectId}/pdp`
        },
        'pgr': {
            // PGR (Plano de Gerenciamento de Riscos)
            create: `/projetos/${projectId}/criar_pgr`,
            edit: `/projetos/${projectId}/criar_pgr`,
            view: `/projetos/${projectId}/visualizacao_pgr`,
            delete: `/projetos/${projectId}/pgr`
        },
        'etp': {
            // ETP (Estudo Técnico Preliminar) - ADICIONADO
            create: `/projetos/${projectId}/criar_etp`,
            edit: `/projetos/${projectId}/confere_etp`,
            view: `/projetos/${projectId}/visualizacao_etp`,
            delete: `/projetos/${projectId}/etp`
        },
        'tr': {
            create: `/projetos/${projectId}/criar_tr`,
            edit: `/projetos/${projectId}/criar_tr`,
            view: `/projetos/${projectId}/visualizacao_tr`,
            delete: `/projetos/${projectId}/tr`
        },
        'ed': {
            create: `/projetos/${projectId}/criar_ed`,
            edit: `/projetos/${projectId}/criar_ed`,
            view: `/projetos/${projectId}/visualizacao_ed`,
            delete: `/projetos/${projectId}/ed`
        }
    };
    
    // === SERVIÇOS DISPONÍVEIS ===
    const availableServices = ['dfd', 'pdp', 'pgr', 'etp']; // ✅ ETP ADICIONADO
    
    // === EVENT LISTENERS PARA BOTÕES DE GERAÇÃO ===
    setupGenerateButtons();
    
    // === EVENT LISTENERS PARA BOTÕES DE AÇÃO ===
    const actionButtons = document.querySelectorAll('button[data-action]');
    console.log(`🔘 Encontrados ${actionButtons.length} botões de ação`);
    
    actionButtons.forEach((button, index) => {
        // Remove event listeners existentes clonando o elemento
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Verifica se está desabilitado
            if (this.disabled || this.classList.contains('btn-disabled')) {
                console.log('🚫 Botão desabilitado clicado');
                return false;
            }
            
            const action = this.getAttribute('data-action');
            const service = this.getAttribute('data-service');
            const projectIdFromButton = this.getAttribute('data-project-id');
            
            console.log(`🎯 Ação: ${action}, Serviço: ${service}, Projeto: ${projectIdFromButton}`);
            
            // Ação de delete
            if (action === 'delete') {
                showDeleteConfirmation(service, projectIdFromButton || projectId);
                return;
            }
            
            // Verificar se serviço está disponível (exceto para view)
            if (!availableServices.includes(service) && action !== 'view') {
                showServiceNotAvailable(service.toUpperCase());
                return;
            }
            
            // Buscar rota correspondente
            const route = serviceRoutes[service]?.[action];
            if (route) {
                console.log(`🚀 Redirecionando para: ${route}`);
                window.location.href = route;
            } else {
                console.warn(`⚠️ Rota não encontrada: ${service}.${action}`);
                showToast(`Ação ${action} para ${service.toUpperCase()} em desenvolvimento`, 'warning');
            }
        });
        
        console.log(`✅ Event listener ${index + 1} configurado`);
    });
    
    // === EVENT LISTENER PARA LOGO ===
    const logoLia = document.getElementById('logo-lia');
    if (logoLia) {
        logoLia.addEventListener('click', function() {
            console.log('🏠 Redirecionando para página inicial');
            window.location.href = '/';
        });
    }
    
    // === CONFIGURAR MODAL DE DELETE ===
    setupDeleteModal();
    
    // === INICIALIZAÇÃO ===
    initializeCardStates();
    updateTooltips();
    
    console.log('✅ projeto-servicos.js inicializado com sucesso');
    console.log('🗺️ Rotas mapeadas:', serviceRoutes);
    console.log('🔧 Serviços disponíveis:', availableServices);
});

// === FUNÇÕES DO MODAL DE DELETE ===
function setupDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const cancelBtn = document.getElementById('cancelDelete');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            hideDeleteConfirmation();
        });
    }
    
    // Fechar modal clicando fora
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideDeleteConfirmation();
            }
        });
    }
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            hideDeleteConfirmation();
        }
    });
    
    console.log('🗑️ Modal de delete configurado');
}

function showDeleteConfirmation(service, projectId) {
    console.log(`🗑️ Mostrando confirmação de delete para ${service} no projeto ${projectId}`);
    
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDelete');
    
    if (!modal || !confirmBtn) {
        console.error('❌ Modal ou botão de confirmação não encontrado');
        return;
    }
    
    // Remove event listeners anteriores clonando o botão
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Adiciona novo event listener
    newConfirmBtn.addEventListener('click', function(e) {
        e.preventDefault();
        executeDelete(service, projectId);
    });
    
    // Mostra o modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    console.log('✅ Modal de confirmação exibido');
}

function hideDeleteConfirmation() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    console.log('❌ Modal de confirmação escondido');
}

async function executeDelete(service, projectId) {
    console.log(`🗑️ Executando delete para ${service} no projeto ${projectId}`);
    const confirmBtn = document.getElementById('confirmDelete');

    try {
        // Mostra loading no botão
        if (confirmBtn) {
            confirmBtn.textContent = 'Deletando...';
            confirmBtn.disabled = true;
        }
        
        // Define a URL de delete baseada no serviço
        let deleteUrl = `/projetos/${projectId}/${service}`;
        
        // Para PGR, ETP e PDP, usa endpoint específico para deletar todos do projeto
        if (service === 'pgr' || service === 'etp' || service === 'pdp') {
            deleteUrl = `/projetos/${projectId}/${service}`;
        }
        
        // Faz a requisição de delete
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'remote-user': 'user.test', // TODO: Substituir por autenticação real
                'remote-groups': 'TI,OUTROS' // TODO: Substituir por autenticação real
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`✅ ${service.toUpperCase()} deletado com sucesso:`, result);
            
            // Atualiza a interface
            updateCardState(service, false);
            hideDeleteConfirmation();
            
            // Mostra mensagem de sucesso
            showSuccessMessage(`${service.toUpperCase()} deletado com sucesso!`);

            // Reconfigura os botões de geração para reanexar o event listener
            setupGenerateButtons();
            
        } else {
            const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
            throw new Error(errorData.detail || `Erro HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error(`❌ Erro ao deletar ${service}:`, error);
        showToast(`Erro ao deletar ${service.toUpperCase()}: ${error.message}`, 'error');
    } finally {
        // Restaura o botão de confirmação em qualquer caso (sucesso ou erro)
        if (confirmBtn) {
            confirmBtn.textContent = 'Sim, deletar';
            confirmBtn.disabled = false;
        }
    }
}

// === FUNÇÕES DE INTERFACE ===
function showSuccessMessage(message) {
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

function showToast(message, type = 'info') {
    // Remove toasts existentes
    const existingToasts = document.querySelectorAll('.toast-message');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    let bgClass = 'bg-blue-500';
    let iconClass = 'uil-info-circle';
    
    switch(type) {
        case 'success':
            bgClass = 'bg-green-500';
            iconClass = 'uil-check-circle';
            break;
        case 'warning':
            bgClass = 'bg-yellow-500';
            iconClass = 'uil-exclamation-triangle';
            break;
        case 'error':
            bgClass = 'bg-red-500';
            iconClass = 'uil-times-circle';
            break;
    }
    
    toast.className = `toast-message fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white ${bgClass} transition-all duration-300 max-w-sm`;
    
    toast.innerHTML = `
        <div class="flex items-start">
            <i class="uil ${iconClass} mr-3 mt-0.5 flex-shrink-0"></i>
            <div class="flex-1">
                <p class="text-sm font-medium">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200">
                <i class="uil uil-times text-sm"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove após 5 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
}

// === FUNÇÕES DE ESTADO DOS CARDS ===
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

function updateCardVisualState(cardType, hasArtifact) {
    const cardElement = document.querySelector(`[data-card-type="${cardType}"]`);
    if (!cardElement) return;

    const card = cardElement.querySelector('.w-full.max-w-xs');
    const icon = cardElement.querySelector('.text-6xl');
    const statusElement = cardElement.querySelector('.artifact-status');

    if (hasArtifact) {
        // Card com artefato
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
        // Card sem artefato
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

// Função global para atualizar estado de um card
window.updateCardState = function(cardType, hasArtifact) {
    console.log(`🔄 Atualizando estado do card ${cardType} para hasArtifact: ${hasArtifact}`);
    
    const cardElement = document.querySelector(`[data-card-type="${cardType}"]`);
    if (!cardElement) {
        console.error(`❌ Card do tipo ${cardType} não encontrado`);
        return;
    }

    const generateButton = cardElement.querySelector('button[id^="gera_"], button:first-of-type');
    const editButton = cardElement.querySelector('button[data-action="edit"]');
    const viewButton = cardElement.querySelector('button[data-action="view"]');
    const deleteButton = cardElement.querySelector('button[data-action="delete"]');

    // Atualiza estado visual
    updateCardVisualState(cardType, hasArtifact);

    if (hasArtifact) {
        // Habilita todos os botões quando artefato existe
        if (generateButton) {
            generateButton.textContent = 'Já Criado';
            generateButton.disabled = true;
            generateButton.classList.add('btn-disabled');
        }
        
        [editButton, viewButton, deleteButton].forEach(button => {
            if (button) {
                button.disabled = false;
                button.classList.remove('btn-disabled');
            }
        });
        
    } else {
        // Desabilita botões quando artefato não existe
        if (generateButton) {
            const isAvailable = isServiceAvailable(cardType);
            generateButton.textContent = isAvailable ? 'Gerar' : 'Em Desenvolvimento';
            generateButton.disabled = !isAvailable;
            generateButton.classList.toggle('btn-disabled', !isAvailable);
            
            // Atualiza classes CSS para botões disponíveis vs em desenvolvimento
            if (isAvailable) {
                generateButton.classList.remove('btn-custom-dev');
                generateButton.classList.add('btn-custom');
            } else {
                generateButton.classList.remove('btn-custom');
                generateButton.classList.add('btn-custom-dev');
            }
        }
        
        [editButton, viewButton, deleteButton].forEach(button => {
            if (button) {
                button.disabled = true;
                button.classList.add('btn-disabled');
            }
        });
    }
};

// Função para verificar se um serviço está disponível
window.isServiceAvailable = function(service) {
    const availableServices = ['dfd', 'pdp', 'pgr', 'etp']; // ✅ ETP incluído
    return availableServices.includes(service);
};

// Função para mostrar notificação de serviço indisponível
window.showServiceNotAvailable = function(serviceName) {
    const serviceNames = {
        'ETP': 'Estudo Técnico Preliminar',
        'TR': 'Termo de Referência',
        'ED': 'Edital',
        'PGR': 'Plano de Gerenciamento de Riscos'
    };
    
    const fullName = serviceNames[serviceName] || serviceName;
    showToast(`O serviço ${fullName} ainda está em desenvolvimento.`, 'warning');
};

// Função para atualizar todos os cards
window.refreshAllCards = function(projectData) {
    if (!projectData) return;
    
    updateCardState('dfd', projectData.exist_dfd || false);
    updateCardState('pdp', projectData.exist_pdp || false);
    updateCardState('pgr', projectData.exist_pgr || false);
    updateCardState('etp', projectData.exist_etp || false); // ✅ ETP incluído
    updateCardState('tr', projectData.exist_tr || false);
    updateCardState('ed', projectData.exist_ed || false);
};
