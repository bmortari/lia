// Aguarda o DOM estar pronto para executar o script
document.addEventListener('DOMContentLoaded', () => {

    // URL base da API (copiada de projeto-historico.js para manter o modal independente)
    const url = window.location.origin;

    // HTML do modal, usando classes do TailwindCSS para estilização consistente
    const modalHTML = `
        <div id="edit-project-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 hidden">
            <div id="modal-content" class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
                
                <div class="flex items-start justify-between pb-4 border-b rounded-t">
                    <h3 class="text-xl font-semibold text-gray-900">
                        Editar projeto
                    </h3>
                    <button type="button" id="close-modal-btn" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center">
                        <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                        </svg>
                        <span class="sr-only">Fechar modal</span>
                    </button>
                </div>

                <form id="edit-project-form" class="mt-5 space-y-6">
                    <input type="hidden" id="edit-project-id">
                    
                    <div>
                        <label for="edit-project-name" class="block mb-2 text-sm font-medium text-gray-900">Nome do projeto:</label>
                        <input type="text" id="edit-project-name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required>
                    </div>

                    <div>
                        <label for="edit-project-description" class="block mb-2 text-sm font-medium text-gray-900">Descrição:</label>
                        <textarea id="edit-project-description" rows="4" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required></textarea>
                    </div>

                    <div>
                        <label class="block mb-3 text-sm font-medium text-gray-900">Selecione o tipo do projeto:</label>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                            ${['Bens', 'Serviços', 'Obras', 'TI', 'Locações', 'Capacitação', 'Outros'].map(type => `
                                <div class="flex items-center">
                                    <input id="type-${type.toLowerCase().replace('.', '')}" type="radio" value="${type}" name="projectType" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500">
                                    <label for="type-${type.toLowerCase().replace('.', '')}" class="ms-2 text-sm font-medium text-gray-900">${type}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex justify-end pt-4 border-t mt-6">
                        <button type="submit" class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
                            Editar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Injeta o HTML do modal no final do body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Seleciona os elementos do modal após serem criados
    const modal = document.getElementById('edit-project-modal');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.getElementById('close-modal-btn');
    const editForm = document.getElementById('edit-project-form');

    // --- FUNÇÕES DO MODAL ---

    /**
     * Fecha o modal
     */
    const closeModal = () => {
        modal.classList.add('hidden');
    };

    /**
     * Abre o modal e preenche com os dados do projeto
     * @param {object} project - O objeto do projeto com id, nome, tipo e descricao.
     */
    const openModal = (project) => {
        // Preenche os campos do formulário
        document.getElementById('edit-project-id').value = project.id;
        document.getElementById('edit-project-name').value = project.nome;
        document.getElementById('edit-project-description').value = project.descricao;

        // Pega todos os radio buttons de tipo
        const allTypeRadios = document.querySelectorAll('input[name="projectType"]');
        
        // Converte o tipo do projeto para minúsculas para uma comparação segura
        const projectTypeLower = project.tipo.trim().toLowerCase();

        // Itera sobre os radio buttons para encontrar o correto
        allTypeRadios.forEach(radio => {
            // Compara o valor do radio (também em minúsculas) com o tipo do projeto
            if (radio.value.toLowerCase() === projectTypeLower) {
                radio.checked = true;
            } else {
                radio.checked = false; // Garante que outros não fiquem marcados
            }
        });
        
        // Mostra o modal
        modal.classList.remove('hidden');
    };

    // --- EVENT LISTENERS ---

    // Fecha o modal ao clicar no botão 'x'
    closeBtn.addEventListener('click', closeModal);

    // Fecha o modal ao clicar fora da área de conteúdo
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    
    // Lida com o envio do formulário de edição para a API
    editForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = editForm.querySelector('button[type="submit"]');
        const id = document.getElementById('edit-project-id').value;

        // Cria o corpo da requisição conforme a documentação da API
        const requestBody = {
            nome: document.getElementById('edit-project-name').value,
            descricao: document.getElementById('edit-project-description').value,
            tipo: document.querySelector('input[name="projectType"]:checked').value.toUpperCase()
        };

        // Desabilita o botão para evitar múltiplos cliques
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            const endpoint = `${url}/projetos/${id}`;
            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'remote-user': 'user.test', // Conforme usado na requisição GET
                    'remote-groups': 'TI, OUTROS'  // Conforme usado na requisição GET
                },
                body: JSON.stringify(requestBody)
            });

            // Se a resposta não for OK, trata o erro
            if (!response.ok) {
                // Erro de validação (422)
                if (response.status === 422) {
                    console.log(document.querySelector('input[name="projectType"]:checked').value)
                    const errorData = await response.json();
                    // Formata a mensagem de erro para ser mais legível
                    const errorMessages = errorData.detail.map(e => `Campo '${e.loc[1]}': ${e.msg}`).join('\n');
                    alert(`Erro de validação:\n${errorMessages}`);
                } else {
                    // Outros erros de servidor
                    throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
                }
                return; // Para a execução aqui se houve erro
            }

            // Se a requisição foi um sucesso (200 OK)
            const updatedProject = await response.json();

            alert('Projeto atualizado com sucesso!');
            closeModal();

            // Atualiza a linha na tabela da página principal sem recarregar
            const rowToUpdate = document.querySelector(`tr[data-id="${id}"]`);
            if (rowToUpdate) {
                rowToUpdate.cells[1].textContent = updatedProject.nome;
                rowToUpdate.cells[2].textContent = updatedProject.tipo;
                rowToUpdate.cells[3].textContent = updatedProject.descricao;
            }

        } catch (error) {
            console.error('Falha ao atualizar o projeto:', error);
            alert('Ocorreu uma falha na comunicação com o servidor. Tente novamente.');
        } finally {
            // Reabilita o botão ao final da operação (sucesso ou falha)
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Alterações';
        }
    });

    // Expõe a função openModal globalmente para que possa ser chamada por outros scripts
    window.openEditModal = openModal;
});