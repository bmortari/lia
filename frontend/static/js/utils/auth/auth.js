
/**
 * Obtém o token de autenticação do usuário
 * @returns token
 */
export function obterTokenAutenticacao() {
    const tokenLocalStorage =
      localStorage.getItem("access_token") || localStorage.getItem("token");
    const tokenSessionStorage =
      sessionStorage.getItem("access_token") || sessionStorage.getItem("token");

    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    }

    const tokenCookie =
      getCookie("access_token") ||
      getCookie("token") ||
      getCookie("auth_token");

    return tokenLocalStorage || tokenSessionStorage || tokenCookie;
  }

/**
 * Faz uma requisição HTTP para a URL fornecida com autenticação automática.
 * 
 * Essa função:
 * - Obtém o token de autenticação usando `obterTokenAutenticacao()`.
 * - Inclui cookies automaticamente na requisição (`credentials: 'include'`).
 * - Adiciona headers padrão (`Content-Type` e `X-Requested-With`) e permite sobrescrever/acompanhar outros headers via `options.headers`.
 * - Se houver um token, adiciona o header `Authorization: Bearer <token>`.
 * - Caso a requisição inicial retorne 401 (não autorizado) e haja token, tenta novamente sem o token (apenas com cookies).
 * 
 * @param {string} url - A URL para a qual a requisição será feita.
 * @param {Object} [options={}] - Configurações adicionais para o fetch (método, body, headers etc.).
 * @returns {Promise<Response>} - Uma Promise que resolve para o objeto Response da fetch.
 * @throws {Error} - Lança erro caso ocorra algum problema na requisição.
 */
export async function fazerRequisicaoAutenticada(url, options = {}) {
    const token = obterTokenAutenticacao();
    
    // Configuração base da requisição
    const requestConfig = {
        ...options,
        credentials: 'include', // Inclui cookies automaticamente
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...options.headers
        }
    };
    
    // Se tiver token, adiciona ao header Authorization
    if (token) {
        requestConfig.headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Fazendo requisição com config:', requestConfig);
    
    try {
        const response = await fetch(url, requestConfig);
        
        // Se retornar 401, tenta sem token (talvez use só cookies)
        if (response.status === 401 && token) {
            console.log('Tentativa com token falhou, tentando só com cookies...');
            delete requestConfig.headers['Authorization'];
            return await fetch(url, requestConfig);
        }
        
        return response;
        
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}