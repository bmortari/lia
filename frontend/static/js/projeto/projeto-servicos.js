// document.addEventListener('DOMContentLoaded', () => {
//     const btnGerarDFD = document.getElementById('gera_dfd');

//     // Se o botão não estiver presente, encerra a função
//     if (!btnGerarDFD) {
//         console.warn("Botão 'gera_dfd' não encontrado na página.");
//         return;
//     }

//     // Extrai o último segmento da URL (projeto_id)
//     function getProjetoIdFromUrl() {
//         const pathParts = window.location.pathname.split('/');
//         return pathParts.filter(Boolean).pop(); // Remove vazios e pega o último  //o ID deve estar no final da URL
//     }

//     const projetoId = getProjetoIdFromUrl();
//     if (!projetoId) {
//         console.error("ID do projeto não encontrado na URL.");
//         return;
//     }

//     const endpoint = `/projetos/${projetoId}/criar_dfd`;

//     fetch(endpoint)
//         .then(response => {
//             console.log("Verificando se o DFD já foi gerado...");
//             if (!response.ok) throw new Error("Erro na resposta da API.");

//             const contentType = response.headers.get("content-type");
//             if (contentType && contentType.includes("application/json")) {
//                 return response.json();
//             } else {
//                 return response.text(); // trata como texto (HTML, string, etc.)
//             }
//         })
//         .then(data => {

//             console.log("Artefato DFD encontrado:", data);

//             if (data && data.trim() !== "") {
//                 // Esconde o botão
//                 btnGerarDFD.style.display = 'none';

//                 // Mostra o ID do artefato
//                 const parent = btnGerarDFD.parentElement;
//                 const artefatoInfo = document.createElement('p');
//                 artefatoInfo.className = 'text-center text-sm text-gray-700 dark:text-gray-300 mt-2';
//                 artefatoInfo.innerText = `Artefato já gerado`;
//                 parent.insertBefore(artefatoInfo, btnGerarDFD);
//             }
//         })
//         .catch(error => {
//             console.log("Artefato ainda não gerado ou erro:", error.message);
//         });
// });

document.getElementById('gera_dfd').addEventListener('click', () => {
    // Obtém a URL atual
    const currentUrl = window.location.href;

    // Garante que não termine com uma barra dupla
    const newUrl = currentUrl.endsWith('/')
        ? currentUrl + 'criar_dfd'
        : currentUrl + '/criar_dfd';

    // Redireciona para a nova URL
    window.location.href = newUrl;
});


// Event listener para o botão "Voltar ao Início"
const btnVoltarInicio = document.getElementById('logo-lia');
if (btnVoltarInicio) {
    btnVoltarInicio.addEventListener('click', () => {
        // Navegar para a raiz do site
        const url = new URL(window.location.href);
        window.location.href = url.origin
    });
}

document.getElementById('gera_pdp').addEventListener('click', () => {
    // Obtém a URL atual
    const currentUrl = window.location.href;

    // Garante que não termine com uma barra dupla
    const newUrl = currentUrl.endsWith('/')
        ? currentUrl + 'criar_pdp'
        : currentUrl + '/criar_pdp';

    // Redireciona para a nova URL
    window.location.href = newUrl;
});