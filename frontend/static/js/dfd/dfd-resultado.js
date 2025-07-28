// Inicializar jsPDF
const { jsPDF } = window.jspdf;

// Configuração do endpoint
const BASE_URL = window.location.origin;


// Função para carregar dados do localStorage
function loadDataFromStorage() {
    try {
        const savedData = localStorage.getItem('dfdDados');
        if (!savedData) {
            console.warn('Nenhum dado encontrado no localStorage');
            showError('Nenhum dado encontrado. Retorne à página de curadoria para gerar o documento.');
            return null;
        }
        
        const parsedData = JSON.parse(savedData);
        console.log('Dados carregados do localStorage:', parsedData);
        return parsedData;
    } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
        showError('Erro ao carregar os dados salvos. Retorne à página de curadoria.');
        return null;
    }
}

// Função para exibir erro
function showError(message) {
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.innerHTML = `
            <div class="inline-flex items-center text-red-700 bg-red-50 border border-red-200 font-medium rounded-lg text-sm px-4 py-2">
                <i class="uil uil-exclamation-triangle mr-2"></i>
                ${message}
            </div>
        `;
    }
}

// Função para exibir sucesso
function showSuccess(message) {
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.innerHTML = `
            <div class="inline-flex items-center text-green-700 bg-green-50 border border-green-200 font-medium rounded-lg text-sm px-4 py-2">
                <i class="uil uil-check mr-2"></i>
                ${message}
            </div>
        `;
    }
}

// Dados JSON de exemplo para fallback (caso não encontre dados no localStorage)
const sampleJSON = {
    "unidade_demandante": "Tribunal Regional Eleitoral do Acre\nSeção de Gestão de Pessoas\nEndereço: Rua Benjamin Constant, 348 - Centro, Rio Branco - AC\nTelefone: (68) 3213-4100\nResponsável: João Carlos da Silva - Diretor de Secretaria",
    "objeto_a_ser_contratado": "Contratação de serviços de capacitação, com foco na formação continuada para atualização e aprimoramento de competências de Juízes, Servidores e Colaboradores da Justiça Eleitoral, visando atuação eficaz nas questões jurídicas do processo eleitoral e resolução de problemas relacionados à falta de especialização.",
    "justificativa": "A contratação se justifica pela necessidade de prover cursos de formação continuada, visando a atualização, desenvolvimento e aprimoramento de competências de Juízes, Servidores e Colaboradores da Justiça Eleitoral que atuarão nas questões jurídicas afetas ao processo eleitoral, garantindo assim a qualidade e a eficiência dos serviços prestados.",
    "quantidade_justifica_a_ser_contratada": [
        {
            "id_do_item": 1,
            "descricao": "Prestação de Serviços Continuados",
            "quantidade": 10
        },
        {
            "id_do_item": 2,
            "descricao": "Aquisição de Material de Escritório",
            "quantidade": 500
        },
        {
            "id_do_item": 3,
            "descricao": "Serviços de Consultoria Técnica",
            "quantidade": 5
        }
    ],
    "previsao_da_entrega_do_bem_ou_inicio_dos_servicos": "01/06/2026",
    "alinhamento_estrategico": [
        "Aperfeiçoamento da Gestão Administrativa e da Governança Judiciária",
        "Aperfeiçoamento da Gestão de Pessoas"
    ],
    "equipe_de_planejamento": "Equipe responsável pelo planejamento: João Silva (Coordenador), Maria Santos (Analista), Carlos Oliveira (Consultor Técnico)"
};

// Variável global para armazenar o PDF atual
let currentPDF = null;

// Função para quebrar texto no PDF
function wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (testLine.length > maxWidth) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                lines.push(word);
            }
        } else {
            currentLine = testLine;
        }
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

