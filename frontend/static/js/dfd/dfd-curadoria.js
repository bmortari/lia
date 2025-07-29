document.addEventListener('DOMContentLoaded', function () {
    // ❌ REMOVIDO: Não buscar mais dados do localStorage que podem estar desatualizados
    // const jsonData = JSON.parse(localStorage.getItem("draftDFD"));
    
    // ✅ NOVO: Função para obter dados atuais dos campos (que já vêm do template)
    function obterDadosAtuais() {
        const previsaoEntregaEl = document.getElementById('previsao-entrega');
        let previsaoEntrega = previsaoEntregaEl?.value || '';

        // O input type date retorna uma data em formato YYYY-MM-DD 
        // Quando isso ocorre, converte para DD/MM/YYYY
        if (previsaoEntrega.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = previsaoEntrega.split('-');
            previsaoEntrega = `${day}/${month}/${year}`;
        }

        return {
            unidade_demandante: document.getElementById('unidade-demandante')?.value?.trim() || '',
            objeto_a_ser_contratado: document.getElementById('objeto-contratado')?.value?.trim() || '',
            justificativa: document.getElementById('justificativa')?.value?.trim() || '',
            previsao_da_entrega_do_bem_ou_inicio_dos_servicos: previsaoEntrega,
            alinhamento_estrategico: extrairAlinhamentoEstrategico(),
            equipe_de_planejamento: document.getElementById('informacoes-adicionais')?.value?.trim() || '',
            quantidade_justifica_a_ser_contratada: extrairQuantidadeItens(),
            item: 0 // Valor padrão
        };
    }

    // Função auxiliar para extrair alinhamento estratégico dos campos
    function extrairAlinhamentoEstrategico() {
        const textarea = document.getElementById('alinhamento-estrategico');
        const alinhamentos = [];
        
        if (textarea) {
            const conteudo = textarea.value;
            const opcoesPossiveis = [
                'Garantia dos Direitos Fundamentais',
                'Fortalecimento da Relação Institucional com a Sociedade',
                'Agilidade e Produtividade na Prestação Jurisdicional',
                'Enfrentamento à Corrupção, à Improbidade Administrativa e aos Ilícitos Eleitorais',
                'Promoção da Sustentabilidade',
                'Aperfeiçoamento da Gestão Administrativa e da Governança Judiciária',
                'Aperfeiçoamento da Gestão de Pessoas',
                'Aperfeiçoamento da Gestão Orçamentária e Financeira',
                'Fortalecimento da Estratégia Nacional de TIC e de Proteção de Dados'
            ];
            
            opcoesPossiveis.forEach(opcao => {
                const regex = new RegExp(`\\(X\\)\\s*${opcao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                if (regex.test(conteudo)) {
                    alinhamentos.push(opcao);
                }
            });
        }
        
        return alinhamentos;
    }

    // ✅ FUNÇÃO ATUALIZADA: Extrair quantidade de itens dos campos de input
    function extrairQuantidadeItens() {
        const itemsContainer = document.getElementById('items-container');
        const quantidadeItens = [];
        
        if (itemsContainer) {
            const itemRows = itemsContainer.querySelectorAll('.item-row');
            
            itemRows.forEach((row, index) => {
                const descricaoInput = row.querySelector('.item-description');
                const quantidadeInput = row.querySelector('.item-quantity');
                
                const descricao = descricaoInput?.value?.trim() || null;
                const quantidade = quantidadeInput?.value ? parseInt(quantidadeInput.value) : null;
                
                quantidadeItens.push({
                    id_do_item: index + 1,
                    descricao: descricao,
                    quantidade: quantidade
                });
            });
        }
        
        return quantidadeItens.length > 0 ? quantidadeItens : [{
            id_do_item: 1,
            descricao: null,
            quantidade: null
        }];
    }

    // Mapeamento das opções estratégicas
    const opcoesEstrategicas = {
        'Garantia dos Direitos Fundamentais': 'garantia_direitos_fundamentais',
        'Fortalecimento da Relação Institucional com a Sociedade': 'fortalecimento_relacao_institucional',
        'Agilidade e Produtividade na Prestação Jurisdicional': 'agilidade_produtividade',
        'Enfrentamento à Corrupção, à Improbidade Administrativa e aos Ilícitos Eleitorais': 'enfrentamento_corrupcao',
        'Promoção da Sustentabilidade': 'promocao_sustentabilidade',
        'Aperfeiçoamento da Gestão Administrativa e da Governança Judiciária': 'aperfeicoamento_gestao_administrativa',
        'Aperfeiçoamento da Gestão de Pessoas': 'aperfeicoamento_gestao_pessoas',
        'Aperfeiçoamento da Gestão Orçamentária e Financeira': 'aperfeicoamento_gestao_orcamentaria',
        'Fortalecimento da Estratégia Nacional de TIC e de Proteção de Dados': 'fortalecimento_estrategia_tic'
    };

    // Função para exibir alertas customizados
    function exibirAlerta(titulo, mensagem, tipo = 'info') {
        const icones = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };

        const icone = icones[tipo] || icones['info'];
        alert(`${icone} ${titulo}\n\n${mensagem}`);
    }

    // Função para exibir lista de erros
    function exibirErrosValidacao(erros) {
        const mensagem = erros.map((erro, index) => `${index + 1}. ${erro}`).join('\n');
        exibirAlerta('Campos Obrigatórios Não Preenchidos', mensagem, 'error');
    }

    // ✅ FUNÇÃO AUXILIAR: Obter token de autenticação
    function obterTokenAutenticacao() {
        // Tenta buscar token em várias fontes
        const tokenLocalStorage = localStorage.getItem('access_token') || localStorage.getItem('token');
        const tokenSessionStorage = sessionStorage.getItem('access_token') || sessionStorage.getItem('token');
        
        // Função para buscar cookie por nome
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

    function normalizarTexto(texto) {
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/\s+/g, ' ') // Remove espaços extras
            .trim();
    }

    // Função para calcular similaridade entre duas strings
    function calcularSimilaridade(str1, str2) {
        const s1 = normalizarTexto(str1);
        const s2 = normalizarTexto(str2);
        
        // Se uma string contém a outra (após normalização), considera alta similaridade
        if (s1.includes(s2) || s2.includes(s1)) {
            return 0.9;
        }
        
        // Verifica palavras-chave em comum
        const palavras1 = s1.split(' ').filter(p => p.length > 2);
        const palavras2 = s2.split(' ').filter(p => p.length > 2);
        
        let palavrasComuns = 0;
        palavras1.forEach(p1 => {
            if (palavras2.some(p2 => p1.includes(p2) || p2.includes(p1))) {
                palavrasComuns++;
            }
        });
        
        const maxPalavras = Math.max(palavras1.length, palavras2.length);
        return maxPalavras > 0 ? palavrasComuns / maxPalavras : 0;
    }

    // ✅ FUNÇÃO ATUALIZADA: Processar alinhamento estratégico (só se o campo estiver vazio)
    function processarAlinhamentoEstrategico() {
        const textarea = document.getElementById('alinhamento-estrategico');
        if (!textarea) {
            console.warn('Elemento alinhamento-estrategico não encontrado');
            return;
        }
        
        // ✅ IMPORTANTE: Só processar se o campo estiver vazio ou não tiver checkboxes
        const temCheckboxes = textarea.value.includes('( )') || textarea.value.includes('(X)');
        
        if (textarea.value.trim() && temCheckboxes) {
            console.log('Campo de alinhamento já tem conteúdo estruturado, mantendo...');
            return; // Não sobrescrever se já tem conteúdo
        }
        
        // Template base para o alinhamento estratégico
        const templateAlinhamento = `( ) Sim - Qual?
    ( ) Garantia dos Direitos Fundamentais
    ( ) Fortalecimento da Relação Institucional com a Sociedade
    ( ) Agilidade e Produtividade na Prestação Jurisdicional
    ( ) Enfrentamento à Corrupção, à Improbidade Administrativa e aos Ilícitos Eleitorais
    ( ) Promoção da Sustentabilidade
    ( ) Aperfeiçoamento da Gestão Administrativa e da Governança Judiciária
    ( ) Aperfeiçoamento da Gestão de Pessoas
    ( ) Aperfeiçoamento da Gestão Orçamentária e Financeira
    ( ) Fortalecimento da Estratégia Nacional de TIC e de Proteção de Dados

( ) Não`;
        
        // Se o campo só tem texto simples (array join), processar
        const valorAtual = textarea.value.trim();
        
        if (valorAtual && !temCheckboxes) {
            // Tem dados do banco, mas em formato simples - converter para checkbox
            const alinhamentos = valorAtual.split(',').map(item => item.trim());
            
            let conteudo = templateAlinhamento;
            
            if (alinhamentos.length > 0 && alinhamentos[0]) {
                console.log('Convertendo alinhamentos do banco para checkboxes:', alinhamentos);
                
                // Marca "Sim"
                conteudo = conteudo.replace(/\(\s*\)\s*Sim\s*-\s*Qual\?/gi, '(X) Sim - Qual?');
                
                // Marca as opções específicas
                alinhamentos.forEach(alinhamentoJson => {
                    Object.keys(opcoesEstrategicas).forEach(opcaoFormulario => {
                        const similaridade = calcularSimilaridade(alinhamentoJson, opcaoFormulario);
                        
                        if (similaridade >= 0.6) {
                            const regex = new RegExp(`\\(\\s*\\)\\s*${opcaoFormulario.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
                            conteudo = conteudo.replace(regex, `(X) ${opcaoFormulario}`);
                        }
                    });
                });
            } else {
                // Marca "Não"
                conteudo = conteudo.replace(/\(\s*\)\s*Não/gi, '(X) Não');
            }
            
            textarea.value = conteudo;
        } else if (!valorAtual) {
            // Campo vazio - colocar template
            textarea.value = templateAlinhamento;
        }
    }

    // FUNÇÃO ATUALIZADA: Extrair todos os dados do formulário e converter para JSON
    function extrairDadosFormulario() {
        try {
            const dados = obterDadosAtuais();
            
            // Montar o JSON final
            const dadosJSON = {
                unidade_demandante: dados.unidade_demandante,
                objeto_a_ser_contratado: dados.objeto_a_ser_contratado,
                justificativa: dados.justificativa,
                quantidade_justifica_a_ser_contratada: dados.quantidade_justifica_a_ser_contratada,
                previsao_da_entrega_do_bem_ou_inicio_dos_servicos: dados.previsao_da_entrega_do_bem_ou_inicio_dos_servicos,
                alinhamento_estrategico: dados.alinhamento_estrategico,
                equipe_de_planejamento: dados.equipe_de_planejamento,
                item: dados.item
            };
            
            return dadosJSON;
            
        } catch (error) {
            console.error('Erro ao extrair dados do formulário:', error);
            exibirAlerta('Erro', 'Ocorreu um erro ao extrair os dados do formulário.', 'error');
            return null;
        }
    }

    // FUNÇÃO ATUALIZADA: Validar se todos os campos obrigatórios estão preenchidos
    function validarFormulario() {
        const dados = extrairDadosFormulario();
        
        if (!dados) return false;
        
        const erros = [];
        
        // Verificar campos obrigatórios
        if (!dados.unidade_demandante) {
            erros.push('Identificação da Unidade Demandante é obrigatória');
        }
        
        if (!dados.objeto_a_ser_contratado) {
            erros.push('Objeto a ser Contratado é obrigatório');
        }
        
        if (!dados.justificativa) {
            erros.push('Justificativa da Necessidade da Contratação é obrigatória');
        }
        
        if (!dados.previsao_da_entrega_do_bem_ou_inicio_dos_servicos) {
            erros.push('Previsão da Data de Entrega é obrigatória');
        }
        
        if (!dados.equipe_de_planejamento) {
            erros.push('Informações Adicionais (Equipe de Planejamento) são obrigatórias');
        }
        
        // Verificar se pelo menos um item tem descrição e quantidade
        const itensValidos = dados.quantidade_justifica_a_ser_contratada.filter(
            item => item.descricao && item.quantidade > 0
        );
        
        if (itensValidos.length === 0) {
            erros.push('É necessário pelo menos um item com descrição e quantidade válida na seção "Quantidade Justificada a ser Contratada"');
        }
        
        // Verificar se o alinhamento estratégico foi definido
        const alinhamentoTextarea = document.getElementById('alinhamento-estrategico');
        if (alinhamentoTextarea) {
            const conteudo = alinhamentoTextarea.value;
            const temSimMarcado = /\(X\)\s*Sim\s*-\s*Qual\?/i.test(conteudo);
            const temNaoMarcado = /\(X\)\s*Não/i.test(conteudo);
            
            if (!temSimMarcado && !temNaoMarcado) {
                erros.push('É necessário marcar "Sim" ou "Não" na seção Alinhamento Estratégico');
            }
        }
        
        if (erros.length > 0) {
            exibirErrosValidacao(erros);
            return false;
        }
        
        return true;
    }

    const itemsContainer = document.getElementById('items-container');

    // ✅ FUNÇÃO ATUALIZADA: Criar uma nova linha de item
    const createItemRow = (item = {}) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'flex items-center gap-3 p-2 border rounded-md item-row';

        const descriptionInput = document.createElement('input');
        descriptionInput.type = 'text';
        descriptionInput.value = item.descricao || '';
        descriptionInput.placeholder = 'Descrição do item';
        descriptionInput.className = 'flex-grow p-2 border-gray-300 border rounded-md item-description';

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.value = item.quantidade || '';
        quantityInput.placeholder = 'Qtd.';
        quantityInput.className = 'w-24 p-2 border-gray-300 border rounded-md item-quantity';
        quantityInput.min = '1';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'text-red-500 hover:text-red-700 remove-item-btn';
        deleteBtn.innerHTML = '<i class="las la-trash-alt text-xl"></i>';
        deleteBtn.onclick = () => {
            // Verifica se há pelo menos uma linha antes de remover
            const totalRows = itemsContainer.querySelectorAll('.item-row').length;
            if (totalRows > 1) {
                itemRow.remove();
            } else {
                exibirAlerta('Aviso', 'É necessário manter pelo menos um item.', 'warning');
            }
        };

        itemRow.appendChild(descriptionInput);
        itemRow.appendChild(quantityInput);
        itemRow.appendChild(deleteBtn);

        return itemRow;
    };

    // Event listener para o botão "Adicionar Item"
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn && itemsContainer) {
        addItemBtn.addEventListener('click', () => {
            itemsContainer.appendChild(createItemRow());
        });
    }

    // ✅ NOVO: Event listener para botões de remover item existentes
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-item-btn')) {
            e.preventDefault();
            const button = e.target.closest('.remove-item-btn');
            const itemRow = button.closest('.item-row');
            const totalRows = itemsContainer.querySelectorAll('.item-row').length;
            
            if (totalRows > 1) {
                itemRow.remove();
            } else {
                exibirAlerta('Aviso', 'É necessário manter pelo menos um item.', 'warning');
            }
        }
    });

    // Event listener para todos os botões "Editar"
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            
            if (!targetElement) {
                console.warn(`Elemento com ID ${targetId} não encontrado`);
                return;
            }
            
            // Comportamento padrão para todos os elementos editáveis
            const isCurrentlyDisabled = targetElement.disabled;
            
            if (isCurrentlyDisabled) {
                // Habilitar edição
                targetElement.disabled = false;
                targetElement.focus();
                targetElement.classList.remove('editable-content:disabled');
                this.innerHTML = '<i class="las la-save mr-1"></i>Salvar';
            } else {
                // Desabilitar edição
                targetElement.disabled = true;
                targetElement.classList.add('editable-content:disabled');
                this.innerHTML = '<i class="las la-edit mr-1"></i>Editar';
            }
        });
    });

    // Event listener do botão "Salvar alterações"
    const botaoSalvarAlteracoes = document.querySelector('button:has(i.las.la-save)');
    if (botaoSalvarAlteracoes) {
        botaoSalvarAlteracoes.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (validarFormulario()) {
                const dados = extrairDadosFormulario();
                
                // Exibe os dados no console
                console.log('Dados extraídos do formulário:', JSON.stringify(dados, null, 2));
                
                // Obter o ID do projeto da URL
                const urlPath = window.location.pathname;
                const projectIdMatch = urlPath.match(/\/projetos\/(\d+)\//);
                const projectId = projectIdMatch ? projectIdMatch[1] : null;
                
                if (!projectId) {
                    exibirAlerta('Erro', 'Não foi possível identificar o ID do projeto.', 'error');
                    return;
                }
                
                // Mostrar loading
                botaoSalvarAlteracoes.disabled = true;
                botaoSalvarAlteracoes.innerHTML = '<i class="las la-spinner la-spin text-lg mr-2"></i>Salvando...';
                
                try {
                    // ✅ USANDO A FUNÇÃO EXISTENTE COM AUTENTICAÇÃO
                    const response = await fazerRequisicaoAutenticada(`/projetos/${projectId}/dfd`, {
                        method: 'PATCH',
                        headers: {
                            'remote-user': 'user.test', // Adicionar os headers necessários
                            'remote-groups': 'TI,OUTROS'
                        },
                        body: JSON.stringify(dados)
                    });
                    
                    if (response.ok) {
                        const dfdAtualizado = await response.json();
                        console.log('DFD atualizado no banco com sucesso:', dfdAtualizado);
                        
                        // Salva também no localStorage como backup
                        localStorage.setItem('dfdDados', JSON.stringify(dados));
                        
                        exibirAlerta(
                            'Alterações Salvas com Sucesso!', 
                            'Todas as alterações foram salvas no banco de dados!\n\nRedirecionando para a página de resultado...', 
                            'success'
                        );
                        
                        // Redireciona para a página de resultado após 1 segundo
                        setTimeout(() => {
                            window.location.href = window.location.href.replace("confere_dfd", "visualizacao_dfd");
                        }, 1000);
                        
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('Erro na resposta da API:', response.status, errorData);
                        
                        // Tratamento específico para erro de autenticação
                        if (response.status === 401) {
                            exibirAlerta(
                                'Erro de Autenticação', 
                                'Você não está autenticado. Por favor, faça login novamente.', 
                                'error'
                            );
                        } else if (response.status === 403) {
                            exibirAlerta(
                                'Erro de Permissão', 
                                'Você não tem permissão para editar este DFD.', 
                                'error'
                            );
                        } else {
                            exibirAlerta(
                                'Erro ao Salvar', 
                                `Erro ${response.status}: ${errorData.detail || 'Erro ao salvar no banco.'}`, 
                                'error'
                            );
                        }
                    }
                    
                } catch (error) {
                    console.error('Erro ao salvar no banco de dados:', error);
                    exibirAlerta(
                        'Erro de Conexão', 
                        'Não foi possível conectar com o servidor. Verifique sua conexão e tente novamente.', 
                        'error'
                    );
                } finally {
                    // Restaurar botão
                    botaoSalvarAlteracoes.disabled = false;
                    botaoSalvarAlteracoes.innerHTML = '<i class="las la-save text-lg mr-2"></i>Salvar alterações';
                }
            }
        });
    }

    // ✅ CHAMADA CONDICIONAL: Só processar alinhamento se necessário
    setTimeout(() => {
        processarAlinhamentoEstrategico();
    }, 100); // Pequeno delay para garantir que o DOM está pronto

    // Exportar funções para uso global
    window.extrairDadosFormulario = extrairDadosFormulario;
    window.validarFormulario = validarFormulario;
    window.exibirAlerta = exibirAlerta;
    window.processarAlinhamentoEstrategico = processarAlinhamentoEstrategico;
});