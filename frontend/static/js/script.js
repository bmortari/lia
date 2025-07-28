document.addEventListener('DOMContentLoaded', async () => {
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

    // ✅ Mover para dentro do DOMContentLoaded
    const iniciarBtn = document.getElementById('iniciar_projeto');
    if (iniciarBtn) {
        iniciarBtn.addEventListener('click', () => {
            // Método mais direto - remove hash da string original primeiro
            let baseUrl = window.location.href.split('#')[0];
            
            const url = new URL(baseUrl);
            
            // Adiciona o endpoint
            url.pathname = url.pathname.endsWith('/') 
                ? url.pathname + 'criar_projeto'
                : url.pathname + '/criar_projeto';
            
            window.location.href = url.href;
        });
    }
});