// Função para gerar PDF a partir dos dados JSON
function generatePDF(jsonData) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15; // Margem reduzida para tornar tabelas mais largas
    const lineHeight = 7; // Aumentado para melhor espaçamento com fontes maiores
    const maxWidth = pageWidth - (margin * 2); // Largura total menos margens
    const textMaxWidth = 70; // caracteres por linha para quebra de texto
    let yPosition = 30;

    // Cabeçalho - Nome da instituição
    doc.setFontSize(9);
    doc.setFont("times", "normal");
    doc.text("TRIBUNAL REGIONAL ELEITORAL DO ACRE", pageWidth/2, yPosition, { align: 'center' });
    yPosition += 6;
    
    // Linha do endereço
    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.text("Alameda Ministro Miguel Ferrante, 224 - Bairro Portal da Amazônia - CEP 69915-632 - Rio Branco - AC", pageWidth/2, yPosition, { align: 'center' });
    yPosition += 15;

    // Título do documento e número
    doc.setFontSize(12);
    doc.setFont("times", "bold");
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const docTitle = `DFD - DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA - ${currentDate}`;
    doc.text(docTitle, pageWidth/2, yPosition, { align: 'center' });
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.text("ANEXO I", pageWidth/2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(11);
    doc.text("DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA (DFD)/FORMULÁRIO PARA PEDIDO DE", pageWidth/2, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text("AQUISIÇÃO/CONTRATAÇÃO (FPA)", pageWidth/2, yPosition, { align: 'center' });
    yPosition += 20;

    // Função auxiliar para normalizar texto (remove acentos, espaços extras, converte para minúsculo)
    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/\s+/g, ' ') // Remove espaços extras
            .trim();
    }

    // Função auxiliar para calcular similaridade entre duas strings
    function calculateSimilarity(str1, str2) {
        const s1 = normalizeText(str1);
        const s2 = normalizeText(str2);
        
        // Se uma string contém a outra (após normalização), considera alta similaridade
        if (s1.includes(s2) || s2.includes(s1)) {
            return 0.9;
        }
        
        // Verifica palavras-chave em comum
        const words1 = s1.split(' ').filter(p => p.length > 2);
        const words2 = s2.split(' ').filter(p => p.length > 2);
        
        let commonWords = 0;
        words1.forEach(p1 => {
            if (words2.some(p2 => p1.includes(p2) || p2.includes(p1))) {
                commonWords++;
            }
        });
        
        const maxWords = Math.max(words1.length, words2.length);
        return maxWords > 0 ? commonWords / maxWords : 0;
    }

    // Função auxiliar para formatar seção de alinhamento estratégico
    function formatStrategicAlignment(jsonData) {
        // Todas as opções estratégicas disponíveis
        const strategicOptions = [
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

        const alignments = jsonData.alinhamento_estrategico || [];
        const hasAlignment = Array.isArray(alignments) && alignments.length > 0;

        // Criar o array de opções marcadas
        const markedOptions = new Set();
        
        if (hasAlignment) {
            // Encontrar correspondências para cada alinhamento no JSON
            alignments.forEach(alignmentJson => {
                let bestOption = null;
                let bestSimilarity = 0;
                
                strategicOptions.forEach(option => {
                    const similarity = calculateSimilarity(alignmentJson, option);
                    
                    if (similarity > bestSimilarity && similarity >= 0.6) { // Limiar de 60%
                        bestSimilarity = similarity;
                        bestOption = option;
                    }
                });
                
                if (bestOption) {
                    markedOptions.add(bestOption);
                }
            });
        }

        return { hasAlignment, markedOptions, strategicOptions };
    }

    // Função auxiliar para adicionar texto justificado
    function addJustifiedText(text, x, y, maxWidth) {
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line, index) => {
            if (index < lines.length - 1) { // Não justificar a última linha
                doc.text(line, x, y + (index * lineHeight), { align: 'justify', maxWidth: maxWidth });
            } else {
                doc.text(line, x, y + (index * lineHeight));
            }
        });
        return lines.length * lineHeight;
    }

    // Função auxiliar para criar uma caixa de seção com bordas
    function createSectionBox(title, subtitle, content, startY, isTableContent = false, isItemsList = false, customContentHeight = null) {
        const sectionWidth = maxWidth;
        const padding = 4; // Reduzido de volta para 4px
        const topMargin = 4; // Reduzido para 4px
        let contentHeight = 0;
        
        // Calcular altura do título com quebra
        doc.setFontSize(10);
        doc.setFont("times", "bold");
        const titleLines = doc.splitTextToSize(title, sectionWidth - 16); // Padding mais conservador para quebra
        const titleHeight = titleLines.length * 7 + 6; // Altura dinâmica baseada nas linhas
        
        // Calcular altura do subtítulo com quebra
        let subtitleHeight = 0;
        let subtitleLines = [];
        if (subtitle) {
            doc.setFontSize(9);
            doc.setFont("times", "normal");
            subtitleLines = doc.splitTextToSize(subtitle, sectionWidth - 16); // Padding mais conservador
            subtitleHeight = subtitleLines.length * 6 + 4;
        }
        
        // Usar altura de conteúdo personalizada se fornecida, caso contrário calcular
        if (customContentHeight !== null) {
            contentHeight = customContentHeight;
        } else {
            // Calcular altura do conteúdo
            if (isTableContent) {
                // Para conteúdo da unidade demandante (hardcoded), calcular baseado no texto fixo
                const unidadeText = "Unidade: Diversas unidades da Secretaria do Tribunal e todas as Zonas Eleitorais\nResponsável: Carlos Venícius Ferreira Ribeiro (pelo apresentação do DFD)";
                const lines = unidadeText.split('\n');
                let textHeight = 0;
                
                lines.forEach(line => {
                    if (line.trim()) {
                        const wrappedLines = doc.splitTextToSize(line.trim(), sectionWidth - 8);
                        textHeight += (wrappedLines.length * 6) + 2; // 6px por linha + 2px de espaço
                    }
                });
                
                contentHeight = Math.max(textHeight + 8, 30); // Altura mínima de 30px
            } else if (isItemsList && Array.isArray(content)) {
                // Calcular altura para lista de itens - deve corresponder ao usado em addContentToBox
                content.forEach((item, index) => {
                    const itemNumber = String(index + 1).padStart(2, '0');
                    const itemText = `Item ${itemNumber} - ${item.descricao}`;
                    const lines = doc.splitTextToSize(itemText, sectionWidth - 8); // Cálculo de padding reduzido
                    const itemTextHeight = lines.length * 7; // Altura do texto do item usando lineHeight
                    contentHeight += itemTextHeight + 4 + 7 + 10; // textHeight + 4 (espaço) + 7 (linha quantidade) + 10 (espaço final)
                });
                contentHeight += padding;
            } else {
                // Calcular altura para conteúdo de texto regular
                const lines = doc.splitTextToSize(content || 'Não informado', sectionWidth - 8); // Cálculo de padding reduzido
                contentHeight = (lines.length * 6) + padding; // Aumentado para fonte maior
            }
        }
        
        const totalHeight = titleHeight + subtitleHeight + contentHeight + padding + topMargin;
        
        // Desenhar borda externa com linha mais fina
        doc.setLineWidth(0.2);
        doc.setDrawColor(0, 0, 0); // Preto para borda externa
        doc.rect(margin, startY, sectionWidth, totalHeight);
        
        // Desenhar linha de fundo do título em cinza claro
        doc.setDrawColor(169, 169, 169); // Cinza claro
        doc.setLineWidth(0.2);
        doc.line(margin, startY + titleHeight + subtitleHeight, margin + sectionWidth, startY + titleHeight + subtitleHeight);
        
        // Resetar cor de desenho para preto
        doc.setDrawColor(0, 0, 0);
        
        // Adicionar título com quebra de linha adequada
        doc.setFontSize(10);
        doc.setFont("times", "bold");
        titleLines.forEach((line, index) => {
            doc.text(line, margin + 4, startY + 10 + (index * 7));
        });
        
        // Adicionar subtítulo se fornecido com quebra de linha adequada
        if (subtitle) {
            doc.setFontSize(9);
            doc.setFont("times", "normal");
            doc.setTextColor(128, 128, 128); // Cor cinza
            subtitleLines.forEach((line, index) => {
                doc.text(line, margin + 4, startY + titleHeight + 4 + (index * 6));
            });
            doc.setTextColor(0, 0, 0); // Resetar para preto
        }
        
        return { endY: startY + totalHeight, contentStartY: startY + titleHeight + subtitleHeight + topMargin + 4 };
    }

    // Função auxiliar para adicionar conteúdo da unidade demandante
    function addUnidadeDemandanteContent(startY, jsonData) {
        // Usar o campo unidade_demandante do JSON ou fallback para texto padrão
        const unidadeText = jsonData?.unidade_demandante || "Unidade: Diversas unidades da Secretaria do Tribunal e todas as Zonas Eleitorais\nResponsável: Carlos Venícius Ferreira Ribeiro (pelo apresentação do DFD)";
        
        doc.setFontSize(10);
        doc.setFont("times", "normal");
        doc.setTextColor(0, 0, 0);
        
        // Dividir o texto por quebras de linha (\n)
        const lines = unidadeText.split('\n');
        let currentY = startY;
        
        lines.forEach(line => {
            if (line.trim()) { // Apenas adicionar linhas não vazias
                const wrappedLines = doc.splitTextToSize(line.trim(), maxWidth - 8);
                wrappedLines.forEach(wrappedLine => {
                    doc.text(wrappedLine, margin + 4, currentY);
                    currentY += 6;
                });
                currentY += 2; // Espaço extra entre as linhas principais
            }
        });
        
        return currentY;
    }

    // Função auxiliar para adicionar conteúdo dentro de uma caixa de seção
    function addContentToBox(content, startY, isItemsList = false) {
        doc.setFontSize(10); // Aumentado de 9
        doc.setFont("times", "normal");
        let currentY = startY;
        
        if (isItemsList && Array.isArray(content)) {
            content.forEach((item, index) => {
                const itemNumber = String(index + 1).padStart(2, '0');
                const itemText = `Item ${itemNumber} - ${item.descricao}`;
                
                const textHeight = addJustifiedText(itemText, margin + 4, currentY, maxWidth - 8); // Padding horizontal reduzido
                currentY += textHeight + 4; // Espaçamento aumentado
                
                doc.text(`Quantidade: ${item.quantidade}`, margin + 8, currentY); // Padding horizontal reduzido
                currentY += 10; // Espaçamento aumentado
            });
        } else {
            addJustifiedText(content || 'Não informado', margin + 4, currentY, maxWidth - 8); // Padding horizontal reduzido
        }
    }

    // Seção 1 - IDENTIFICAÇÃO DA UNIDADE DEMANDANTE com conteúdo de texto
    if (yPosition > 240) {
        doc.addPage();
        yPosition = 30;
    }
    
    const section1 = createSectionBox("1 - IDENTIFICAÇÃO DA UNIDADE DEMANDANTE", null, "", yPosition, true);
    addUnidadeDemandanteContent(section1.contentStartY, jsonData);
    yPosition = section1.endY + 10;

    // Seção 2 - OBJETO A SER CONTRATADO
    if (yPosition > 240) {
        doc.addPage();
        yPosition = 30;
    }
    
    const section2 = createSectionBox("2. OBJETO A SER CONTRATADO", null, 
        jsonData.objeto_a_ser_contratado, yPosition);
    addContentToBox(jsonData.objeto_a_ser_contratado, section2.contentStartY);
    yPosition = section2.endY + 10;

    // Seção 3 - JUSTIFICATIVA DA NECESSIDADE DA CONTRATAÇÃO
    if (yPosition > 240) {
        doc.addPage();
        yPosition = 30;
    }
    
    const section3 = createSectionBox("3. JUSTIFICATIVA DA NECESSIDADE DA CONTRATAÇÃO", null,
        jsonData.justificativa, yPosition);
    addContentToBox(jsonData.justificativa, section3.contentStartY);
    yPosition = section3.endY + 10;

    // Seção 4 - QUANTIDADE JUSTIFICADA A SER CONTRATADA
    if (yPosition > 200) {
        doc.addPage();
        yPosition = 30;
    }
    
    const section4 = createSectionBox("4. QUANTIDADE JUSTIFICADA A SER CONTRATADA", null,
        jsonData.quantidade_justifica_a_ser_contratada, yPosition, false, true);
    addContentToBox(jsonData.quantidade_justifica_a_ser_contratada, section4.contentStartY, true);
    yPosition = section4.endY + 10;

    // Seção 5 - PREVISÃO DA DATA EM QUE DEVE SER ENTREGUE O BEM OU INICIADA A PRESTAÇÃO DOS SERVIÇOS
    if (yPosition > 260) {
        doc.addPage();
        yPosition = 30;
    }
    
    const deliveryText = `Data: ${jsonData.previsao_da_entrega_do_bem_ou_inicio_dos_servicos || 'Não informado'}`;
    const section5 = createSectionBox("5. PREVISÃO DA DATA EM QUE DEVE SER ENTREGUE O BEM OU INICIADA A PRESTAÇÃO DOS SERVIÇOS", 
        null, deliveryText, yPosition);
    addContentToBox(deliveryText, section5.contentStartY);
    yPosition = section5.endY + 10;

    // Seção 6 - ALINHAMENTO ESTRATÉGICO
    // Calcular altura total necessária para a seção
    const strategicData = formatStrategicAlignment(jsonData);
    const baseContentHeight = 60; // Altura base aumentada para fontes maiores
    const optionsHeight = strategicData.strategicOptions.length * 8; // Altura aumentada por opção
    const totalContentHeight = baseContentHeight + optionsHeight;
    const totalSectionHeight = totalContentHeight + 30; // Incluir altura do cabeçalho da seção
    
    // Verificar se há espaço suficiente na página atual
    if (yPosition + totalSectionHeight > 270) {
        doc.addPage();
        yPosition = 30;
    }

    const section6 = createSectionBox("6. ALINHAMENTO ESTRATÉGICO", null, "", yPosition, false, false, totalContentHeight);
    
    // Adicionar conteúdo de alinhamento estratégico manualmente para melhor formatação
    doc.setFontSize(10); // Aumentado de 9
    doc.setFont("times", "normal");
    let strategicY = section6.contentStartY;
    
    doc.text("A contratação está alinhada a algum objetivo do Plano Estratégico?", margin + 4, strategicY); // Padding horizontal reduzido
    strategicY += 10; // Espaçamento aumentado
    
    // Marcar "Sim" ou deixar desmarcado baseado nos dados
    const simMark = strategicData.hasAlignment ? "(X)" : "( )";
    doc.text(`${simMark} Sim - Qual?`, margin + 4, strategicY); // Padding horizontal reduzido
    strategicY += 10; // Espaçamento aumentado

    // Listar todas as opções estratégicas com marcação adequada
    strategicData.strategicOptions.forEach((option) => {
        const optionMark = strategicData.markedOptions.has(option) ? "(X)" : "( )";
        const optionText = `    ${optionMark} ${option}`;
        
        const textHeight = addJustifiedText(optionText, margin + 4, strategicY, maxWidth - 8); // Padding horizontal reduzido
        strategicY += Math.max(textHeight, 8); // Espaçamento mínimo aumentado
    });

    strategicY += 6; // Espaço aumentado antes de "Não"
    
    // Marcar "Não" ou deixar desmarcado baseado nos dados
    const naoMark = !strategicData.hasAlignment ? "(X)" : "( )";
    doc.text(`${naoMark} Não`, margin + 4, strategicY); // Padding horizontal reduzido

    yPosition = section6.endY + 10;

    // Seção final - RESPONSÁVEL PELA FORMALIZAÇÃO DA DEMANDA
    if (yPosition > 240) {
        doc.addPage();
        yPosition = 30;
    }

    // Criar caixa para o responsável
    const responsavelHeight = 50; // Altura fixa para a seção do responsável
    const responsavelBox = createSectionBox("RESPONSÁVEL PELA FORMALIZAÇÃO DA DEMANDA", null, "", yPosition, false, false, responsavelHeight);
    
    // Adicionar conteúdo do responsável (hardcoded)
    doc.setFontSize(10);
    doc.setFont("times", "normal");
    let responsavelY = responsavelBox.contentStartY;
    
    // Nome do responsável
    doc.setFont("times", "bold");
    doc.text("Carlos Venícius Ferreira Ribeiro", margin + 4, responsavelY);
    responsavelY += 10;
    
    // Cargo do responsável
    doc.setFont("times", "normal");
    doc.text("Secretário de Administração, Orçamento e Finanças", margin + 4, responsavelY);

    return doc;
}

