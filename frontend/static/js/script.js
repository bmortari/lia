// Variável global para armazenar info de debug
let debugInfo = {};

// Mostrar debug info em desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.getElementById('debug-info').style.display = 'block';
}

// Função para mostrar notificações melhorada
function showNotification(message, type = 'info', duration = 5000) {
    // Remover notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);

    console.log(`[${type.toUpperCase()}] ${message.replace(/<br>/g, ' | ')}`);

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
    const url = window.location.origin;
    const projectList = document.getElementById('lista-projetos');

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    };

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

        console.log(`📊 Projetos carregados: ${projects.length}`);

        if (projects.length === 0) {
            projectList.innerHTML = '<li class="text-gray-500 text-center py-4">Nenhum projeto encontrado.<br><small>Clique em "Dados Demo" para carregar exemplos</small></li>';
            return;
        }

        projects.sort((a, b) => new Date(b.dt_created) - new Date(a.dt_created));

        projects.forEach(project => {
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
        console.error('❌ Falha ao carregar projetos:', error);
        projectList.innerHTML = '<li class="text-red-500 text-center py-4">Não foi possível carregar os projetos.</li>';
    }
}

// Função melhorada para verificar arquivo seed
async function verificarArquivoSeed() {
    const url = window.location.origin;
    try {
        console.log('🔍 Verificando arquivo seed...');
        
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
        debugInfo = result;
        console.log('📄 Info do arquivo seed:', result);
        
        if (!result.arquivo_existe) {
            showNotification('❌ Arquivo seed_example.sql não encontrado!', 'error');
            return false;
        }
        
        if (result.tamanho_bytes === 0) {
            showNotification('⚠️ Arquivo seed_example.sql está vazio!', 'warning');
            return false;
        }

        const infoMsg = [
            `✅ Arquivo encontrado`,
            `📏 Tamanho: ${result.tamanho_bytes} bytes`,
            `🛠️ Comandos SQL: ${result.total_comandos_sql || 0}`
        ].join('<br>');
        
        showNotification(infoMsg, 'info', 4000);

        // Mostrar comandos SQL no debug se disponível
        if (result.comandos_preview && result.comandos_preview.length > 0) {
            const debugCommands = document.getElementById('debug-commands');
            debugCommands.innerHTML = `
                <strong>Comandos SQL encontrados (${result.total_comandos_sql}):</strong><br>
                ${result.comandos_preview.map((cmd, i) => `${i+1}. ${cmd}`).join('<br>')}
            `;
            debugCommands.style.display = 'block';
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao verificar arquivo seed:', error);
        showNotification(`❌ Erro ao verificar arquivo: ${error.message}`, 'error');
        return false;
    }
}

// Função melhorada para carregar dados demo
async function loadDemoData() {
    const url = window.location.origin;
    const demoBtn = document.getElementById('carregar_dados_demo');
    const btnText = document.getElementById('demo-btn-text');
    const loadingText = document.getElementById('demo-loading');

    console.log('🚀 Iniciando carregamento de dados demo...');

    // Primeiro, verificar se o arquivo existe
    const arquivoOk = await verificarArquivoSeed();
    if (!arquivoOk) {
        console.log('❌ Arquivo seed não está OK, cancelando carregamento');
        return;
    }

    // Desabilitar botão e mostrar loading
    demoBtn.disabled = true;
    btnText.classList.add('hidden');
    loadingText.classList.remove('hidden');

    try {
        console.log('📡 Enviando requisição para popular dados...');
        
        const response = await fetch(`${url}/popular-dados-demo`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'remote-user': 'user.test',
                'remote-groups': 'TI,OUTROS'
            }
        });

        const result = await response.json();
        console.log('📊 Resultado do carregamento:', result);

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
                result.update_commands ? `🔄 UPDATEs: ${result.update_commands}` : '',
                result.delete_commands ? `🗑️ DELETEs: ${result.delete_commands}` : ''
            ].filter(Boolean).join('<br>');
            
            showNotification(detalhes, 'success', 8000);
        }
        
        // Recarregar a lista de projetos
        console.log('🔄 Recarregando lista de projetos...');
        setTimeout(async () => {
            await loadProjects();
        }, 1000);

    } catch (error) {
        console.error('❌ Erro ao carregar dados demo:', error);
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
    
    const url = window.location.origin;
    try {
        console.log('🗑️ Limpando dados demo...');
        
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

        console.log('✅ Dados limpos:', result);
        showNotification('🗑️ Dados demo limpos com sucesso!', 'success');
        await loadProjects();

    } catch (error) {
        console.error('❌ Erro ao limpar dados demo:', error);
        showNotification(`❌ Erro: ${error.message}`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Aplicação iniciada');
    
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
        debugBtn.innerHTML = '🗑️ Limpar Demo';
        debugBtn.className = 'btn-demo cursor-pointer font-medium rounded-lg text-sm px-4 py-2.5 focus:outline-none';
        debugBtn.style.backgroundColor = '#dc3545';
        debugBtn.addEventListener('click', limparDadosDemo);
        
        const btnGroup = document.querySelector('.btn-group');
        if (btnGroup) {
            btnGroup.appendChild(debugBtn);
        }
    }

    // Event listeners para debug
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey) {
            if (e.key === 'V') {
                e.preventDefault();
                verificarArquivoSeed();
            } else if (e.key === 'C') {
                e.preventDefault();
                console.log('🐛 Debug Info:', debugInfo);
                if (debugInfo.comandos_preview) {
                    console.log('📝 Comandos SQL:', debugInfo.comandos_preview);
                }
            }
        }
    });

    console.log('✅ Aplicação carregada com sucesso');
});