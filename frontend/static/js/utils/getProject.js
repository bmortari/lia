/**
 * Extrai id do projeto da url onde o usuário se encontra
 * @returns {string} Id do projeto  
 */
export function getProjectIdFromUrl() {
    const url = window.location.pathname;
    const match = url.match(/\/projetos\/(\d+)\//);
    return match ? match[1] : null;
}