// Função para exibir PDF no visualizador
function displayPDF(pdf) {
    const pdfDataUri = pdf.output('datauristring');
    const pdfViewer = document.getElementById('pdfViewer');
    const pdfPlaceholder = document.getElementById('pdfPlaceholder');
    
    pdfViewer.src = pdfDataUri;
    pdfPlaceholder.style.display = 'none';
    pdfViewer.style.display = 'block';
}

// Função para popular a pré-visualização do documento com PDF
function populateDocument(jsonData) {
    const pdf = generatePDF(jsonData);
    currentPDF = pdf;
    displayPDF(pdf);
}

// Event listener para carregar dados automaticamente quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('Carregando dados do localStorage...');
    
    // Tentar carregar dados do localStorage
    const savedData = loadDataFromStorage();
    
    if (savedData) {
        console.log('Dados encontrados, gerando PDF...');
        showSuccess('Dados carregados com sucesso! Gerando documento...');
        
        // Pequeno delay para mostrar o status de sucesso
        setTimeout(() => {
            populateDocument(savedData);
            
            // Atualizar status para concluído
            setTimeout(() => {
                showSuccess('Documento gerado com sucesso!');
            }, 1000);
        }, 500);
    } else {
        console.log('Nenhum dado encontrado no localStorage, usando dados de exemplo...');
        showError('Dados não encontrados.');
    }
});

