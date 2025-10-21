import { getProjectIdFromUrl } from "../utils/projeto/getProject.js";
import { obterTokenAutenticacao } from "../utils/auth/auth.js";

const ORGAO_CONTRATANTE = "Tribunal Regional Eleitoral do Acre";

// ✅ FUNÇÃO AUXILIAR: Fazer requisição com autenticação
async function fazerRequisicaoAutenticada(url, options = {}) {
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 tr-solicitacao.js carregado');

    const form = document.getElementById('tr-solicitacao-form');
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('progress-bar');
    const sendButton = document.getElementById('gerar-button');
    const voltarButton = document.getElementById('voltar-inicio');

    if (!form) {
        console.error('❌ Formulário tr-solicitacao-form não encontrado');
        return;
    }

    const projectId = getProjectIdFromUrl();
    if (!projectId) {
        console.error('❌ ID do projeto não encontrado na URL');
        return;
    }

    // Event listener para botão voltar
    if (voltarButton) {
        voltarButton.addEventListener('click', function() {
            console.log('🏠 Redirecionando para serviços do projeto');
            window.location.href = `/projetos/${projectId}`;
        });
    }

    // Função para mostrar loading
    function showLoading() {
        loadingOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        let progress = 0;
        const totalDuration = 1 * 60 * 1000; // 60 segundos em milissegundos
        const intervalTime = 1000; // Atualiza a cada segundo
        const progressIncrement = (100 / (totalDuration / intervalTime)) * 0.95; // Incrementar para atingir 95% em 4 minutos

        const interval = setInterval(() => {
            progress += progressIncrement;
            if (progress > 95) {
                progress = 95;
            }
            progressBar.style.width = progress + '%';
        }, intervalTime);

        return interval;
    }

    // Função para esconder loading
    function hideLoading(interval) {
        clearInterval(interval);
        progressBar.style.width = '100%';
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            document.body.style.overflow = '';
            progressBar.style.width = '0%';
        }, 500);
    }

    // Event listener para submit do form
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📤 Submetendo formulário TR');

        // Coleta dados do form
        const prompt = document.getElementById('prompt').value.trim();
        const modalidadeLicitacao = document.querySelector('input[name="modalidade_licitacao"]:checked')?.value;
        const tipoContratacao = document.querySelector('input[name="tipo_contratacao"]:checked')?.value;

        if (!modalidadeLicitacao || !tipoContratacao) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const postData = {
            orgao_contratante: ORGAO_CONTRATANTE,
            prompt: prompt || '',
            modalidade_licitacao: modalidadeLicitacao,
            tipo_contratacao: tipoContratacao
        };

        console.log('📤 Enviando dados:', postData);

        const loadingInterval = showLoading();

        try {
            const response = await fazerRequisicaoAutenticada(`/projetos/${projectId}/create_tr`, {
                method: 'POST',
                headers: {
                    'remote-user': 'user.test',
                    'remote-groups': 'TI,OUTROS'
                },
                body: JSON.stringify(postData)
            });

            if(response.ok) {
                const trCriado = await response.json();
                console.log('✅ TR criado:', trCriado);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Erro na resposta da API:', response.status, errorData);

                if (response.status === 401) {
                    exibirAlerta(
                        'Erro de Autenticação', 
                        'Você não está autenticado. Por favor, faça login novamente.', 
                        'error'
                    );
                } else if (response.status === 403) {
                    exibirAlerta(
                        'Erro de Permissão', 
                        'Você não tem permissão para editar este TR.', 
                        'error'
                    );
                } else if (response.status == 422) {
                    exibirAlerta(
                        'Erro ao Salvar',
                        '',
                        'error'
                    );
                }
            } 

            hideLoading(loadingInterval);

            // Redireciona para curadoria
            window.location.href = `/projetos/${projectId}/confere_tr`;

        } catch (error) {
            console.error('❌ Erro ao criar TR:', error);
            hideLoading(loadingInterval);
            alert(`Erro ao gerar TR: ${error.message}`);
        }
    });
});