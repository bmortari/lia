// Aguarda o carregamento completo do DOM antes de executar os scripts
document.addEventListener("DOMContentLoaded", () => {
  // Seleciona os elementos da página
  const tableBody = document.querySelector("table tbody");
  const searchInput = document.getElementById("table-search");
  const dropdownContainer = document.getElementById("dropdown");
  const dropdownButton = document.getElementById("dropdownDefaultButton");
  const dropdownButtonText = dropdownButton.childNodes[0]; // Pega o nó de texto do botão

  const url = window.location.origin;

  // Variável para armazenar o estado atual do filtro de tipo
  let selectedType = "todos"; // 'todos' é o valor padrão para mostrar tudo

  /**
   * Função central que aplica AMBOS os filtros (pesquisa e tipo) na tabela.
   */
  function applyFilters() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const rows = tableBody.querySelectorAll("tr");

    rows.forEach((row) => {
      // Ignora as linhas de mensagem (ex: "Nenhum projeto encontrado")
      if (row.querySelector("th")) {
        const projectName = row.querySelector("th").textContent.toLowerCase();
        // A célula do tipo é a 3ª na linha (índice 2)
        const projectType = row.children[2].textContent.trim().toLowerCase();

        // Verifica se a linha corresponde aos dois filtros
        const nameMatches = projectName.includes(searchTerm);
        const typeMatches =
          selectedType === "todos" || projectType === selectedType;

        // A linha só é exibida se corresponder a AMBOS os critérios
        if (nameMatches && typeMatches) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      }
    });
  }

  /**
   * Configura o ouvinte de eventos para o filtro de pesquisa.
   */
  function setupSearchFilter() {
    // Agora, o input de pesquisa apenas chama a função de filtro central
    searchInput.addEventListener("input", applyFilters);
  }

  /**
   * Configura o ouvinte de eventos para o filtro de tipo (dropdown).
   */
  function setupTypeFilter() {
    dropdownContainer.addEventListener("click", (event) => {
      // Usa delegação de eventos para ouvir cliques nos links <a>
      if (event.target.tagName === "A") {
        event.preventDefault(); // Impede que a página pule para o topo

        // Pega o tipo do atributo data-filter-type
        const type = event.target.dataset.filterType;
        selectedType = type; // Atualiza a variável de estado do filtro

        // Atualiza o texto do botão para mostrar a seleção atual
        dropdownButtonText.textContent = event.target.textContent + " ";

        // Chama a função de filtro central para atualizar a tabela
        applyFilters();
      }
    });
  }

  // --- FUNÇÕES DE BUSCA E RENDERIZAÇÃO (sem alterações) ---
  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  }

  async function fetchAndRenderProjects() {
    const endpoint = `${url}/projetos`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "remote-user": "user.test",
          "remote-groups": "TI, OUTROS",
        },
      });
      if (!response.ok)
        throw new Error(`Erro na requisição: ${response.statusText}`);

      const projects = await response.json();
      tableBody.innerHTML = "";

      if (projects.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="6" class="text-center px-6 py-4">Nenhum projeto encontrado.</td></tr>';
        return;
      }

      projects.forEach((project) => {
        const row = `
                    <tr class="bg-white border-b hover:bg-gray-50"  data-id=${
                      project.id_projeto
                    }>
                        <td class="px-6 py-4">${formatDate(
                          project.dt_created
                        )}</td>
                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${
                          project.nome
                        }</th>
                        <td class="px-6 py-4">${project.tipo}</td>
                        <td class="px-6 py-4">${project.descricao}</td>
                        <td class="px-6 py-4">${project.user_created}</td>
                        <td class="px-6 py-4 flex gap-2">
                            <button class="text-blue-600 hover:underline view-btn" data-id="${
                              project.id_projeto
                            }">Ver</button>
                            <button class="text-yellow-500 hover:underline edit-btn" data-id="${
                              project.id_projeto
                            }">Editar</button>
                            <button class="text-red-600 hover:underline delete-btn" data-id="${
                              project.id_projeto
                            }">Excluir</button>
                        </td>
                    </tr>
                `;
        tableBody.innerHTML += row;
      });
    } catch (error) {
      console.error("Falha ao buscar projetos:", error);
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center px-6 py-4 text-red-500">Falha ao carregar os projetos. Tente novamente mais tarde.</td></tr>`;
    }
  }

  /**
   * Função para deletar um projeto específico
   */
  async function deleteProject(projectId, rowElement) {
    const endpoint = `${url}/projetos/${projectId}`;

    try {
      // Desabilita o botão de exclusão durante a operação
      const deleteBtn = rowElement.querySelector(".delete-btn");
      const originalText = deleteBtn.textContent;
      deleteBtn.textContent = "Excluindo...";
      deleteBtn.disabled = true;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "remote-user": "user.test",
          "remote-groups": "TI, OUTROS",
        },
      });

      if (response.status === 204) {
        // Sucesso - remove a linha da tabela com animação suave
        rowElement.style.transition = "opacity 0.3s ease";
        rowElement.style.opacity = "0";

        setTimeout(() => {
          rowElement.remove();

          // Verifica se ainda há projetos na tabela
          const remainingRows = tableBody.querySelectorAll("tr");
          if (remainingRows.length === 0) {
            tableBody.innerHTML =
              '<tr><td colspan="6" class="text-center px-6 py-4">Nenhum projeto encontrado.</td></tr>';
          }
        }, 300);
      } else if (response.status === 403) {
        alert(
          "Você não tem permissão para excluir este projeto. Apenas o criador do projeto pode excluí-lo."
        );
      } else if (response.status === 404) {
        alert("Projeto não encontrado.");
      } else {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Falha ao deletar projeto:", error);
      alert("Erro ao excluir o projeto. Tente novamente mais tarde.");

      // Reabilita o botão em caso de erro
      const deleteBtn = rowElement.querySelector(".delete-btn");
      deleteBtn.textContent = originalText;
      deleteBtn.disabled = false;
    }
  }

  // --- EXECUÇÃO ---
  setupSearchFilter();
  setupTypeFilter();
  fetchAndRenderProjects(); // A busca de dados continua como antes

  // function setupRowClick() {
  //     tableBody.addEventListener('click', (event) => {
  //         const clickedRow = event.target.closest('tr.clickable-row');
  //         if (clickedRow) {
  //             // const projectName = clickedRow.querySelector('th').textContent;
  //             // console.log('Linha clicada:', projectName);

  //             const projectId = clickedRow.dataset.id;
  //             window.location.href = `${url}/projetos/${projectId}/`;
  //         }
  //     });
  // }

  // setupRowClick();

  function setupActionButtons() {
    tableBody.addEventListener("click", (event) => {
      const target = event.target;

      if (target.classList.contains("view-btn")) {
        const projectId = target.dataset.id;
        window.location.href = `${url}/projetos/${projectId}/`;
      }

      // MODIFIQUE ESTE BLOCO 'IF'
      if (target.classList.contains("edit-btn")) {
        const row = target.closest("tr"); // Pega a linha (tr) mais próxima
        const project = {
          id: row.dataset.id,
          nome: row.cells[1].textContent, // Célula do Nome
          tipo: row.cells[2].textContent, // Célula do Tipo
          descricao: row.cells[3].textContent, // Célula da Descrição
        };

        // Chama a função global do modal.js para abrir o modal
        window.openEditModal(project);
      }

      if (target.classList.contains("delete-btn")) {
        const projectId = target.dataset.id;
        const projectName = target
          .closest("tr")
          .querySelector("th").textContent;

        // Confirma antes de deletar
        if (
          confirm(
            `Tem certeza que deseja excluir o projeto "${projectName}"? Esta ação não pode ser desfeita.`
          )
        ) {
          deleteProject(projectId, target.closest("tr"));
        }
      }
    });
  }

  setupActionButtons();
});
