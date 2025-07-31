document.addEventListener('DOMContentLoaded', async () => {
    const url = window.location.origin;

    const projectList = document.getElementById('lista-projetos');

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    };

    // Função para mostrar notificações
    function showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // Função para carregar projetos
    async function loadProjects() {
        try {
            const response = await fetch(`${url}/projetos/?limit=15`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'remote-user': 'user.test',
                    'remote-groups': 'TI,OUTROS'
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar projetos');
            }

            const projects = await response.json();
            projectList.innerHTML = '';

            if (projects.length === 0) {
                projectList.innerHTML = '<li class="text-gray-500 text-center py-4">Nenhum projeto encontrado.<br><small>Clique em "Dados Demo" para carregar exemplos</small></li>';
                return;
            }

            projects.sort((a, b) => new Date(b.dt_created) - new Date(a.dt_created));

            projects.forEach(project => {
                console.log(project);
                const listItem = document.createElement('li');
                listItem.className = 'flex flex-col';
                listItem.innerHTML = `
                    <p class="pl-5 text-sm text-gray-500 mb-1">${formatDate(project.dt_created)}</p>
                    <a href="${url}/projetos/${project.id_projeto}/" class="flex items-center p-3 text-base font-bold text-gray-900 rounded-lg bg-gray-50 hover:bg-gray-100 group hover:shadow dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white">
                        <span class="flex-1 ms-3 whitespace-nowrap"> ${project.nome}</span>
                    </a>
                `;
                projectList.appendChild(listItem);
            });

        } catch (error) {
            console.error('Falha ao carregar projetos:', error);
            projectList.innerHTML = '<li class="text-red-500">Não foi possível carregar os projetos.</li>';
        }
    }

    // Função para verificar arquivo seed
    async function verificarArquivoSeed() {
        try {
            const response = await fetch(`${url}/verificar-arquivo-seed`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'remote-user': 'user.test',
                    'remote-groups': 'TI,OUTROS'
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao verificar arquivo seed');
            }

            const result = await response.json();
            console.log('Info do arquivo seed:', result);
            
            if (!result.arquivo_existe) {
                showNotification('❌ Arquivo seed_example.sql não encontrado!', 'error');
                return false;
            }
            
            if (result.tamanho_bytes === 0) {
                showNotification('⚠️ Arquivo seed_example.sql está vazio!', 'error');
                return false;
            }
            
            showNotification(`✅ Arquivo encontrado (${result.tamanho_bytes} bytes)`, 'info', 3000);
            return true;
            
        } catch (error) {
            console.error('Erro ao verificar arquivo seed:', error);
            showNotification(`❌ Erro ao verificar arquivo: ${error.message}`, 'error');
            return false;
        }
    }

    // Função para carregar dados demo
    async function loadDemoData() {
        const demoBtn = document.getElementById('carregar_dados_demo');
        const btnText = document.getElementById('demo-btn-text');
        const loadingText = document.getElementById('demo-loading');

        // Primeiro, verificar se o arquivo existe
        const arquivoOk = await verificarArquivoSeed();
        if (!arquivoOk) {
            return;
        }

        // Desabilitar botão e mostrar loading
        demoBtn.disabled = true;
        btnText.classList.add('hidden');
        loadingText.classList.remove('hidden');

        try {
            console.log('Iniciando carregamento de dados demo...');
            
            const response = await fetch(`${url}/popular-dados-demo`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'remote-user': 'user.test',
                    'remote-groups': 'TI,OUTROS'
                }
            });

            const result = await response.json();
            console.log('Resultado do carregamento:', result);

            if (!response.ok) {
                throw new Error(result.detail || 'Erro ao carregar dados demo');
            }

            if (result.status === 'ja_populado') {
                showNotification(`ℹ️ ${result.message} (${result.projetos_existentes} projetos)`, 'info');
            } else {
                const detalhes = [
                    `✅ ${result.message}`,
                    `📊 Projetos: ${result.total_projetos}`,
                    `📝 Comandos executados: ${result.comandos_executados}`,
                    result.insert_commands ? `➕ INSERTs: ${result.insert_commands}` : '',
                    result.update_commands ? `🔄 UPDATEs: ${result.update_commands}` : ''
                ].filter(Boolean).join('<br>');
                
                showNotification(detalhes, 'success', 7000);
            }
            
            // Recarregar a lista de projetos
            setTimeout(async () => {
                await loadProjects();
            }, 1000);

        } catch (error) {
            console.error('Erro ao carregar dados demo:', error);
            showNotification(`❌ Erro: ${error.message}`, 'error');
        } finally {
            // Reabilitar botão
            demoBtn.disabled = false;
            btnText.classList.remove('hidden');
            loadingText.classList.add('hidden');
        }
    }

    // Função para limpar dados demo (para debug)
    async function limparDadosDemo() {
        if (!confirm('Tem certeza que deseja limpar todos os dados demo?')) {
            return;
        }
        
        try {
            const response = await fetch(`${url}/limpar-dados-demo`, {
                method: 'DELETE',
                headers: {
                    'accept': 'application/json',
                    'remote-user': 'user.test',
                    'remote-groups': 'TI,OUTROS'
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || 'Erro ao limpar dados demo');
            }

            showNotification('🗑️ Dados demo limpos com sucesso!', 'success');
            await loadProjects();

        } catch (error) {
            console.error('Erro ao limpar dados demo:', error);
            showNotification(`❌ Erro: ${error.message}`, 'error');
        }
    }

    // Carregar projetos inicialmente
    await loadProjects();

    // Event listener para iniciar projeto
    const iniciarBtn = document.getElementById('iniciar_projeto');
    if (iniciarBtn) {
        iniciarBtn.addEventListener('click', () => {
            let baseUrl = window.location.href.split('#')[0];
            const url = new URL(baseUrl);
            url.pathname = url.pathname.endsWith('/') 
                ? url.pathname + 'criar_projeto'
                : url.pathname + '/criar_projeto';
            window.location.href = url.href;
        });
    }

    // Event listener para carregar dados demo
    const demoBtn = document.getElementById('carregar_dados_demo');
    if (demoBtn) {
        demoBtn.addEventListener('click', loadDemoData);
    }

    // Adicionar botão de debug para limpar dados (apenas em desenvolvimento)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const debugBtn = document.createElement('button');
        debugBtn.innerHTML = '🗑️ Limpar Demo (Debug)';
        debugBtn.className = 'btn-demo cursor-pointer font-medium rounded-lg text-sm px-4 py-2.5 focus:outline-none';
        debugBtn.style.backgroundColor = '#dc3545';
        debugBtn.addEventListener('click', limparDadosDemo);
        
        const btnGroup = document.querySelector('.btn-group');
        if (btnGroup) {
            btnGroup.appendChild(debugBtn);
        }
    }

    // Event listener para verificar arquivo (Ctrl+Shift+V)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
            verificarArquivoSeed();
        }
    });
});