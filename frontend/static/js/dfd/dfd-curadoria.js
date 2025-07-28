document.addEventListener('DOMContentLoaded', function () {
    // const jsonData = {
    //     // unidade_demandante: 'Tribunal Regional Eleitoral do Acre\nSeção de Gestão de Pessoas\nEndereço: Rua Benjamin Constant, 348 - Centro, Rio Branco - AC\nTelefone: (68) 3213-4100\nResponsável: João Carlos da Silva - Diretor de Secretaria', // TODO: necessario implementar uma forma de obter o campo. posteriormente ela sera implementada.
    //     objeto_a_ser_contratado: 'Contratação de serviços de capacitação, com foco na formação continuada para atualização e aprimoramento de competências de Juízes, Servidores e Colaboradores da Justiça Eleitoral, visando atuação eficaz nas questões jurídicas do processo eleitoral e resolução de problemas relacionados à falta de especialização.',
    //     justificativa: 'A contratação se justifica pela necessidade de prover cursos de formação continuada, visando a atualização, desenvolvimento e aprimoramento de competências de Juízes, Servidores e Colaboradores da Justiça Eleitoral que atuarão nas questões jurídicas afetas ao processo eleitoral, garantindo assim a qualidade e a eficiência dos serviços prestados.',
    //     quantidade_justifica_a_ser_contratada: [
    //         { id_do_item: 1, descricao: 'Prestação de Serviços Continuados', quantidade: 10 },
    //         { id_do_item: 2, descricao: 'Aquisição de Material de Escritório', quantidade: 500 },
    //         { id_do_item: 3, descricao: 'Serviços de Consultoria Técnica', quantidade: 5 }
    //     ],
    //     previsao_da_entrega_do_bem_ou_inicio_dos_servicos: '01/06/2026',
    //     alinhamento_estrategico: [
    //         'Aperfeiçoamento da Gestão de Pessoas',
    //         'Aperfeiçoamento da Gestão Administrativa e da Governança Judiciária'
    //     ],
    //     equipe_de_planejamento: 'Equipe responsável pelo planejamento: João Silva (Coordenador), Maria Santos (Analista), Carlos Oliveira (Consultor Técnico)'
    // };

    const jsonData = JSON.parse(localStorage.getItem("draftDFD"));

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

    // Função para normalizar texto (remove acentos, espaços extras, converte para minúsculo)
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

    // Função para popular identificação da unidade demandante
    function popularUnidadeDemandante() {
        const textarea = document.getElementById('unidade-demandante');
        if (!textarea) {
            console.warn('Elemento unidade-demandante não encontrado');
            return;
        }
        
        const unidadeDemandante = jsonData.group_created || '';
        textarea.value = unidadeDemandante;
        
        console.log('Unidade demandante populada:', unidadeDemandante);
    }

    // NOVA FUNÇÃO: Popular objeto a ser contratado
    function popularObjetoContratado() {
        const textarea = document.getElementById('objeto-contratado');
        if (!textarea) {
            console.warn('Elemento objeto-contratado não encontrado');
            return;
        }
        
        const objetoContratado = jsonData.objeto_a_ser_contratado || '';
        textarea.value = objetoContratado;
        
        console.log('Objeto a ser contratado populado:', objetoContratado);
    }

    // NOVA FUNÇÃO: Popular justificativa da necessidade
    function popularJustificativa() {
        const textarea = document.getElementById('justificativa');
        if (!textarea) {
            console.warn('Elemento justificativa não encontrado');
            return;
        }
        
        const justificativa = jsonData.justificativa || '';
        textarea.value = justificativa;
        
        console.log('Justificativa populada:', justificativa);
    }

    // NOVA FUNÇÃO: Popular previsão da data de entrega
    function popularPrevisaoEntrega() {
        const input = document.getElementById('previsao-entrega');
        if (!input) {
            console.warn('Elemento previsao-entrega não encontrado');
            return;
        }
        
        let previsaoEntrega = jsonData.previsao_da_entrega_do_bem_ou_inicio_dos_servicos || '';
        
        // Converter formato datetime para DD/MM/YYYY
        if (previsaoEntrega) {
            try {
                const data = new Date(previsaoEntrega);
                if (!isNaN(data.getTime())) {
                    const dia = String(data.getDate()).padStart(2, '0');
                    const mes = String(data.getMonth() + 1).padStart(2, '0'); // +1 porque getMonth() retorna 0-11
                    const ano = data.getFullYear();
                    previsaoEntrega = `${dia}/${mes}/${ano}`;
                }
            } catch (error) {
                console.warn('Erro ao converter data:', error);
            }
        }
        
        input.value = previsaoEntrega;
        
        console.log('Previsão de entrega populada:', previsaoEntrega);
    }

    // FUNÇÃO ATUALIZADA: Processar alinhamento estratégico com template base
    function processarAlinhamentoEstrategico() {
        const textarea = document.getElementById('alinhamento-estrategico');
        if (!textarea) {
            console.warn('Elemento alinhamento-estrategico não encontrado');
            return;
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
        
        // Se o textarea estiver vazio, popula com o template
        if (!textarea.value.trim()) {
            textarea.value = templateAlinhamento;
        }
        
        let conteudo = textarea.value;
        
        // Verifica se existe alinhamento estratégico no JSON
        const alinhamentos = jsonData.alinhamento_estrategico || [];
        const temAlinhamento = Array.isArray(alinhamentos) && alinhamentos.length > 0;
        
        console.log('Alinhamentos do JSON:', alinhamentos);
        console.log('Tem alinhamento?', temAlinhamento);
        
        // PRIMEIRO: Limpa todas as marcações existentes para evitar conflitos
        conteudo = conteudo.replace(/\(X\)/g, '( )');
        
        if (temAlinhamento) {
            console.log('Marcando SIM - encontrou alinhamentos');
            
            // Marca "Sim"
            conteudo = conteudo.replace(/\(\s*\)\s*Sim\s*-\s*Qual\?/gi, '(X) Sim - Qual?');
            
            // Marca as opções específicas encontradas no JSON
            alinhamentos.forEach(alinhamentoJson => {
                console.log('Processando alinhamento:', alinhamentoJson);
                
                let melhorOpcao = null;
                let melhorSimilaridade = 0;
                
                // Encontra a melhor correspondência para cada alinhamento do JSON
                Object.keys(opcoesEstrategicas).forEach(opcaoFormulario => {
                    const similaridade = calcularSimilaridade(alinhamentoJson, opcaoFormulario);
                    
                    if (similaridade > melhorSimilaridade && similaridade >= 0.6) { // Threshold de 60%
                        melhorSimilaridade = similaridade;
                        melhorOpcao = opcaoFormulario;
                    }
                });
                
                // Se encontrou uma correspondência válida, marca a opção
                if (melhorOpcao) {
                    console.log(`Marcando opção: ${melhorOpcao} (similaridade: ${melhorSimilaridade})`);
                    const regex = new RegExp(`\\(\\s*\\)\\s*${melhorOpcao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
                    conteudo = conteudo.replace(regex, `(X) ${melhorOpcao}`);
                } else {
                    console.warn(`Nenhuma correspondência encontrada para: ${alinhamentoJson}`);
                }
            });
        } else {
            console.log('Marcando NÃO - array vazio ou inexistente');
            
            // Marca "Não" - usando regex mais flexível para capturar variações de espaçamento
            conteudo = conteudo.replace(/\(\s*\)\s*Não/gi, '(X) Não');
        }
        
        textarea.value = conteudo;
        console.log('Processamento do alinhamento estratégico concluído');
    }

    // Função para popular as informações adicionais
    function popularInformacoesAdicionais() {
        const textarea = document.getElementById('informacoes-adicionais');
        if (!textarea) {
            console.warn('Elemento informacoes-adicionais não encontrado');
            return;
        }
        
        // Popula o campo com o valor do JSON
        const equipeplanejamento = jsonData.equipe_de_planejamento || '';
        textarea.value = equipeplanejamento;
        
        console.log('Informações adicionais populadas:', equipeplanejamento);
    }

    // NOVA FUNÇÃO: Popular todos os campos automaticamente
    function popularTodosCampos() {
        console.log('Iniciando população automática de todos os campos...');
        
        popularUnidadeDemandante();
        popularObjetoContratado();
        popularJustificativa();
        popularPrevisaoEntrega();
        processarAlinhamentoEstrategico();
        popularInformacoesAdicionais();
        
        console.log('População automática de campos concluída!');
    }

    // FUNÇÃO ATUALIZADA: Extrair todos os dados do formulário e converter para JSON (removidos título e unidade)
    function extrairDadosFormulario() {
        try {
            // 1. Extrair unidade demandante
            const unidadeDemandante = document.getElementById('unidade-demandante')?.value?.trim() || ''; 
            
            // 2. Extrair objeto a ser contratado
            const objetoContratado = document.getElementById('objeto-contratado')?.value?.trim() || '';
            
            // 3. Extrair justificativa
            const justificativa = document.getElementById('justificativa')?.value?.trim() || '';
            
            // 4. Extrair quantidade justificada (itens dinâmicos)
            const itemsContainer = document.getElementById('items-container');
            const quantidadeItens = [];
            
            if (itemsContainer) {
                const itemRows = itemsContainer.querySelectorAll('.flex.items-center.gap-3');
                
                itemRows.forEach((row, index) => {
                    const descricaoInput = row.querySelector('input[type="text"]');
                    const quantidadeInput = row.querySelector('input[type="number"]');
                    
                    const descricao = descricaoInput?.value?.trim() || null;
                    const quantidade = quantidadeInput?.value ? parseInt(quantidadeInput.value) : null;
                    
                    quantidadeItens.push({
                        id_do_item: index + 1,
                        descricao: descricao,
                        quantidade: quantidade
                    });
                });
            }
            
            // Se não há itens, adiciona um item vazio conforme o exemplo
            if (quantidadeItens.length === 0) {
                quantidadeItens.push({
                    id_do_item: 1,
                    descricao: null,
                    quantidade: null
                });
            }
            
            // 5. Extrair previsão de entrega
            const previsaoEntrega = document.getElementById('previsao-entrega')?.value?.trim() || '';
            
            // 6. Extrair alinhamento estratégico
            const alinhamentoTextarea = document.getElementById('alinhamento-estrategico');
            const alinhamentoEstrategico = [];
            
            if (alinhamentoTextarea) {
                const conteudo = alinhamentoTextarea.value;
                
                // Lista de todas as opções possíveis
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
                
                // Verifica quais opções estão marcadas (X)
                opcoesPossiveis.forEach(opcao => {
                    // Cria regex para encontrar a opção marcada
                    const regex = new RegExp(`\\(X\\)\\s*${opcao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                    if (regex.test(conteudo)) {
                        alinhamentoEstrategico.push(opcao);
                    }
                });
            }
            
            // 7. Extrair equipe de planejamento (informações adicionais)
            const equipePlanejamento = document.getElementById('informacoes-adicionais')?.value?.trim() || '';
            
            // Recuperar o item do PCA que foi salvo no localStorage
            const item = jsonData && jsonData.item !== undefined ? jsonData.item : 0;
            
            // Montar o JSON final
            const dadosJSON = {
                unidade_demandante: unidadeDemandante, // Temporariamente vazio - TODO: implementar obtenção do campo
                objeto_a_ser_contratado: objetoContratado,
                justificativa: justificativa,
                quantidade_justifica_a_ser_contratada: quantidadeItens,
                previsao_da_entrega_do_bem_ou_inicio_dos_servicos: previsaoEntrega,
                alinhamento_estrategico: alinhamentoEstrategico,
                equipe_de_planejamento: equipePlanejamento,
                item: item // Incluindo o item do PCA
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

    // Função para criar uma nova linha de item
    const createItemRow = (item) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'flex items-center gap-3 p-2 border rounded-md';

        const descriptionInput = document.createElement('input');
        descriptionInput.type = 'text';
        descriptionInput.value = item.descricao || '';
        descriptionInput.placeholder = 'Descrição do item';
        descriptionInput.className = 'flex-grow p-2 border-gray-300 border rounded-md';

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.value = item.quantidade || '';
        quantityInput.placeholder = 'Qtd.';
        quantityInput.className = 'w-24 p-2 border-gray-300 border rounded-md';
        quantityInput.min = '1';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-500 hover:text-red-700';
        deleteBtn.innerHTML = '<i class="las la-trash-alt text-xl"></i>';
        deleteBtn.onclick = () => itemRow.remove();

        itemRow.appendChild(descriptionInput);
        itemRow.appendChild(quantityInput);
        itemRow.appendChild(deleteBtn);

        return itemRow;
    };

    // Popular itens iniciais do JSON
    if (itemsContainer) {
        const items = jsonData.quantidade_justifica_a_ser_contratada;
        if (Array.isArray(items)) {
            items.forEach(item => {
                itemsContainer.appendChild(createItemRow(item));
            });
        } else if (items) {
            itemsContainer.appendChild(createItemRow(items));
        }
    }

    // Event listener para o botão "Adicionar Item"
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn && itemsContainer) {
        addItemBtn.addEventListener('click', () => {
            itemsContainer.appendChild(createItemRow({}));
        });
    }

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

    // EVENT LISTENER: Configurar o botão "Salvar alterações"
    const botaoSalvarAlteracoes = document.querySelector('button:has(i.las.la-save)');
    if (botaoSalvarAlteracoes) {
        botaoSalvarAlteracoes.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (validarFormulario()) {
                const dados = extrairDadosFormulario();
                
                // Exibe os dados no console
                console.log('Dados extraídos do formulário:', JSON.stringify(dados, null, 2));
                
                // Salva os dados no localStorage
                try {
                    localStorage.setItem('dfdDados', JSON.stringify(dados));
                    console.log('Dados salvos no localStorage com sucesso!');
                } catch (error) {
                    console.error('Erro ao salvar dados no localStorage:', error);
                    exibirAlerta('Erro', 'Erro ao salvar os dados. Tente novamente.', 'error');
                    return;
                }
                
                exibirAlerta(
                    'Dados Salvos com Sucesso!', 
                    'Todos os campos foram validados e os dados foram salvos com sucesso!\n\nRedirecionando para a página de resultado...', 
                    'success'
                );
                
                // Redireciona para a página de resultado após 2 segundos
                setTimeout(() => {
                    window.location.href = window.location.href.replace("confere_dfd", "visualizacao_dfd");
                }, 200);
            }
        });
    }

    // CHAMADA PRINCIPAL: Popular todos os campos automaticamente ao carregar a página
    popularTodosCampos();

    // Exportar funções para uso global
    window.extrairDadosFormulario = extrairDadosFormulario;
    window.validarFormulario = validarFormulario;
    window.exibirAlerta = exibirAlerta;
    window.popularTodosCampos = popularTodosCampos;
});