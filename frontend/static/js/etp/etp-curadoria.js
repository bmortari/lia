document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 ETP Curadoria carregado');
    
    // Função para obter o ID do projeto da URL
    function getProjectIdFromUrl() {
        const url = window.location.pathname;
        const match = url.match(/\/projetos\/(\d+)/);
        return match ? match[1] : null;
    }

    // ✅ FUNÇÃO AUXILIAR: Obter token de autenticação
    function obterTokenAutenticacao() {
        const tokenLocalStorage = localStorage.getItem('access_token') || localStorage.getItem('token');
        const tokenSessionStorage = sessionStorage.getItem('access_token') || sessionStorage.getItem('token');
        
        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }
        
        const tokenCookie = getCookie('access_token') || getCookie('token') || getCookie('auth_token');
        
        return tokenLocalStorage || tokenSessionStorage || tokenCookie;
    }

    // ✅ FUNÇÃO AUXILIAR: Fazer requisição com autenticação
    async function fazerRequisicaoAutenticada(url, options = {}) {
        const token = obterTokenAutenticacao();
        
        const requestConfig = {
            ...options,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            }
        };
        
        if (token) {
            requestConfig.headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('Fazendo requisição ETP com config:', requestConfig);
        
        try {
            const response = await fetch(url, requestConfig);
            
            if (response.status === 401 && token) {
                console.log('Tentativa com token falhou, tentando só com cookies...');
                delete requestConfig.headers['Authorization'];
                return await fetch(url, requestConfig);
            }
            
            return response;
            
        } catch (error) {
            console.error('Erro na requisição ETP:', error);
            throw error;
        }
    }

    // Função para mostrar status
    function showStatus(message, type = 'info') {
        const statusContainer = document.getElementById('status-container');
        const icons = {
            'info': 'las la-info-circle',
            'success': 'las la-check-circle',
            'error': 'las la-exclamation-triangle',
            'loading': 'las la-spinner la-spin'
        };
        
        const colors = {
            'info': 'blue',
            'success': 'green',
            'error': 'red',
            'loading': 'blue'
        };
        
        const color = colors[type] || 'blue';
        const icon = icons[type] || icons['info'];
        
        statusContainer.innerHTML = `
            <div class="bg-${color}-50 border border-${color}-200 rounded-lg p-4">
                <div class="flex items-center">
                    <i class="${icon} text-${color}-600 text-2xl mr-3"></i>
                    <p class="text-${color}-800">${message}</p>
                </div>
            </div>
        `;
    }

    // Função para ocultar status e mostrar conteúdo
    function hideStatusAndShowContent() {
        const statusContainer = document.getElementById('status-container');
        const etpContent = document.getElementById('etp-content');
        const actionButtons = document.getElementById('action-buttons');
        
        statusContainer.style.display = 'none';
        etpContent.style.display = 'block';
        actionButtons.style.display = 'block';
    }

    // Função para carregar dados do ETP
    async function carregarDadosETP() {
        const projectId = getProjectIdFromUrl();
        
        if (!projectId) {
            showStatus('ID do projeto não encontrado na URL', 'error');
            return;
        }

        try {
            showStatus('Carregando dados do ETP...', 'loading');
            
            const response = await fazerRequisicaoAutenticada(`/projetos/${projectId}/etp`, {
                method: 'GET',
                headers: {
                    'remote-user': 'user.test',
                    'remote-groups': 'TI,OUTROS'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('ETP não encontrado para este projeto. Certifique-se de que foi criado corretamente.');
                } else if (response.status === 401) {
                    throw new Error('Você não está autenticado. Por favor, faça login novamente.');
                } else if (response.status === 403) {
                    throw new Error('Você não tem permissão para visualizar este ETP.');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Erro ${response.status}: ${errorData.detail || 'Erro ao buscar ETP'}`);
                }
            }
            
            const etpList = await response.json();
            console.log('ETPs carregados:', etpList);
            
            if (!etpList || etpList.length === 0) {
                throw new Error('Nenhum ETP encontrado para este projeto.');
            }
            
            // Pegar o primeiro ETP (mais recente)
            const etpData = etpList[0];
            
            // Preencher os campos do formulário
            preencherFormularioETP(etpData);
            
            hideStatusAndShowContent();
            showStatus('ETP carregado com sucesso!', 'success');
            
            // Esconder status após 3 segundos
            setTimeout(() => {
                const statusContainer = document.getElementById('status-container');
                statusContainer.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            console.error('Erro ao carregar ETP:', error);
            showStatus(`Erro ao carregar ETP: ${error.message}`, 'error');
        }
    }

    // Função para preencher o formulário com dados do ETP
    function preencherFormularioETP(etpData) {
        console.log('Preenchendo formulário com dados:', etpData);
        
        // Campos de texto simples
        const camposTexto = {
            'unidade-demandante': etpData.unidade_demandante || '',
            'objeto-contratado': etpData.objeto_contratado || '',
            'necessidade-contratacao': etpData.necessidade_contratacao || '',
            'solucao': etpData.solucao || '',
            'valor-total': etpData.valor_total || '',
            'justif-posic-conclusivo': etpData.justif_posic_conclusivo || '',
            'equipe-de-planejamento': etpData.equipe_de_planejamento || ''
        };
        
        Object.entries(camposTexto).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.value = valor;
            }
        });
        
        // Sistema de Registro de Preços
        if (etpData.sist_reg_preco !== undefined) {
            const srpSim = document.getElementById('srp-sim');
            const srpNao = document.getElementById('srp-nao');
            
            if (etpData.sist_reg_preco) {
                if (srpSim) srpSim.checked = true;
            } else {
                if (srpNao) srpNao.checked = true;
            }
        }
        
        // Posição Conclusiva
        if (etpData.posic_conclusivo !== undefined) {
            const posFavoravel = document.getElementById('pos-favoravel');
            const posContraria = document.getElementById('pos-contraria');
            
            if (etpData.posic_conclusivo) {
                if (posFavoravel) posFavoravel.checked = true;
            } else {
                if (posContraria) posContraria.checked = true;
            }
        }
        
        // Alinhamento Estratégico
        preencherAlinhamentoEstrategico(etpData.alinhamento_estrategico || []);
        
        // Requisitos de Contratação
        preencherRequisitos(etpData.req_contratacao || []);
        
        // Levantamento de Mercado
        preencherLevantamentoMercado(etpData.lev_mercado || {});
    }

    // Função para preencher alinhamento estratégico
    function preencherAlinhamentoEstrategico(alinhamentos) {
        const container = document.getElementById('alinhamento-estrategico-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (alinhamentos.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">Nenhum alinhamento estratégico definido</p>';
            return;
        }
        
        alinhamentos.forEach((alinhamento, index) => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-2 border rounded-md alinhamento-row';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = alinhamento;
            input.className = 'flex-grow p-2 border-gray-300 border rounded-md alinhamento-input';
            input.disabled = true;
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'text-red-500 hover:text-red-700 remove-alinhamento-btn';
            removeBtn.innerHTML = '<i class="las la-trash-alt text-xl"></i>';
            removeBtn.style.display = 'none'; // Inicialmente oculto
            
            removeBtn.onclick = () => {
                const totalRows = container.querySelectorAll('.alinhamento-row').length;
                if (totalRows > 1) {
                    div.remove();
                } else {
                    alert('É necessário manter pelo menos um alinhamento estratégico.');
                }
            };
            
            div.appendChild(input);
            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    }

    // Função para preencher requisitos
    function preencherRequisitos(requisitos) {
        const container = document.getElementById('requisitos-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (requisitos.length === 0) {
            // Criar um requisito vazio
            criarLinhaRequisito('');
            return;
        }
        
        requisitos.forEach(requisito => {
            criarLinhaRequisito(requisito);
        });
    }

    // Função para criar linha de requisito
    function criarLinhaRequisito(requisito = '') {
        const container = document.getElementById('requisitos-container');
        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 p-2 border rounded-md requisito-row';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = requisito;
        input.placeholder = 'Requisito para contratação';
        input.className = 'flex-grow p-2 border-gray-300 border rounded-md requisito-input';
        input.disabled = true;
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'text-red-500 hover:text-red-700 remove-requisito-btn';
        removeBtn.innerHTML = '<i class="las la-trash-alt text-xl"></i>';
        removeBtn.style.display = 'none'; // Inicialmente oculto
        
        removeBtn.onclick = () => {
            const totalRows = container.querySelectorAll('.requisito-row').length;
            if (totalRows > 1) {
                div.remove();
            } else {
                alert('É necessário manter pelo menos um requisito.');
            }
        };
        
        div.appendChild(input);
        div.appendChild(removeBtn);
        container.appendChild(div);
    }

    // Função para preencher levantamento de mercado
    function preencherLevantamentoMercado(levMercado) {
        const pesquisaMercado = document.getElementById('pesquisa-mercado');
        const precoMedio = document.getElementById('preco-medio');
        const observacoesMercado = document.getElementById('observacoes-mercado');
        
        if (pesquisaMercado) pesquisaMercado.value = levMercado.pesquisa_mercado || '';
        if (precoMedio) precoMedio.value = levMercado.preco_medio || '';
        if (observacoesMercado) observacoesMercado.value = levMercado.observacoes || '';
    }

    // Event listener para botões de edição
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-btn')) {
            e.preventDefault();
            const button = e.target.closest('.edit-btn');
            const targetId = button.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            
            if (!targetElement) {
                console.warn(`Elemento com ID ${targetId} não encontrado`);
                return;
            }
            
            const isCurrentlyDisabled = targetElement.disabled;
            
            if (isCurrentlyDisabled) {
                // Habilitar edição
                habilitarEdicao(targetId, button);
            } else {
                // Desabilitar edição
                desabilitarEdicao(targetId, button);
            }
        }
    });

    // Função para habilitar edição
    function habilitarEdicao(targetId, button) {
        const targetElement = document.getElementById(targetId);
        
        if (targetId === 'sist-reg-preco') {
            // Sistema de Registro de Preços (radio buttons)
            const srpSim = document.getElementById('srp-sim');
            const srpNao = document.getElementById('srp-nao');
            if (srpSim) srpSim.disabled = false;
            if (srpNao) srpNao.disabled = false;
        } else if (targetId === 'posic-conclusivo') {
            // Posição Conclusiva (radio buttons)
            const posFavoravel = document.getElementById('pos-favoravel');
            const posContraria = document.getElementById('pos-contraria');
            const justifPosic = document.getElementById('justif-posic-conclusivo');
            if (posFavoravel) posFavoravel.disabled = false;
            if (posContraria) posContraria.disabled = false;
            if (justifPosic) {
                justifPosic.disabled = false;
                justifPosic.focus();
            }
        } else if (targetId === 'alinhamento-estrategico') {
            // Alinhamento estratégico
            const inputs = document.querySelectorAll('.alinhamento-input');
            const removeButtons = document.querySelectorAll('.remove-alinhamento-btn');
            inputs.forEach(input => input.disabled = false);
            removeButtons.forEach(btn => btn.style.display = 'block');
        } else if (targetId === 'lev-mercado') {
            // Levantamento de mercado
            const pesquisaMercado = document.getElementById('pesquisa-mercado');
            const precoMedio = document.getElementById('preco-medio');
            const observacoesMercado = document.getElementById('observacoes-mercado');
            if (pesquisaMercado) {
                pesquisaMercado.disabled = false;
                pesquisaMercado.focus();
            }
            if (precoMedio) precoMedio.disabled = false;
            if (observacoesMercado) observacoesMercado.disabled = false;
        } else {
            // Campo normal
            targetElement.disabled = false;
            targetElement.focus();
            targetElement.classList.remove('editable-content:disabled');
        }
        
        button.innerHTML = '<i class="las la-save mr-1"></i>Salvar';
    }

    // Função para desabilitar edição
    function desabilitarEdicao(targetId, button) {
        const targetElement = document.getElementById(targetId);
        
        if (targetId === 'sist-reg-preco') {
            // Sistema de Registro de Preços (radio buttons)
            const srpSim = document.getElementById('srp-sim');
            const srpNao = document.getElementById('srp-nao');
            if (srpSim) srpSim.disabled = true;
            if (srpNao) srpNao.disabled = true;
        } else if (targetId === 'posic-conclusivo') {
            // Posição Conclusiva (radio buttons)
            const posFavoravel = document.getElementById('pos-favoravel');
            const posContraria = document.getElementById('pos-contraria');
            const justifPosic = document.getElementById('justif-posic-conclusivo');
            if (posFavoravel) posFavoravel.disabled = true;
            if (posContraria) posContraria.disabled = true;
            if (justifPosic) justifPosic.disabled = true;
        } else if (targetId === 'alinhamento-estrategico') {
            // Alinhamento estratégico
            const inputs = document.querySelectorAll('.alinhamento-input');
            const removeButtons = document.querySelectorAll('.remove-alinhamento-btn');
            inputs.forEach(input => input.disabled = true);
            removeButtons.forEach(btn => btn.style.display = 'none');
        } else if (targetId === 'lev-mercado') {
            // Levantamento de mercado
            const pesquisaMercado = document.getElementById('pesquisa-mercado');
            const precoMedio = document.getElementById('preco-medio');
            const observacoesMercado = document.getElementById('observacoes-mercado');
            if (pesquisaMercado) pesquisaMercado.disabled = true;
            if (precoMedio) precoMedio.disabled = true;
            if (observacoesMercado) observacoesMercado.disabled = true;
        } else {
            // Campo normal
            targetElement.disabled = true;
            targetElement.classList.add('editable-content:disabled');
        }
        
        button.innerHTML = '<i class="las la-edit mr-1"></i>Editar';
    }

    // Event listener para adicionar requisito
    const addRequisitoBtn = document.getElementById('add-requisito-btn');
    if (addRequisitoBtn) {
        addRequisitoBtn.addEventListener('click', () => {
            criarLinhaRequisito();
        });
    }

    // Função para extrair dados do formulário
    function extrairDadosFormulario() {
        const dados = {};
        
        // Campos de texto simples
        const camposTexto = {
            'unidade_demandante': 'unidade-demandante',
            'objeto_contratado': 'objeto-contratado',
            'necessidade_contratacao': 'necessidade-contratacao',
            'solucao': 'solucao',
            'valor_total': 'valor-total',
            'justif_posic_conclusivo': 'justif-posic-conclusivo',
            'equipe_de_planejamento': 'equipe-de-planejamento'
        };
        
        Object.entries(camposTexto).forEach(([key, id]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                dados[key] = elemento.value.trim();
            }
        });
        
        // Sistema de Registro de Preços
        const srpSim = document.getElementById('srp-sim');
        if (srpSim) {
            dados.sist_reg_preco = srpSim.checked;
        }
        
        // Posição Conclusiva
        const posFavoravel = document.getElementById('pos-favoravel');
        if (posFavoravel) {
            dados.posic_conclusivo = posFavoravel.checked;
        }
        
        // Alinhamento Estratégico
        const alinhamentoInputs = document.querySelectorAll('.alinhamento-input');
        dados.alinhamento_estrategico = Array.from(alinhamentoInputs)
            .map(input => input.value.trim())
            .filter(value => value.length > 0);
        
        // Requisitos de Contratação
        const requisitoInputs = document.querySelectorAll('.requisito-input');
        dados.req_contratacao = Array.from(requisitoInputs)
            .map(input => input.value.trim())
            .filter(value => value.length > 0);
        
        // Levantamento de Mercado
        const pesquisaMercado = document.getElementById('pesquisa-mercado');
        const precoMedio = document.getElementById('preco-medio');
        const observacoesMercado = document.getElementById('observacoes-mercado');
        
        dados.lev_mercado = {
            pesquisa_mercado: pesquisaMercado ? pesquisaMercado.value.trim() : '',
            preco_medio: precoMedio ? parseFloat(precoMedio.value) || 0 : 0,
            observacoes: observacoesMercado ? observacoesMercado.value.trim() : ''
        };
        
        return dados;
    }

    // Event listener para salvar alterações
    const saveChangesBtn = document.getElementById('save-changes-btn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const projectId = getProjectIdFromUrl();
            if (!projectId) {
                alert('ID do projeto não encontrado na URL');
                return;
            }
            
            try {
                // Extrair dados do formulário
                const dados = extrairDadosFormulario();
                console.log('Dados extraídos para salvamento:', dados);
                
                // Mostrar loading
                saveChangesBtn.disabled = true;
                saveChangesBtn.innerHTML = '<i class="las la-spinner la-spin text-lg mr-2"></i>Salvando...';
                
                // Buscar o ID do ETP atual
                const response = await fazerRequisicaoAutenticada(`/projetos/${projectId}/etp`, {
                    method: 'GET',
                    headers: {
                        'remote-user': 'user.test',
                        'remote-groups': 'TI,OUTROS'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Erro ao buscar ETP para atualização');
                }
                
                const etpList = await response.json();
                if (!etpList || etpList.length === 0) {
                    throw new Error('Nenhum ETP encontrado para atualizar');
                }
                
                const etpId = etpList[0].id;
                
                // Fazer a requisição de atualização
                const updateResponse = await fazerRequisicaoAutenticada(`/projetos/${projectId}/etp/${etpId}`, {
                    method: 'PATCH',
                    headers: {
                        'remote-user': 'user.test',
                        'remote-groups': 'TI,OUTROS'
                    },
                    body: JSON.stringify(dados)
                });
                
                if (updateResponse.ok) {
                    const etpAtualizado = await updateResponse.json();
                    console.log('ETP atualizado com sucesso:', etpAtualizado);
                    
                    alert('✅ Alterações salvas com sucesso!\n\nRedirecionando para a página de visualização...');
                    
                    // Redirecionar para a página de visualização
                    setTimeout(() => {
                        window.location.href = window.location.href.replace("confere_etp", "visualizacao_etp");
                    }, 1000);
                    
                } else {
                    const errorData = await updateResponse.json().catch(() => ({}));
                    console.error('Erro na resposta da API:', updateResponse.status, errorData);
                    
                    if (updateResponse.status === 401) {
                        alert('❌ Erro de Autenticação\n\nVocê não está autenticado. Por favor, faça login novamente.');
                    } else if (updateResponse.status === 403) {
                        alert('❌ Erro de Permissão\n\nVocê não tem permissão para editar este ETP.');
                    } else {
                        alert(`❌ Erro ao Salvar\n\nErro ${updateResponse.status}: ${errorData.detail || 'Erro ao salvar no banco.'}`);
                    }
                }
                
            } catch (error) {
                console.error('Erro ao salvar alterações:', error);
                alert(`❌ Erro de Conexão\n\n${error.message}\n\nVerifique sua conexão e tente novamente.`);
            } finally {
                // Restaurar botão
                saveChangesBtn.disabled = false;
                saveChangesBtn.innerHTML = '<i class="las la-save text-lg mr-2"></i>Salvar alterações';
            }
        });
    }

    // Carregar dados do ETP ao inicializar
    carregarDadosETP();
    
    console.log('✅ ETP Curadoria inicializado com sucesso');
});