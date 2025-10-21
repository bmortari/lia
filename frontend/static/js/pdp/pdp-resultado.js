import { getProjectIdFromUrl } from "../utils/projeto/getProject.js";
import { fazerRequisicaoAutenticada } from "../utils/auth/auth.js";

// Inicializar jsPDF
const { jsPDF } = window.jspdf;

// Configuração do endpoint
const BASE_URL = window.location.origin;

// ✅ NOVA FUNÇÃO: Buscar dados do PDP no banco de dados
async function buscarDadosPDP() {
    try {
        const projectId = getProjectIdFromUrl();
        
        if (!projectId) {
            throw new Error('ID do projeto não encontrado na URL');
        }
        
        console.log('Buscando PDP para o projeto:', projectId);
        
        const response = await fazerRequisicaoAutenticada(`/projetos/${projectId}/pdp`, {
            method: 'GET',
            headers: {
                'remote-user': 'user.test',
                'remote-groups': 'TI,OUTROS'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('PDP não encontrado para este projeto');
            } else if (response.status === 401) {
                throw new Error('Você não está autenticado. Por favor, faça login novamente.');
            } else if (response.status === 403) {
                throw new Error('Você não tem permissão para visualizar este PDP.');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Erro ${response.status}: ${errorData.detail || 'Erro ao buscar PDP'}`);
            }
        }
        
        const pdpData = await response.json();
        console.log('PDP carregado do banco:', pdpData);
        
        // Converter os dados do banco para o formato esperado pelo PDF
        return converterDadosPDP(pdpData);
        
    } catch (error) {
        console.error('Erro ao buscar dados do PDP:', error);
        throw error;
    }
}

// ✅ NOVA FUNÇÃO: Converter dados do banco para formato do JSON esperado
function converterDadosPDP(pdpBancoArray) {
    try {
        if (!Array.isArray(pdpBancoArray) || pdpBancoArray.length === 0) {
            throw new Error("Dados do PDP estão vazios ou em formato inválido.");
        }

        const firstItem = pdpBancoArray[0];

        // Montar objeto final no formato esperado
        const dadosConvertidos = {
            objeto: firstItem.objeto || "Objeto não especificado",
            fontes: pdpBancoArray.map(fonte => ({
                orgao_contratante: fonte.orgao_contratante || "Órgão não especificado",
                processo_pregao: fonte.processo_pregao || "Processo não especificado",
                empresa_adjudicada: fonte.empresa_adjudicada || "Empresa não especificada",
                cnpj_empresa: fonte.cnpj_empresa || "CNPJ não especificado",
                data_vigencia_inicio: fonte.data_vigencia_inicio || "Data não especificada",
                tipo_fonte: fonte.tipo_fonte || "Fonte não especificada",
                tabela_itens: fonte.tabela_itens || []
            }))
        };
        
        console.log('Dados convertidos para o PDF:', dadosConvertidos);
        return dadosConvertidos;
        
    } catch (error) {
        console.error('Erro ao converter dados do PDP:', error);
        throw new Error('Erro ao processar dados do PDP');
    }
}

// Função para carregar dados do localStorage (mantida como fallback)
function loadDataFromStorage() {
    try {
        const savedData = localStorage.getItem('pdpDados');
        if (!savedData) {
            console.warn('Nenhum dado encontrado no localStorage');
            return null;
        }
        
        const parsedData = JSON.parse(savedData);
        console.log('Dados carregados do localStorage:', parsedData);
        return parsedData;
    } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
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

// Função para exibir loading
function showLoading(message) {
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.innerHTML = `
            <div class="inline-flex items-center text-blue-700 bg-blue-50 border border-blue-200 font-medium rounded-lg text-sm px-4 py-2">
                <i class="uil uil-spinner animate-spin mr-2"></i>
                ${message}
            </div>
        `;
    }
}

// Variável global para armazenar o PDF atual
let currentPDF = null;

// ✅ FUNÇÃO MELHORADA: Gerar PDF com design profissional
function generatePDF(jsonData) {
    return new Promise((resolve) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        const lineHeight = 6;
        
        // Cores para o documento
        const primaryColor = [0, 51, 102]; // Azul escuro
        const blackColor = [0, 0, 0];       // Preto
        const grayColor = [128, 128, 128]; // Cinza
        const lightGrayColor = [240, 240, 240]; // Cinza claro
        
        const brasaoImg = new Image();
        brasaoImg.src = '/static/assets/img/brasao_oficial_republica.png';

        // Função para adicionar cabeçalho em todas as páginas
        function addHeader(isFirstPage = false) {
            if (isFirstPage) {
                // Cabeçalho da primeira página com brasão
                let yPos = 15;
                
                const targetWidth = 40;
                const aspectRatio = brasaoImg.height / brasaoImg.width;
                const targetHeight = targetWidth * aspectRatio;
                const xPosition = pageWidth / 2 - targetWidth / 2;

                doc.addImage(brasaoImg, 'PNG', xPosition, yPos, targetWidth, targetHeight);
                yPos += targetHeight + 8;

                // ✅ ALTERAÇÃO: Cor do nome do tribunal e endereço para preto
                doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
                doc.setFontSize(11);
                doc.setFont("times", "bold");
                doc.text("TRIBUNAL REGIONAL ELEITORAL DO ACRE", pageWidth / 2, yPos, { align: 'center' });
                yPos += 6;

                doc.setFontSize(9);
                doc.setFont("times", "normal");
                doc.text("Alameda Ministro Miguel Ferrante, 224 - Bairro Portal da Amazônia", pageWidth / 2, yPos, { align: 'center' });
                yPos += 4;
                doc.text("CEP 69915-632 - Rio Branco - AC", pageWidth / 2, yPos, { align: 'center' });
                yPos += 15;
                
                return yPos;
            } else {
                // Cabeçalho das páginas seguintes
                doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
                doc.setFontSize(9);
                doc.setFont("times", "normal");
                doc.text("TRIBUNAL REGIONAL ELEITORAL DO ACRE - RELATÓRIO DE PESQUISA DE PREÇOS", pageWidth / 2, 15, { align: 'center' });
                
                // Linha divisória
                doc.setDrawColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
                doc.line(margin, 20, pageWidth - margin, 20);
                
                return 30;
            }
        }

        // Função para adicionar rodapé
        function addFooter(pageNum) {
            const footerY = pageHeight - 15;
            
            // Linha divisória
            doc.setDrawColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
            doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
            
            // Data de geração
            const currentDate = new Date().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
            doc.setFontSize(8);
            doc.setFont("times", "normal");
            doc.text(`Gerado em: ${currentDate}`, margin, footerY);
            doc.text(`Página ${pageNum}`, pageWidth - margin, footerY, { align: 'right' });
        }

        // Função para verificar se precisa de nova página
        function checkNewPage(yPos, requiredSpace) {
            if (yPos + requiredSpace > pageHeight - 30) {
                doc.addPage();
                addFooter(doc.internal.getNumberOfPages() - 1);
                return addHeader(false);
            }
            return yPos;
        }

        const proceedWithPdf = (yPosition) => {
            let currentY = yPosition;
            let pageNumber = 1;

            // ✅ ALTERAÇÃO: Cor do Título principal para preto
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            doc.setFontSize(16);
            doc.setFont("times", "bold");
            doc.text("RELATÓRIO DE PESQUISA DE PREÇOS", pageWidth / 2, currentY, { align: 'center' });
            currentY += 20;

            // Caixa de informações gerais
            const infoBoxStartY = currentY;
            doc.setFontSize(10);
            doc.setFont("times", "normal");
            const objetoLines = doc.splitTextToSize(`Objeto: ${jsonData.objeto}`, maxWidth - 10);
            const objetoHeight = objetoLines.length * lineHeight;
            const infoBoxHeight = 8 + objetoHeight; // Includes padding and title space

            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFillColor(250, 250, 255);
            doc.roundedRect(margin, infoBoxStartY, maxWidth, infoBoxHeight, 3, 3, 'FD');
            
            let infoContentY = infoBoxStartY + 8;
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("1. INFORMAÇÕES GERAIS", margin + 5, infoContentY);
            
            infoContentY += 8;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont("times", "normal");
            doc.text(objetoLines, margin + 5, infoContentY);

            currentY = infoBoxStartY + infoBoxHeight + 15;

            // Seção de fontes de pesquisa
            currentY = checkNewPage(currentY, 30);
            
            // ✅ ALTERAÇÃO: Cor do título da seção para preto
            doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("2. FONTES DE PESQUISA", margin, currentY);
            currentY += 12;

            // Iterar pelas fontes
            jsonData.fontes.forEach((fonte, index) => {
                // Verificar se precisa de nova página para a fonte
                currentY = checkNewPage(currentY, 80);

                // Cabeçalho da fonte
                doc.setFillColor(240, 248, 255);
                doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.roundedRect(margin, currentY, maxWidth, 8, 2, 2, 'FD');
                
                // ✅ ALTERAÇÃO: Cor do título da fonte para preto
                doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
                doc.setFontSize(11);
                doc.setFont("times", "bold");
                doc.text(`FONTE ${index + 1}`, margin + 5, currentY + 5);
                currentY += 15;

                // Informações da fonte em colunas
                const colWidth = maxWidth / 2;
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(9);
                doc.setFont("times", "normal");

                // Coluna esquerda
                doc.setFont("times", "bold");
                doc.text("Empresa:", margin, currentY);
                doc.setFont("times", "normal");
                const empresaLines = doc.splitTextToSize(fonte.empresa_adjudicada, colWidth - 5);
                doc.text(empresaLines, margin, currentY + 4);
                
                doc.setFont("times", "bold");
                doc.text("Órgão Contratante:", margin, currentY + 12);
                doc.setFont("times", "normal");
                const orgaoLines = doc.splitTextToSize(fonte.orgao_contratante, colWidth - 5);
                doc.text(orgaoLines, margin, currentY + 16);

                // Coluna direita
                doc.setFont("times", "bold");
                doc.text("CNPJ:", margin + colWidth, currentY);
                doc.setFont("times", "normal");
                doc.text(fonte.cnpj_empresa, margin + colWidth, currentY + 4);
                
                doc.setFont("times", "bold");
                doc.text("Processo/Pregão:", margin + colWidth, currentY + 12);
                doc.setFont("times", "normal");
                const processoLines = doc.splitTextToSize(fonte.processo_pregao, colWidth - 5);
                doc.text(processoLines, margin + colWidth, currentY + 16);

                currentY += 28;

                // Informações adicionais
                doc.setFont("times", "bold");
                doc.text("Data de Vigência:", margin, currentY);
                doc.setFont("times", "normal");
                doc.text(fonte.data_vigencia_inicio, margin + 30, currentY);
                
                doc.setFont("times", "bold");
                doc.text("Tipo de Fonte:", margin + colWidth, currentY);
                doc.setFont("times", "normal");
                doc.text(fonte.tipo_fonte, margin + colWidth + 30, currentY);
                currentY += 15;

                // Tabela de itens
                if (fonte.tabela_itens && fonte.tabela_itens.length > 0) {
                    currentY = checkNewPage(currentY, 50);
                    
                    // ✅ ALTERAÇÃO: Cor do título da tabela para preto
                    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
                    doc.setFontSize(10);
                    doc.setFont("times", "bold");
                    doc.text("ITENS PESQUISADOS:", margin, currentY);
                    currentY += 10;

                    // Definições da tabela
                    const columns = [
                        { header: 'Item', dataKey: 'item' },
                        { header: 'Nome', dataKey: 'nome' },
                        { header: 'Marca/Modelo', dataKey: 'marca' },
                        { header: 'Unid.', dataKey: 'unidade' },
                        { header: 'Qtd.', dataKey: 'quantidade' },
                        { header: 'Valor Unit.', dataKey: 'valorUnitario' },
                        { header: 'Valor Total', dataKey: 'valorTotal' }
                    ];

                    const rows = fonte.tabela_itens.map((item, index) => {
                        const valorUnitario = item.valor_unitario || 0;
                        const quantidade = item.quantidade || 0;
                        const valorTotal = valorUnitario * quantidade;
                        const formatCurrency = (value) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                        return {
                            item: String(item.item || index + 1),
                            nome: item.descricao || "N/A",
                            marca: item.marca_referencia || "N/A",
                            unidade: item.unidade || "N/A",
                            quantidade: String(quantidade),
                            valorUnitario: `R$ ${formatCurrency(valorUnitario)}`,
                            valorTotal: `R$ ${formatCurrency(valorTotal)}`
                        };
                    });

                    // ✅ CORREÇÃO: Alinhamento da tabela respeitando as margens
                    doc.autoTable({
                        startY: currentY,
                        margin: { left: margin, right: margin }, // Define margens da tabela
                        tableWidth: 'auto', // Largura automática respeitando as margens
                        head: [columns.map(col => col.header)],
                        body: rows.map(row => Object.values(row)),
                        theme: 'grid',
                        styles: {
                            font: 'times',
                            fontSize: 8,
                            cellPadding: 2,
                            valign: 'middle',
                            lineColor: [200, 200, 200],
                            lineWidth: 0.5
                        },
                        headStyles: {
                            fillColor: primaryColor,
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            halign: 'center'
                        },
                        bodyStyles: {
                            textColor: [0, 0, 0]
                        },
                        alternateRowStyles: {
                            fillColor: [248, 248, 248]
                        },
                        columnStyles: {
                            0: { cellWidth: 12, halign: 'center' }, // Item
                            1: { cellWidth: 50 }, // Nome
                            2: { cellWidth: 35 }, // Marca
                            3: { cellWidth: 15, halign: 'center' }, // Unidade
                            4: { cellWidth: 15, halign: 'center' }, // Quantidade
                            5: { cellWidth: 22, halign: 'right' }, // Valor Unitário
                            6: { cellWidth: 22, halign: 'right' } // Valor Total
                        },
                        didDrawPage: (data) => {
                            // Atualiza currentY após desenhar a tabela
                            currentY = data.cursor.y + 10;
                        }
                    });
                }

                // Separador entre fontes
                if (index < jsonData.fontes.length - 1) {
                    currentY += 10;
                    doc.setDrawColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
                    doc.line(margin, currentY, pageWidth - margin, currentY);
                    currentY += 15;
                }
            });

            // Adicionar rodapé na última página
            addFooter(doc.internal.getNumberOfPages());

            resolve(doc);
        };

        brasaoImg.onload = function () {
            const yPosition = addHeader(true);
            proceedWithPdf(yPosition);
        };

        brasaoImg.onerror = function() {
            console.error("Não foi possível carregar a imagem do brasão.");
            const yPosition = addHeader(true);
            proceedWithPdf(yPosition);
        };
    });
}

// Função para exibir PDF no visualizador
function displayPDF(pdf) {
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const pdfViewer = document.getElementById('pdfViewer');
    const pdfPlaceholder = document.getElementById('pdfPlaceholder');
    
    pdfViewer.src = pdfUrl;
    
    pdfViewer.onload = () => {
        URL.revokeObjectURL(pdfUrl);
        console.log('PDF carregado e URL do objeto revogada.');
    };

    pdfPlaceholder.style.display = 'none';
    pdfViewer.style.display = 'block';
}

// Função para popular a pré-visualização do documento com PDF
async function populateDocument(jsonData) {
    const pdf = await generatePDF(jsonData);
    currentPDF = pdf;
    displayPDF(pdf);
}

// ✅ FUNÇÃO PRINCIPAL: Carregar e processar dados do PDP
async function carregarDadosPDP() {
    try {
        showLoading('Buscando dados da pesquisa de preços no banco de dados...');
        
        const dadosBanco = await buscarDadosPDP();
        
        if (dadosBanco) {
            console.log('Dados carregados do banco, gerando PDF...');
            showSuccess('Dados carregados do banco de dados! Gerando documento...');
            
            setTimeout(async () => {
                await populateDocument(dadosBanco);
                
                setTimeout(() => {
                    showSuccess('Documento gerado com sucesso!');
                }, 1000);
            }, 500);
            
            return;
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados do banco:', error);
        showError(`Erro ao carregar PDP: ${error.message}`);
        
        const savedData = loadDataFromStorage();
        
        if (savedData) {
            console.log('Dados encontrados no localStorage, gerando PDF...');
            showSuccess('Dados carregados do localStorage! Gerando documento...');
            
            setTimeout(async () => {
                await populateDocument(savedData);
                
                setTimeout(() => {
                    showSuccess('Documento gerado com sucesso! (usando dados locais)');
                }, 1000);
            }, 500);
        } else {
            showError('Nenhum dado encontrado. Retorne à página de curadoria para gerar o documento.');
        }
    }
}

// Event listener para carregar dados automaticamente quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando carregamento dos dados do PDP...');
    carregarDadosPDP();
});

// Funcionalidade do botão de download
document.getElementById('downloadButton').addEventListener('click', function() {
    if (currentPDF) {
        const currentDate = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const fileName = `PDP-${currentDate}.pdf`;
        currentPDF.save(fileName);
    } else {
        alert('Nenhum documento foi gerado ainda. Por favor, aguarde o processamento.');
    }
});

// Funcionalidade do botão Voltar ao início
document.getElementById('voltar-inicio').addEventListener('click', function() {
    const projectId = getProjectIdFromUrl();
    if (projectId) {
        window.location.href = `${BASE_URL}/projetos/${projectId}/`;
    } else {
        window.location.href = `${BASE_URL}/`;
    }
});

// Funcionalidade do botão Voltar à curadoria
document.addEventListener('DOMContentLoaded', function() {
    const voltarCuradoriaButton = document.getElementById('voltar-curadoria');
    if (voltarCuradoriaButton) {
        voltarCuradoriaButton.addEventListener('click', function() {
            const projectId = getProjectIdFromUrl();
            if (projectId) {
                window.location.href = `${BASE_URL}/projetos/${projectId}/confere_pdp`;
            } else {
                window.location.href = `${BASE_URL}/`;
            }
        });
    }
});