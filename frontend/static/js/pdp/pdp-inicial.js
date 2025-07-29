// pdp-inicial.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 pdp-inicial.js carregado');
    
    // Elementos da página
    const formPesquisa = document.getElementById('pesquisa-preco-form');
    const palavrasChaveInput = document.getElementById('palavras-chave');
    const btnEnviar = document.getElementById('enviar-pesquisa');
    const loadingOverlay = document.getElementById('loading-overlay');
    const solucoesSection = document.getElementById('solucoes-ia-section');
    const solucoesContainer = document.getElementById('solucoes-cards-container');
    
    // Verifica se há análise inicial disponível
    if (window.analiseInicial) {
        console.log('🤖 Dados da análise inicial:', window.analiseInicial);
        processarAnaliseInicial(window.analiseInicial);
    } else {
        console.warn('⚠️ Análise inicial não disponível');
        mostrarErroAnalise();
    }
    
    // Função principal para processar a análise inicial
    function processarAnaliseInicial(analise) {
        if (analise.status === 'sucesso' && analise.analise_inicial) {
            const analiseData = analise.analise_inicial;
            
            // Cria soluções baseadas na análise da IA
            const solucoes = criarSolucoesFromIA(analiseData);
            
            // Mostra os cards de soluções
            mostrarSolucoes(solucoes);
            
            // Preenche palavras-chave automaticamente
            if (analiseData.sugestoes_palavras_chave && analiseData.sugestoes_palavras_chave.length > 0) {
                palavrasChaveInput.value = analiseData.sugestoes_palavras_chave.join(', ');
                console.log('🏷️ Palavras-chave preenchidas:', analiseData.sugestoes_palavras_chave);
            }
            
        } else {
            console.warn('❌ Erro na análise inicial:', analise.analise_inicial?.erro);
            mostrarErroAnalise(analise);
        }
    }
    
    // Função para criar soluções baseadas na análise da IA
    function criarSolucoesFromIA(analiseData) {
        let solucoes = [];
        
        // Se a IA retornou tipos de solução estruturados, usa eles
        if (analiseData.tipos_solucao && analiseData.tipos_solucao.length > 0) {
            solucoes = analiseData.tipos_solucao.map((tipoSolucao, index) => ({
                id: 'solucao-ia-' + index,
                titulo: tipoSolucao.nome || 'Solução ' + (index + 1),
                descricao: tipoSolucao.descricao || 'Solução baseada na análise do projeto',
                complexidade: tipoSolucao.complexidade_estimada || 'Média',
                palavrasChave: tipoSolucao.palavras_chave || [],
                tipo: tipoSolucao.tipo || 'complementar',
                icone: getIconeTipo(tipoSolucao.tipo, analiseData.categoria_estimada),
                cor: getCorTipo(tipoSolucao.tipo, index)
            }));
        } else {
            // Fallback: cria soluções básicas se a IA não retornou tipos estruturados
            solucoes = criarSolucoesFallback(analiseData);
        }
        
        // Adiciona informações extras se disponíveis
        if (analiseData.alertas && analiseData.alertas.length > 0) {
            solucoes.forEach(solucao => {
                solucao.alertas = analiseData.alertas;
            });
        }
        
        if (analiseData.recomendacoes_busca) {
            solucoes.forEach(solucao => {
                solucao.recomendacoes = analiseData.recomendacoes_busca;
            });
        }
        
        return solucoes;
    }
    
    // Função fallback para criar soluções básicas
    function criarSolucoesFallback(analiseData) {
        const solucoes = [];
        
        // Solução principal baseada no objeto
        solucoes.push({
            id: 'solucao-principal',
            titulo: analiseData.categoria_estimada || 'Contratação Principal',
            descricao: analiseData.resumo_objeto || 'Solução baseada na análise do projeto',
            complexidade: analiseData.complexidade || 'Média',
            palavrasChave: analiseData.sugestoes_palavras_chave || [],
            tipo: 'principal',
            icone: getIconeCategoria(analiseData.categoria_estimada),
            cor: getCorComplexidade(analiseData.complexidade)
        });
        
        // Soluções complementares baseadas nas palavras-chave
        if (analiseData.sugestoes_palavras_chave && analiseData.sugestoes_palavras_chave.length > 1) {
            analiseData.sugestoes_palavras_chave.slice(1, 3).forEach((palavra, index) => {
                solucoes.push({
                    id: 'solucao-' + (index + 1),
                    titulo: palavra.charAt(0).toUpperCase() + palavra.slice(1) + ' Especializado',
                    descricao: 'Soluções focadas em ' + palavra + ' para atender necessidades específicas',
                    complexidade: index === 0 ? 'Baixa' : 'Média',
                    palavrasChave: [palavra],
                    tipo: 'complementar',
                    icone: 'uil-layers',
                    cor: index % 2 === 0 ? 'blue' : 'green'
                });
            });
        }
        
        // Solução econômica
        if (analiseData.complexidade !== 'Alta') {
            solucoes.push({
                id: 'solucao-economica',
                titulo: 'Opção Econômica',
                descricao: 'Alternativas de menor custo mantendo a qualidade necessária',
                complexidade: 'Baixa',
                palavrasChave: ['básico', 'economia'],
                tipo: 'economica',
                icone: 'uil-money-bill',
                cor: 'yellow'
            });
        }
        
        return solucoes;
    }
    
    // Função para mostrar as soluções em cards
    function mostrarSolucoes(solucoes) {
        if (!solucoes || solucoes.length === 0) {
            mostrarErroAnalise();
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
        
        // Adiciona event listeners para os cards
        adicionarEventListenersCards();
        
        console.log('✅ Cards de soluções criados:', solucoes.length);
    }
    
    // Função para criar um card de solução
    function criarCardSolucao(solucao, index) {
        const cores = {
            'blue': 'from-blue-500 to-blue-600',
            'green': 'from-green-500 to-green-600',
            'yellow': 'from-yellow-500 to-yellow-600',
            'purple': 'from-purple-500 to-purple-600',
            'red': 'from-red-500 to-red-600',
            'indigo': 'from-indigo-500 to-indigo-600',
            'teal': 'from-teal-500 to-teal-600'
        };
        
        const gradiente = cores[solucao.cor] || cores.blue;
        const isPrincipal = solucao.tipo === 'principal';
        
        // Badge do tipo de solução
        const tipoBadge = getTipoBadge(solucao.tipo);
        
        // Truncar descrição para versão compacta
        const descricaoTruncada = solucao.descricao.length > 80 
            ? solucao.descricao.substring(0, 80) + '...' 
            : solucao.descricao;
        
        // Palavras-chave HTML
        let palavrasChaveHTML = '';
        if (solucao.palavrasChave && solucao.palavrasChave.length > 0) {
            const palavrasVisiveis = solucao.palavrasChave.slice(0, 3);
            const palavrasExtras = solucao.palavrasChave.length > 3 ? solucao.palavrasChave.length - 3 : 0;
            
            palavrasChaveHTML = '<div class="flex flex-wrap gap-1 mb-3">';
            palavrasVisiveis.forEach(palavra => {
                palavrasChaveHTML += '<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full cursor-pointer hover:bg-gray-200 transition-colors" onclick="adicionarPalavraChave(\'' + palavra + '\')" title="Clique para adicionar à busca">' + palavra + '</span>';
            });
            
            if (palavrasExtras > 0) {
                palavrasChaveHTML += '<span class="px-2 py-1 text-xs text-gray-500 rounded-full">+' + palavrasExtras + '</span>';
            }
            
            palavrasChaveHTML += '</div>';
        }
        
        // Indicadores extras HTML
        let indicadoresHTML = '';
        if (solucao.alertas && solucao.alertas.length > 0) {
            indicadoresHTML += '<button class="mostrar-alertas-btn text-amber-500 hover:text-amber-600 transition-colors" data-alertas="' + escapeHtml(JSON.stringify(solucao.alertas)) + '" title="Ver pontos de atenção"><i class="uil uil-exclamation-triangle text-xs"></i></button>';
        }
        
        if (solucao.recomendacoes) {
            indicadoresHTML += '<button class="mostrar-dicas-btn text-blue-500 hover:text-blue-600 transition-colors" data-recomendacoes="' + escapeHtml(solucao.recomendacoes) + '" title="Ver dicas de busca"><i class="uil uil-lightbulb text-xs"></i></button>';
        }
        
        return '<div class="solution-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-64 flex flex-col" data-solucao-id="' + solucao.id + '" style="animation-delay: ' + (index * 100) + 'ms;">' +
            '<div class="h-2 bg-gradient-to-r ' + gradiente + '"></div>' +
            '<div class="flex-1 p-4 flex flex-col">' +
                '<div class="flex items-start justify-between mb-3">' +
                    '<div class="flex items-center flex-1 min-w-0">' +
                        '<div class="w-8 h-8 bg-gradient-to-br ' + gradiente + ' rounded-lg flex items-center justify-center mr-3 flex-shrink-0">' +
                            '<i class="uil ' + solucao.icone + ' text-white text-sm"></i>' +
                        '</div>' +
                        '<div class="flex-1 min-w-0">' +
                            '<h3 class="text-sm font-bold text-gray-900 truncate" title="' + escapeHtml(solucao.titulo) + '">' + escapeHtml(solucao.titulo) + '</h3>' +
                            (isPrincipal ? '<p class="text-xs text-blue-600 font-medium">⭐ Recomendado</p>' : '') +
                        '</div>' +
                    '</div>' +
                    tipoBadge +
                '</div>' +
                '<p class="text-xs text-gray-600 mb-3 leading-relaxed flex-grow" title="' + escapeHtml(solucao.descricao) + '">' +
                    escapeHtml(descricaoTruncada) +
                '</p>' +
                palavrasChaveHTML +
                '<div class="mt-auto">' +
                    '<div class="flex items-center justify-between mb-2">' +
                        '<span class="px-2 py-1 text-xs font-medium rounded-full ' + getCorComplexidadeClass(solucao.complexidade) + '">' +
                            solucao.complexidade +
                        '</span>' +
                        '<div class="flex items-center space-x-1">' +
                            indicadoresHTML +
                        '</div>' +
                    '</div>' +
                    '<button class="buscar-solucao-btn w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-gradient-to-r ' + gradiente + ' rounded-lg hover:shadow-md transition-all duration-200" data-palavras="' + (solucao.palavrasChave ? solucao.palavrasChave.join(', ') : '') + '" onclick="event.stopPropagation()" title="Usar estas palavras-chave para buscar preços">' +
                        '<i class="uil uil-search mr-1"></i>' +
                        'Buscar Preços' +
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
        // Botões de busca individual
        document.querySelectorAll('.buscar-solucao-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const palavras = this.getAttribute('data-palavras');
                if (palavras) {
                    palavrasChaveInput.value = palavras;
                    palavrasChaveInput.focus();
                    
                    // Destaca o campo
                    palavrasChaveInput.classList.add('ring-2', 'ring-blue-500', 'border-blue-500');
                    setTimeout(() => {
                        palavrasChaveInput.classList.remove('ring-2', 'ring-blue-500', 'border-blue-500');
                    }, 2000);
                    
                    mostrarToast('Palavras-chave atualizadas! Clique em "Buscar Preços" para continuar.', 'info');
                }
            });
        });
        
        // Botões de dicas de busca
        document.querySelectorAll('.mostrar-dicas-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const recomendacoes = this.getAttribute('data-recomendacoes');
                if (recomendacoes) {
                    mostrarModalDicas(recomendacoes);
                }
            });
        });
        
        // Botões de alertas
        document.querySelectorAll('.mostrar-alertas-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const alertas = JSON.parse(this.getAttribute('data-alertas'));
                if (alertas) {
                    mostrarModalAlertas(alertas);
                }
            });
        });
        
        // Cards clicáveis
        document.querySelectorAll('.solution-card').forEach(card => {
            card.addEventListener('click', function(e) {
                // Verifica se não clicou em um botão ou elemento interativo
                if (!e.target.closest('button') && !e.target.closest('.cursor-pointer') && !e.target.closest('details')) {
                    const btn = this.querySelector('.buscar-solucao-btn');
                    if (btn) {
                        btn.click();
                    }
                }
            });
        });
    }
    
    // Função para mostrar erro de análise
    function mostrarErroAnalise(analise = null) {
        const erroHTML = '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">' +
            '<div class="flex items-center mb-4">' +
                '<i class="uil uil-exclamation-triangle text-yellow-600 text-2xl mr-3"></i>' +
                '<h3 class="text-lg font-medium text-yellow-800">Análise Automática Indisponível</h3>' +
            '</div>' +
            '<p class="text-yellow-700 mb-4">' +
                'Não foi possível gerar sugestões automáticas, mas você pode continuar com a busca manual.' +
            '</p>' +
            '<div class="bg-yellow-100 rounded-md p-3">' +
                '<p class="text-sm text-yellow-800">' +
                    '💡 <strong>Dica:</strong> Use palavras-chave específicas do seu objeto de contratação no campo abaixo.' +
                '</p>' +
            '</div>' +
        '</div>';
        
        solucoesContainer.innerHTML = erroHTML;
        solucoesSection.classList.remove('hidden');
    }
    
    // Funções auxiliares
    function getIconeCategoria(categoria) {
        const icones = {
            'Serviços': 'uil-users-alt',
            'Bens': 'uil-box',
            'Obras': 'uil-constructor',
            'Software': 'uil-laptop',
            'Tecnologia': 'uil-circuit',
            'Consultoria': 'uil-lightbulb-alt',
            'Manutenção': 'uil-wrench',
            'Treinamento': 'uil-graduation-cap'
        };
        return icones[categoria] || 'uil-layers';
    }
    
    function getIconeTipo(tipo, categoria) {
        const iconesTipo = {
            'principal': getIconeCategoria(categoria),
            'complementar': 'uil-puzzle-piece',
            'economica': 'uil-money-bill',
            'modular': 'uil-layers',
            'completo': 'uil-check-circle'
        };
        return iconesTipo[tipo] || 'uil-layers';
    }
    
    function getCorTipo(tipo, index) {
        const coresTipo = {
            'principal': 'blue',
            'complementar': 'green',
            'economica': 'yellow',
            'modular': 'purple',
            'completo': 'indigo'
        };
        
        const coresAlternativas = ['blue', 'green', 'purple', 'teal', 'indigo'];
        
        return coresTipo[tipo] || coresAlternativas[index % coresAlternativas.length];
    }
    
    function getTipoBadge(tipo) {
        const badges = {
            'principal': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full flex-shrink-0">Principal</span>',
            'complementar': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex-shrink-0">Complementar</span>',
            'economica': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex-shrink-0">Econômica</span>',
            'modular': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full flex-shrink-0">Modular</span>',
            'completo': '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full flex-shrink-0">Completo</span>'
        };
        return badges[tipo] || '';
    }
    
    function getCorComplexidade(complexidade) {
        const cores = {
            'Baixa': 'green',
            'Média': 'blue',
            'Alta': 'red'
        };
        return cores[complexidade] || 'blue';
    }
    
    function getCorComplexidadeClass(complexidade) {
        const classes = {
            'Baixa': 'text-green-700 bg-green-100',
            'Média': 'text-blue-700 bg-blue-100',
            'Alta': 'text-red-700 bg-red-100'
        };
        return classes[complexidade] || 'text-gray-700 bg-gray-100';
    }
    
    // Função para mostrar modal com dicas
    function mostrarModalDicas(recomendacoes) {
        const modalHTML = '<div id="modal-dicas" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">' +
            '<div class="bg-white rounded-lg shadow-xl max-w-md w-full">' +
                '<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">' +
                    '<h3 class="text-lg font-semibold text-gray-900 flex items-center">' +
                        '<i class="uil uil-lightbulb mr-2 text-yellow-500"></i>' +
                        'Dicas de Busca' +
                    '</h3>' +
                    '<button onclick="fecharModalDicas()" class="text-gray-400 hover:text-gray-600">' +
                        '<i class="uil uil-times text-xl"></i>' +
                    '</button>' +
                '</div>' +
                '<div class="p-6">' +
                    '<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">' +
                        '<p class="text-sm text-gray-700 leading-relaxed">' + escapeHtml(recomendacoes) + '</p>' +
                    '</div>' +
                '</div>' +
                '<div class="px-6 py-4 border-t border-gray-200 flex justify-end">' +
                    '<button onclick="fecharModalDicas()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">' +
                        'Entendi' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Função para mostrar modal com alertas
    function mostrarModalAlertas(alertas) {
        let alertasHTML = '';
        alertas.forEach(alerta => {
            alertasHTML += '<p class="text-sm text-amber-700 mb-2">• ' + escapeHtml(alerta) + '</p>';
        });
        
        const modalHTML = '<div id="modal-alertas" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">' +
            '<div class="bg-white rounded-lg shadow-xl max-w-md w-full">' +
                '<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">' +
                    '<h3 class="text-lg font-semibold text-gray-900 flex items-center">' +
                        '<i class="uil uil-exclamation-triangle mr-2 text-amber-500"></i>' +
                        'Pontos de Atenção' +
                    '</h3>' +
                    '<button onclick="fecharModalAlertas()" class="text-gray-400 hover:text-gray-600">' +
                        '<i class="uil uil-times text-xl"></i>' +
                    '</button>' +
                '</div>' +
                '<div class="p-6">' +
                    '<div class="bg-amber-50 border border-amber-200 rounded-md p-4">' +
                        alertasHTML +
                    '</div>' +
                '</div>' +
                '<div class="px-6 py-4 border-t border-gray-200 flex justify-end">' +
                    '<button onclick="fecharModalAlertas()" class="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700">' +
                        'Entendi' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Função para fechar modal de dicas
    window.fecharModalDicas = function() {
        const modal = document.getElementById('modal-dicas');
        if (modal) {
            modal.remove();
        }
    };
    
    // Função para fechar modal de alertas
    window.fecharModalAlertas = function() {
        const modal = document.getElementById('modal-alertas');
        if (modal) {
            modal.remove();
        }
    };
    
    // Função para adicionar palavra-chave ao campo
    window.adicionarPalavraChave = function(palavra) {
        const palavrasAtuais = palavrasChaveInput.value.trim();
        if (palavrasAtuais) {
            // Verifica se a palavra já não está na lista
            const palavras = palavrasAtuais.split(',').map(p => p.trim().toLowerCase());
            if (!palavras.includes(palavra.toLowerCase())) {
                palavrasChaveInput.value = palavrasAtuais + ', ' + palavra;
            }
        } else {
            palavrasChaveInput.value = palavra;
        }
        
        // Destaca o campo brevemente
        palavrasChaveInput.classList.add('ring-2', 'ring-blue-500', 'border-blue-500');
        setTimeout(() => {
            palavrasChaveInput.classList.remove('ring-2', 'ring-blue-500', 'border-blue-500');
        }, 1000);
        
        mostrarToast('Palavra-chave "' + palavra + '" adicionada!', 'success');
    };
    
    // Event listener para o formulário principal
    if (formPesquisa) {
        formPesquisa.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validações básicas
            const palavrasChave = palavrasChaveInput.value.trim();
            
            if (!palavrasChave) {
                mostrarToast('Por favor, insira pelo menos uma palavra-chave para busca.', 'warning');
                palavrasChaveInput.focus();
                return;
            }
            
            // Mostra loading
            mostrarLoading();
            
            // Coleta dados do formulário
            const formData = {
                descricao: 'Pesquisa de preços para: ' + palavrasChave,
                palavras_chave: palavrasChave.split(',').map(p => p.trim()).filter(p => p),
                ufs: coletarFiltrosSelecionados('uf'),
                esferas: coletarFiltrosSelecionados('esfera'),
                modalidades: coletarFiltrosSelecionados('modalidade')
            };
            
            console.log('📋 Dados da busca:', formData);
            
            // Envia requisição
            enviarPesquisaPDP(formData);
        });
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
    
    async function enviarPesquisaPDP(dados) {
        try {
            const projetoId = extrairProjetoId();
            
            console.log('🚀 Enviando pesquisa para projeto:', projetoId);
            
            const response = await fetch('/projetos/' + projetoId + '/create_pdp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dados)
            });
            
            if (response.ok) {
                const resultado = await response.json();
                console.log('✅ Resultado da pesquisa:', resultado);
                
                mostrarToast('Pesquisa concluída com sucesso!', 'success');
                
                // Redireciona para página de resultados
                setTimeout(() => {
                    window.location.href = '/projetos/' + projetoId + '/confere_pdp';
                }, 1500);
            } else {
                const erro = await response.json();
                throw new Error(erro.detail || 'Erro na pesquisa');
            }
            
        } catch (error) {
            console.error('❌ Erro:', error);
            mostrarToast('Erro ao realizar pesquisa: ' + error.message, 'error');
        } finally {
            esconderLoading();
        }
    }
    
    function extrairProjetoId() {
        // Extrai ID da URL: /projetos/2/criar_pdp
        const pathname = window.location.pathname;
        const matches = pathname.match(/\/projetos\/(\d+)\//);
        return matches ? matches[1] : null;
    }
    
    function coletarFiltrosSelecionados(tipo) {
        const checkboxes = document.querySelectorAll('.' + tipo + '-option:checked');
        return Array.from(checkboxes).map(cb => cb.value);
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
    
    // Inicializar filtros e outros event listeners
    inicializarFiltros();
    
    function inicializarFiltros() {
        // Event listeners para os modais de filtro
        const filtros = ['esfera', 'uf', 'modalidade'];
        
        filtros.forEach(filtro => {
            const btn = document.getElementById('filter-' + filtro + '-btn');
            const modal = document.getElementById('filter-' + filtro + '-modal');
            const closeBtn = document.getElementById('close-' + filtro + '-modal');
            const cancelBtn = document.getElementById('cancel-' + filtro);
            const applyBtn = document.getElementById('apply-' + filtro);
            
            if (btn && modal) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('hidden');
                });
                
                [closeBtn, cancelBtn].forEach(btn => {
                    if (btn) {
                        btn.addEventListener('click', () => {
                            modal.classList.add('hidden');
                        });
                    }
                });
                
                if (applyBtn) {
                    applyBtn.addEventListener('click', () => {
                        modal.classList.add('hidden');
                        atualizarContadorFiltro(filtro);
                    });
                }
            }
        });
    }
    
    function atualizarContadorFiltro(tipo) {
        const checkboxes = document.querySelectorAll('.' + tipo + '-option:checked');
        const contador = document.getElementById(tipo + '-count');
        if (contador) {
            contador.textContent = checkboxes.length;
        }
    }
    
    console.log('✅ pdp-inicial.js inicializado com sucesso');
});