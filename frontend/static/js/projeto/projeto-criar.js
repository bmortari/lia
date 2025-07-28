// Seleciona o formulário pelo ID que você adicionou
const form = document.getElementById('form-criar-projeto');

const url = window.location.origin; // Endpoint para criar o projeto


// Adiciona um "ouvinte" para o evento de submissão
form.addEventListener('submit', async (event) => {
    // Impede o comportamento padrão do navegador (que é recarregar a página)
    event.preventDefault();

    // Coleta os dados do formulário
    const nome = document.getElementById('project_name').value;
    const descricao = document.getElementById('description').value;
    const tipo = document.querySelector('input[name="tipo-projeto"]:checked').value;

    // Estrutura o corpo da requisição como um objeto JSON
    const requestBody = {
        nome: nome,
        descricao: descricao,
        tipo: tipo
    };
    
    try {
        // Usa a API Fetch para enviar os dados
        const response = await fetch(url + '/projetos/', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json', 
                'remote-user': 'user.test', // REMOVER O HARDCODING AO COLOCAR EM PRODUÇÃO
                'remote-groups': 'TI,OUTROS' // REMOVER O HARDCODING AO COLOCAR EM PRODUÇÃO
            },
            body: JSON.stringify(requestBody),
        });

        if (response.ok) {
            // Converte a resposta do servidor para JSON
            const projeto = await response.json();
            alert("Projeto criado com sucesso!");
            window.location.href = `/projetos/${projeto.id_projeto}`;
        } else {
            // Se a resposta não for OK, joga um erro para ser capturado pelo catch
            throw new Error('Erro ao criar projeto');
        }

    } catch (error) {
        // Em caso de erro, exibe o alerta
        alert("Um erro ocorreu, tente novamente mais tarde."); // Exibir diretamente no HTML?
    } finally {
        // limpa o formulário após o envio, seja sucesso ou erro
        form.reset();
    }
});

// Event listener para o botão "Voltar ao Início"
const btnVoltarInicio = document.getElementById('btn-voltar-inicio');
if (btnVoltarInicio) {
    btnVoltarInicio.addEventListener('click', () => {
        // Navegar para a raiz do site
        const url = new URL(window.location.href);
        window.location.href = url.origin
    });
}