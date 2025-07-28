// Inicializar jsPDF
const { jsPDF } = window.jspdf;

// Configuração do endpoint
const BASE_URL = window.location.origin;


// Função para carregar dados do localStorage
function loadDataFromStorage() {
    try {
        const savedData = localStorage.getItem('pdpDados');
        if (!savedData) {
            console.warn('Nenhum dado encontrado no localStorage para pdpDados');
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
    "orgaos_contratantes": [
        {
            "orgao_contratante": "CAMARA MUNICIPAL DE DEP. IRUAN PINHEIRO",
            "processo_pregao": "PREGÃO ELETRÔNICO 001/2024",
            "empresa_adjudicada": "Soluções TI Ltda.",
            "cnpj": "12.345.678/0001-99",
            "objeto": "Aquisição de equipamentos de informática para modernização do plenário.",
            "items": [
                {
                    "n_item": 1,
                    "descricao": "Notebook Core i5, 8GB RAM, SSD 256GB",
                    "marca_modelo": "Dell Inspiron",
                    "unidade_medida": "Unidade",
                    "quantidade": 15,
                    "valor_unitario": 3500.00
                },
                {
                    "n_item": 2,
                    "descricao": "Monitor LED 24 polegadas",
                    "marca_modelo": "LG UltraWide",
                    "unidade_medida": "Unidade",
                    "quantidade": 30,
                    "valor_unitario": 850.50
                }
            ]
        },
        {
            "orgao_contratante": "TRIBUNAL DE JUSTIÇA",
            "processo_pregao": "CONCORRÊNCIA 008/2024",
            "empresa_adjudicada": "Segurança Total S.A.",
            "cnpj": "33.444.555/0001-66",
            "objeto": "Contratação de serviços de segurança patrimonial para o fórum.",
            "items": [
                {
                    "n_item": 1,
                    "descricao": "Posto de vigilância 12h diurno",
                    "marca_modelo": "N/A",
                    "unidade_medida": "Posto/mês",
                    "quantidade": 24,
                    "valor_unitario": 4500.00
                },
                {
                    "n_item": 2,
                    "descricao": "Sistema de monitoramento CFTV",
                    "marca_modelo": "Intelbras",
                    "unidade_medida": "Sistema",
                    "quantidade": 1,
                    "valor_unitario": 15000.00
                }
            ]
        }
    ]
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
    const margin = 15;
    const lineHeight = 7;
    const maxWidth = pageWidth - (margin * 2);
    const textMaxWidth = 70;
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
    const docTitle = `PDP - PESQUISA DE PREÇOS - ${currentDate}`;
    doc.text(docTitle, pageWidth/2, yPosition, { align: 'center' });
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.text("RELATÓRIO COMPARATIVO DE PREÇOS", pageWidth/2, yPosition, { align: 'center' });
    yPosition += 20;

    // Função para criar tabela de comparação de preços
    function createPriceComparisonTable(data, startY) {
        const tableStartY = startY;
        const colWidths = {
            item: 15,
            descricao: 60,
            orgao: 40,
            empresa: 40,
            valor: 25,
            total: 25
        };
        
        let currentY = tableStartY;
        
        // Cabeçalho da tabela
        doc.setFontSize(10);
        doc.setFont("times", "bold");
        
        // Desenhar bordas do cabeçalho
        doc.rect(margin, currentY, colWidths.item, 8);
        doc.rect(margin + colWidths.item, currentY, colWidths.descricao, 8);
        doc.rect(margin + colWidths.item + colWidths.descricao, currentY, colWidths.orgao, 8);
        doc.rect(margin + colWidths.item + colWidths.descricao + colWidths.orgao, currentY, colWidths.empresa, 8);
        doc.rect(margin + colWidths.item + colWidths.descricao + colWidths.orgao + colWidths.empresa, currentY, colWidths.valor, 8);
        doc.rect(margin + colWidths.item + colWidths.descricao + colWidths.orgao + colWidths.empresa + colWidths.valor, currentY, colWidths.total, 8);
        
        // Texto do cabeçalho
        doc.text("Item", margin + 2, currentY + 6);
        doc.text("Descrição", margin + colWidths.item + 2, currentY + 6);
        doc.text("Órgão", margin + colWidths.item + colWidths.descricao + 2, currentY + 6);
        doc.text("Empresa", margin + colWidths.item + colWidths.descricao + colWidths.orgao + 2, currentY + 6);
        doc.text("Valor Unit.", margin + colWidths.item + colWidths.descricao + colWidths.orgao + colWidths.empresa + 2, currentY + 6);
        doc.text("Total", margin + colWidths.item + colWidths.descricao + colWidths.orgao + colWidths.empresa + colWidths.valor + 2, currentY + 6);
        
        currentY += 8;
        
        // Dados da tabela
        doc.setFont("times", "normal");
        doc.setFontSize(8);
        
        if (data.orgaos_contratantes && Array.isArray(data.orgaos_contratantes)) {
            data.orgaos_contratantes.forEach((orgao, orgaoIndex) => {
                if (orgao.items && Array.isArray(orgao.items)) {
                    orgao.items.forEach((item, itemIndex) => {
                        // Verificar se precisa de nova página
                        if (currentY > 250) {
                            doc.addPage();
                            currentY = 30;
                        }
                        
                        const rowHeight = 8;
                        const total = item.quantidade * item.valor_unitario;
                        
                        // Desenhar bordas da linha
                        doc.rect(margin, currentY, colWidths.item, rowHeight);
                        doc.rect(margin + colWidths.item, currentY, colWidths.descricao, rowHeight);
                        doc.rect(margin + colWidths.item + colWidths.descricao, currentY, colWidths.orgao, rowHeight);
                        doc.rect(margin + colWidths.item + colWidths.descricao + colWidths.orgao, currentY, colWidths.empresa, rowHeight);
                        doc.rect(margin + colWidths.item + colWidths.descricao + colWidths.orgao + colWidths.empresa, currentY, colWidths.valor, rowHeight);
                        doc.rect(margin + colWidths.item + colWidths.descricao + colWidths.orgao + colWidths.empresa + colWidths.valor, currentY, colWidths.total, rowHeight);
                        
                        // Texto da linha
                        doc.text(String(item.n_item || (itemIndex + 1)), margin + 2, currentY + 6);
                        
                        // Quebrar descrição se necessário
                        const descricaoLines = wrapText(item.descricao || '', 25);
                        doc.text(descricaoLines[0] || '', margin + colWidths.item + 2, currentY + 6);
                        
                        // Quebrar nome do órgão se necessário
                        const orgaoLines = wrapText(orgao.orgao_contratante || '', 18);
                        doc.text(orgaoLines[0] || '', margin + colWidths.item + colWidths.descricao + 2, currentY + 6);
                        
                        // Quebrar nome da empresa se necessário
                        const empresaLines = wrapText(orgao.empresa_adjudicada || '', 18);
                        doc.text(empresaLines[0] || '', margin + colWidths.item + colWidths.descricao + colWidths.orgao + 2, currentY + 6);
                        
                        doc.text(`R$ ${(item.valor_unitario || 0).toFixed(2).replace('.', ',')}`, margin + colWidths.item + colWidths.descricao + colWidths.orgao + colWidths.empresa + 2, currentY + 6);
                        doc.text(`R$ ${total.toFixed(2).replace('.', ',')}`, margin + colWidths.item + colWidths.descricao + colWidths.orgao + colWidths.empresa + colWidths.valor + 2, currentY + 6);
                        
                        currentY += rowHeight;
                    });
                }
            });
        }
        
        return currentY;
    }

    // Seção: Resumo da Pesquisa
    doc.setFontSize(12);
    doc.setFont("times", "bold");
    doc.text("RESUMO DA PESQUISA DE PREÇOS", margin, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setFont("times", "normal");
    
    const totalOrgaos = jsonData.orgaos_contratantes ? jsonData.orgaos_contratantes.length : 0;
    let totalItens = 0;
    let valorTotalGeral = 0;
    
    if (jsonData.orgaos_contratantes) {
        jsonData.orgaos_contratantes.forEach(orgao => {
            if (orgao.items) {
                totalItens += orgao.items.length;
                orgao.items.forEach(item => {
                    valorTotalGeral += (item.quantidade || 0) * (item.valor_unitario || 0);
                });
            }
        });
    }

    doc.text(`Órgãos pesquisados: ${totalOrgaos}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Total de itens analisados: ${totalItens}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Valor total estimado: R$ ${valorTotalGeral.toFixed(2).replace('.', ',')}`, margin, yPosition);
    yPosition += 20;

    // Tabela de comparação de preços
    doc.setFontSize(12);
    doc.setFont("times", "bold");
    doc.text("COMPARAÇÃO DE PREÇOS", margin, yPosition);
    yPosition += 15;

    yPosition = createPriceComparisonTable(jsonData, yPosition);
    yPosition += 20;

    // Seção de conclusão
    if (yPosition > 240) {
        doc.addPage();
        yPosition = 30;
    }

    doc.setFontSize(12);
    doc.setFont("times", "bold");
    doc.text("CONCLUSÃO E RECOMENDAÇÕES", margin, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setFont("times", "normal");
    
    const conclusaoText = `Com base na pesquisa de preços realizada junto aos órgãos públicos consultados, foi possível estabelecer um panorama comparativo dos valores praticados no mercado. Os dados apresentados servem como referência para futuras contratações e processos licitatórios.

Recomenda-se a utilização destes valores como base para estimativas orçamentárias, observando sempre as especificações técnicas detalhadas de cada item e as condições particulares de cada contratação.

Data da pesquisa: ${currentDate}
Responsável: Seção de Licitações e Contratos`;

    const conclusaoLines = wrapText(conclusaoText, textMaxWidth);
    conclusaoLines.forEach(line => {
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 30;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
    });

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
        showSuccess('Dados carregados com sucesso!');
        populateDocument(savedData);
    } else {
        console.log('Usando dados de exemplo...');
        showSuccess('Usando dados de exemplo para demonstração');
        populateDocument(sampleJSON);
    }
});

// Funcionalidade do botão de download
document.getElementById('downloadButton').addEventListener('click', function() {
    if (currentPDF) {
        const currentDate = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const filename = `PDP_Pesquisa_Precos_${currentDate}.pdf`;
        currentPDF.save(filename);
        
        showSuccess('Download iniciado com sucesso!');
    } else {
        showError('Nenhum documento disponível para download.');
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
        const saveButton = this;
        const originalText = saveButton.innerHTML;
        
        // Desabilitar botão e mostrar loading
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="uil uil-spinner animate-spin mr-2"></i>Salvando...';
        
        // Obter project_id da URL
        const projectId = getProjectIdFromUrl();
        if (!projectId) {
            throw new Error('ID do projeto não encontrado na URL');
        }
        
        // Obter dados do localStorage
        const savedData = loadDataFromStorage();
        if (!savedData) {
            throw new Error('Nenhum dado encontrado para salvar');
        }
        
        // Preparar dados para envio
        const dataToSend = {
            project_id: parseInt(projectId),
            pdp_data: savedData,
            pdf_content: currentPDF ? currentPDF.output('datauristring') : null
        };
        
        // Fazer requisição para salvar
        const response = await fetch(`${BASE_URL}/pdp/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao salvar no banco de dados');
        }
        
        const result = await response.json();
        showSuccess('Dados salvos com sucesso no banco de dados!');
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showError(`Erro ao salvar: ${error.message}`);
    } finally {
        // Reabilitar botão
        const saveButton = document.getElementById('saveButton');
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="uil uil-save mr-2 group-hover:animate-pulse"></i>Salvar no Banco';
    }
});

// Função para ser chamada ao receber JSON de fonte externa
function processJSON(jsonResponse) {
    populateDocument(jsonResponse);
}