// Funcionalidade do botão de download
document.getElementById('downloadButton').addEventListener('click', function() {
    if (currentPDF) {
        // Gerar nome do arquivo com data atual
        const currentDate = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const fileName = `DFD-${currentDate}.pdf`;
        currentPDF.save(fileName);
    } else {
        alert('Nenhum documento foi gerado ainda. Por favor, aguarde o processamento.');
    }
});

// Função para extrair project_id da URL
function getProjectIdFromUrl() {
    const url = window.location.pathname;
    const match = url.match(/\/projetos\/(\d+)\//);
    return match ? match[1] : null;
}

// Funcionalidade do botão salvar no banco
document.getElementById('saveButton').addEventListener('click', async function() {
    try {
        // Obter o project_id da URL
        const projectId = getProjectIdFromUrl();

        // Obter os dados salvos do localStorage
        const savedData = loadDataFromStorage();
        
        // // TEMPORÁRIO: Usar sampleJSON para testes
        // const dataToSend = sampleJSON;
        
        if (!savedData) {
            alert('Erro: Falha ao obter dados da curadoria. Por favor, retorne à página de curadoria e gere o documento novamente.');
            return;
        }

        // Mostrar loading
        const originalText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<i class="uil uil-spinner animate-spin mr-2"></i>Salvando...';

        // Fazer o POST para a API
        const response = await fetch(`${BASE_URL}/projetos/${projectId}/save_dfd`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'remote-user': 'user.test',
                'remote-groups': 'TI,OUTROS'
            },
            body: JSON.stringify(savedData)
        });

        if (!response.ok) {
            if (response.status === 409) {
                // Status 409 Conflict - DFD já existe
                alert('DFD já existente. Edite o DFD gerado, exclua ou comece um novo projeto.');

                setTimeout(() => {
                   window.location.href = `${BASE_URL}/projetos/${projectId}`;
                }, 300);

                return;
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
        }

        const result = await response.json();
        
        // Sucesso
        showSuccess('Documento salvo com sucesso no banco de dados!');
        console.log('Resultado do salvamento:', result);

        // Redirecionar após breve delay para mostrar a mensagem de sucesso
        setTimeout(() => {
            window.location.href = `${BASE_URL}/projetos/${projectId}`;
        }, 300);
        
    } catch (error) {
        console.error('Erro ao salvar documento:', error);
        showError(`Erro ao salvar documento. Tente novamente mais tarde`);
    } finally {
        // Restaurar botão
        this.disabled = false;
        this.innerHTML = originalText;
    }
});

// Função para ser chamada ao receber JSON de fonte externa
function processJSON(jsonResponse) {
    populateDocument(jsonResponse);
}