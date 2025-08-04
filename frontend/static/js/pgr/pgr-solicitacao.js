// pgr-solicitacao.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 pgr-solicitacao.js carregado');
    
    // Elementos da página
    const formPGR = document.getElementById('pgr-form');
    const promptUsuarioInput = document.getElementById('prompt-usuario');
    const btnGerar = document.getElementById('gerar-pgr');
    const loadingOverlay = document.getElementById('loading-overlay');
    const solucoesSection = document.getElementById('solucoes-section');
    const solucoesContainer = document.getElementById('solucoes-cards-container');
    const semSolucoesAviso = document.getElementById('sem-solucoes-aviso');
    
    // Verifica se há análise de riscos disponível
    if (window.analiseRiscos) {
        console.log('🔍 Dados da análise de riscos:', window.analiseRiscos);
        processarAnaliseRiscos(window.analiseRiscos);
    } else {
        console.warn('⚠️ Análise de riscos não disponível');
        mostrarSemSolucoes();
    }
    
    // Função principal para processar a análise de riscos
    function processarAnaliseRiscos(analise) {
        if (analise.status === 'sucesso' && analise.solucoes && analise.solucoes.length > 0) {
            // Mostra as soluções identificadas
            mostrarSolucoes(analise.solucoes);
            
            // Preenche prompt padrão
            preencherPromptPadrao(analise);
            
        } else if (analise.status === 'sem_solucoes') {
            console.warn('❌ Sem soluções identificadas:', analise.mensagem);
            mostrarSemSolucoes(analise.mensagem);
        } else {
            console.warn('❌ Erro na análise de riscos:', analise.erro);
            mostrarSemSolucoes(analise.erro);
        }
    }
    
    // Função para mostrar aviso quando não há soluções
    function mostrarSemSolucoes(mensagem = null) {
        solucoesSection.classList.add('hidden');
        semSolucoesAviso.classList.remove('hidden');
        
        if (mensagem) {
            const msgElement = semSolucoesAviso.querySelector('p');
            if (msgElement) {
                msgElement.textContent = mensagem;
            }
        }
    }
    
    // Função para mostrar as soluções em cards
    function mostrarSolucoes(solucoes) {
        if (!solucoes || solucoes.length === 0) {
            mostrarSemSolucoes();
            return;
        }
        
        // Limpa container
        solucoesContainer.innerHTML = '';
        
        // Cria cards para cada solução
        solucoes.forEach((solucao, index) => {
            const cardHTML = criarCardSolucao(solucao, index);
            solucoesContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        // Mostra a seção
        solucoesSection.classList.remove('hidden');
        semSolucoesAviso.classList.add('hidden');
        
        // Adiciona event listeners para os cards
        adicionarEventListenersCards();
        
        console.log('✅ Cards de soluções criados:', solucoes.length);
    }
    
    // Função para criar um card de solução para análise de riscos
    function criarCardSolucao(solucao, index) {
        const gradientes = {
            'principal':    'from-red-600 to-red-800',
            'complementar': 'from-orange-500 to-orange-600',
            'economica':    'from-green-500 to-green-600',
            'modular':      'from-purple-500 to-purple-700',
            'completo':     'from-indigo-500 to-indigo-700'
        };
        
        const gradienteClasses = gradientes[solucao.tipo] || 'from-gray-500 to-gray-600';
        const isPrincipal = solucao.tipo === 'principal';
        
        // Badge do tipo de solução
        const tipoBadge = getTipoBadge(solucao.tipo);
        
        // Truncar descrição para versão compacta
        const descricaoTruncada = solucao.descricao && solucao.descricao.length > 80 
            ? solucao.descricao.substring(0, 80) + '...' 
            : (solucao.descricao || 'Sem descrição');
        
        // Palavras-chave HTML
        let palavrasChaveHTML = '';
        if (solucao.palavras_chave && solucao.palavras_chave.length > 0) {
            const palavrasVisiveis = solucao.palavras_chave.slice(0, 3);
            const palavrasExtras = solucao.palavras_chave.length > 3 ? solucao.palavras_chave.length - 3 : 0;
            
            palavrasChaveHTML = '<div class="flex flex-wrap gap-1 mb-3">';
            palavrasVisiveis.forEach(palavra => {
                palavrasChaveHTML += '<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">' + escapeHtml(palavra) + '</span>';
            });
            
            if (palavrasExtras > 0) {
                palavrasChaveHTML += '<span class="px-2 py-1 text-xs text-gray-500 rounded-full">+' + palavrasExtras + '</span>';
            }
            
            palavrasChaveHTML += '</div>';
        }
        
        // Indicadores de riscos existentes
        let riscosIndicadorHTML = '';
        if (solucao.analise_riscos_existente && solucao.analise_riscos_existente.length > 0) {
            riscosIndicadorHTML = '<div class="flex items-center text-xs text-orange-600 mb-2">' +
                '<i class="uil uil-exclamation-triangle mr-1"></i>' +
                '<span>' + solucao.analise_riscos_existente.length + ' risco(s) já identificado(s)</span>' +
            '</div>';
        }
        
        // Ícone e cor baseados na complexidade
        const { icon: iconeComplexidade, color: corIcone } = getIconeComplexidade(solucao.complexidade_estimada);
        
        return '<div class="solution-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-64 flex flex-col" data-solucao-id="' + solucao.id_solucao + '" style="animation-delay: ' + (index * 100) + 'ms;">' +
            '<div class="h-2 bg-gradient-to-r ' + gradienteClasses + '"></div>' +
            '<div class="flex-1 p-4 flex flex-col">' +
                '<div class="flex items-start justify-between mb-3">' +
                    '<div class="flex items-center flex-1 min-w-0">' +
                        '<div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">' +
                            '<i class="uil ' + iconeComplexidade + ' ' + corIcone + ' text-xl"></i>' +
                        '</div>' +
                        '<div class="flex-1 min-w-0">' +
                            '<h3 class="text-sm font-bold text-gray-900 truncate" title="' + escapeHtml(solucao.nome) + '">' + escapeHtml(solucao.nome) + '</h3>' +
                            (isPrincipal ? '<p class="text-xs text-red-600 font-medium">⭐ Prioritária</p>' : '') +
                        '</div>' +
                    '</div>' +
                    tipoBadge +
                '</div>' +
                '<p class="text-xs text-gray-600 mb-3 leading-relaxed flex-grow" title="' + escapeHtml(solucao.descricao || '') + '">' +
                    escapeHtml(descricaoTruncada) +
                '</p>' +
                palavrasChaveHTML +
                riscosIndicadorHTML +
                '<div class="mt-auto">' +
                    '<div class="flex items-center justify-between mb-2">' +
                        '<span class="px-2 py-1 text-xs font-medium rounded-full ' + getCorComplexidadeClass(solucao.complexidade_estimada) + '">' +
                            solucao.complexidade_estimada +
                        '</span>' +
                        '<div class="flex items-center space-x-1">' +
                            '<input type="checkbox" class="solucao-checkbox w-3 h-3 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500" value="' + solucao.id_solucao + '" checked>' +
                        '</div>' +
                    '</div>' +
                    '<button class="analisar-solucao-btn w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-gradient-to-r ' + gradienteClasses + ' rounded-lg hover:shadow-md transition-all duration-200" data-solucao-id="' + solucao.id_solucao + '" onclick="event.stopPropagation()" title="Incluir esta solução na análise de riscos">' +
                        '<i class="uil uil-shield-exclamation mr-1"></i>' +
                        'Analisar Riscos' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }
    
    // Função para escapar HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Função para adicionar event listeners aos cards
    function adicionarEventListenersCards() {
        // Botões de análise individual
        document.querySelectorAll('.analisar-solucao-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const solucaoId = this.getAttribute('data-solucao-id');
                
                // Desmarca todas as outras soluções
                document.querySelectorAll('.solucao-checkbox').forEach(cb => {
                    cb.checked = cb.value === solucaoId;
                });
                
                // Destaca o formulário
                const form = document.getElementById('pgr-form');
                form.classList.add('ring-2', 'ring-red-500', 'border-red-500');
                setTimeout(() => {
                    form.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
                }, 2000);
                
                mostrarToast('Solução selecionada para análise de riscos!', 'info');
            });
        });
        
        // Cards clicáveis
        document.querySelectorAll('.solution-card').forEach(card => {
            card.addEventListener('click', function(e) {
                // Verifica se não clicou em um botão ou checkbox
                if (!e.target.closest('button') && !e.target.closest('input')) {
                    const checkbox = this.querySelector('.solucao-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        atualizarContadorSelecionadas();
                    }
                }
            });
        });
        
        // Checkboxes de seleção
        document.querySelectorAll('.solucao-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', atualizarContadorSelecionadas);
        });
        
        // Atualizar contador inicial
        atualizarContadorSelecionadas();
    }
    
    // Função para atualizar contador de soluções selecionadas
    function atualizarContadorSelecionadas() {
        const selecionadas = document.querySelectorAll('.solucao-checkbox:checked').length;
        const total = document.querySelectorAll('.solucao-checkbox').length;
        
        // Atualizar texto do botão se necessário
        const btnGerar = document.getElementById('gerar-pgr');
        if (btnGerar) {
            const textoBase = 'Gerar Plano de Gerenciamento de Riscos';
            btnGerar.innerHTML = '<i class="uil uil-shield-check mr-2"></i>' + 
                (selecionadas > 0 ? `${textoBase} (${selecionadas} selecionada${selecionadas > 1 ? 's' : ''})` : textoBase);
        }
    }
    
    // Função para preencher prompt padrão
    function preencherPromptPadrao(analise) {
        if (!promptUsuarioInput.value.trim()) {
            const objeto = analise.projeto?.objeto || 'o projeto';
            const totalSolucoes = analise.total_solucoes || 0;
            
            const promptPadrao = `Analise os riscos das ${totalSolucoes} soluções identificadas para ${objeto}. 

Considere especialmente:
• Riscos técnicos relacionados à implementação
• Riscos operacionais de execução e manutenção  
• Riscos financeiros de orçamento e custos
• Riscos legais e de conformidade regulatória
• Possível impacto na continuidade dos serviços

Priorize riscos que possam afetar o cronograma, qualidade ou aderência aos requisitos do órgão público.`;
            
            promptUsuarioInput.value = promptPadrao;
        }
    }
    
    // Event listener para o formulário principal
    if (formPGR) {
        formPGR.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validações básicas
            const promptUsuario = promptUsuarioInput.value.trim();
            const solucoesSelecionadas = Array.from(document.querySelectorAll('.solucao-checkbox:checked')).map(cb => parseInt(cb.value));
            
            if (!promptUsuario) {
                mostrarToast('Por favor, insira orientações para a análise de riscos.', 'warning');
                promptUsuarioInput.focus();
                return;
            }
            
            if (solucoesSelecionadas.length === 0) {
                mostrarToast('Selecione pelo menos uma solução para análise de riscos.', 'warning');
                return;
            }
            
            // Mostra loading
            mostrarLoading();
            
            // Coleta dados do formulário
            const categoriasSelecionadas = Array.from(document.querySelectorAll('.categoria-risco:checked')).map(cb => cb.value);
            const nivelDetalhamento = document.querySelector('input[name="nivel-detalhamento"]:checked')?.value || 'completo';
            
            const formData = {
                prompt_usuario: promptUsuario,
                solucoes_selecionadas: solucoesSelecionadas,
                parametros_analise: {
                    categorias_risco: categoriasSelecionadas,
                    nivel_detalhamento: nivelDetalhamento
                }
            };
            
            console.log('📋 Dados da análise PGR:', formData);
            
            // Envia requisição
            enviarAnaliseRiscos(formData);
        });
    }
    
    // Função para enviar análise de riscos
    async function enviarAnaliseRiscos(dados) {
        try {
            const projetoId = extrairProjetoId();
            const URL = window.location.origin;
            
            console.log('🚀 Enviando análise para projeto:', projetoId);
            console.log('📋 Payload completo:', JSON.stringify(dados, null, 2));
            
            const response = await fetch(URL + '/projetos/' + projetoId + '/create_pgr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'remote-user': 'user.test',
                    'remote-groups': 'TI,OUTROS'
                },
                body: JSON.stringify(dados)
            });
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);
            
            if (response.ok) {
                const resultado = await response.json();
                console.log('✅ Resultado da análise:', resultado);
                
                mostrarToast('Plano de Gerenciamento de Riscos gerado com sucesso!', 'success');
                
                // Redireciona para página de resultados
                setTimeout(() => {
                    window.location.href = '/projetos/' + projetoId + '/confere_pgr';
                }, 1500);
            } else {
                // Log detalhado do erro
                const contentType = response.headers.get('content-type');
                let erro;
                
                if (contentType && contentType.includes('application/json')) {
                    erro = await response.json();
                    console.error('❌ Erro JSON:', erro);
                } else {
                    const errorText = await response.text();
                    console.error('❌ Erro texto:', errorText);
                    erro = { detail: errorText };
                }
                
                throw new Error(erro.detail || `Erro HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            console.error('❌ Stack trace:', error.stack);
            mostrarToast('Erro ao gerar PGR: ' + error.message, 'error');
        } finally {
            esconderLoading();
        }
    }
    
    // Funções auxiliares
    function getIconeComplexidade(complexidade) {
        const normalizedComplexidade = complexidade ?
            complexidade.charAt(0).toUpperCase() + complexidade.slice(1).toLowerCase() : '';

        const iconData = {
            'Baixa': { icon: 'uil-check-circle', color: 'text-green-600' },
            'Média': { icon: 'uil-exclamation-circle', color: 'text-yellow-600' },
            'Alta':  { icon: 'uil-times-circle', color: 'text-red-600' }
        };

        return iconData[normalizedComplexidade] || { icon: 'uil-question-circle', color: 'text-gray-500' };
    }
    
    function getTipoBadge(tipo) {
        const badges = {
            'principal': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex-shrink-0">Principal</span>',
            'complementar': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full flex-shrink-0">Complementar</span>',
            'economica': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex-shrink-0">Econômica</span>',
            'modular': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full flex-shrink-0">Modular</span>',
            'completo': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full flex-shrink-0">Completo</span>'
        };
        return badges[tipo] || '';
    }
    
    function getCorComplexidadeClass(complexidade) {
        const classes = {
            'Baixa': 'text-green-700 bg-green-100',
            'Média': 'text-orange-700 bg-orange-100',
            'Alta': 'text-red-700 bg-red-100'
        };
        return classes[complexidade] || 'text-gray-700 bg-gray-100';
    }
    
    function mostrarLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            
            // Simula progresso
            let progresso = 0;
            const progressBar = document.getElementById('progress-bar');
            const intervalo = setInterval(() => {
                progresso += Math.random() * 15;
                if (progresso > 90) progresso = 90;
                
                if (progressBar) {
                    progressBar.style.width = progresso + '%';
                }
            }, 500);
            
            // Para o progresso após 30 segundos
            setTimeout(() => {
                clearInterval(intervalo);
            }, 30000);
        }
    }
    
    function esconderLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            const progressBar = document.getElementById('progress-bar');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }
    }
    
    function extrairProjetoId() {
        // Extrai ID da URL: /projetos/2/criar_pgr
        const pathname = window.location.pathname;
        const matches = pathname.match(/\/projetos\/(\d+)\//);
        return matches ? matches[1] : null;
    }
    
    function mostrarToast(mensagem, tipo) {
        tipo = tipo || 'info';
        
        // Remove toasts existentes
        const existingToasts = document.querySelectorAll('.toast-message');
        existingToasts.forEach(toast => toast.remove());
        
        // Cria um toast
        const toast = document.createElement('div');
        let bgClass = 'bg-blue-500 text-white';
        let iconClass = 'uil-info-circle';
        
        if (tipo === 'success') {
            bgClass = 'bg-green-500 text-white';
            iconClass = 'uil-check-circle';
        } else if (tipo === 'warning') {
            bgClass = 'bg-yellow-500 text-white';
            iconClass = 'uil-exclamation-triangle';
        } else if (tipo === 'error') {
            bgClass = 'bg-red-500 text-white';
            iconClass = 'uil-times-circle';
        }
        
        toast.className = 'toast-message fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 max-w-sm ' + bgClass;
        
        toast.innerHTML = '<div class="flex items-start">' +
            '<i class="uil ' + iconClass + ' mr-3 mt-0.5 flex-shrink-0"></i>' +
            '<div class="flex-1">' +
                '<p class="text-sm font-medium">' + escapeHtml(mensagem) + '</p>' +
            '</div>' +
            '<button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200">' +
                '<i class="uil uil-times text-sm"></i>' +
            '</button>' +
        '</div>';
        
        document.body.appendChild(toast);
        
        // Remove após 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Event listener para voltar ao início
    const backToStart = document.getElementById('voltar-inicio');
    if (backToStart) {
        backToStart.addEventListener('click', function() {
            window.history.back();
        });
    }
    
    console.log('✅ pgr-solicitacao.js inicializado com sucesso');
});