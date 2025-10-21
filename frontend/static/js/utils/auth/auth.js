
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