import { getProjectIdFromUrl } from "/static/js/utils/getProject.js";

// Inicializar jsPDF
const { jsPDF } = window.jspdf;

// Configuração do endpoint
const BASE_URL = window.location.origin;

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

// Função para fazer requisição com autenticação
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
    
    try {
        const response = await fetch(url, requestConfig);
        
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

// Buscar dados do TR no banco de dados
async function buscarDadosTR() {
    try {
        const projectId = getProjectIdFromUrl();
        
        if (!projectId) {
            throw new Error('ID do projeto não encontrado na URL');
        }
        
        console.log('Buscando TR para o projeto:', projectId);
        
        const response = await fazerRequisicaoAutenticada(`/projetos/${projectId}/tr`, {
            method: 'GET',
            headers: {
                'remote-user': 'user.test',
                'remote-groups': 'TI,OUTROS'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('TR não encontrado para este projeto');
            } else if (response.status === 401) {
                throw new Error('Você não está autenticado. Por favor, faça login novamente.');
            } else if (response.status === 403) {
                throw new Error('Você não tem permissão para visualizar este TR.');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Erro ${response.status}: ${errorData.detail || 'Erro ao buscar TR'}`);
            }
        }
        
        const trData = await response.json();
        console.log('TR carregado do banco:', trData);
        
        // Converter os dados do banco para o formato esperado pelo PDF
        return converterDadosTR(trData);
        
    } catch (error) {
        console.error('Erro ao buscar dados do TR:', error);
        throw error;
    }
}

// Converter dados do banco para formato do JSON esperado
function converterDadosTR(trBanco) {
    try {
        // Processar obrigacoes as arrays if string
        let obrigacoes_contratante = [];
        if (trBanco.obrigacoes_contratante) {
            if (Array.isArray(trBanco.obrigacoes_contratante)) {
                obrigacoes_contratante = trBanco.obrigacoes_contratante;
            } else if (typeof trBanco.obrigacoes_contratante === 'string') {
                obrigacoes_contratante = trBanco.obrigacoes_contratante.split('\n').filter(line => line.trim());
            }
        }

        let obrigacoes_contratada = [];
        if (trBanco.obrigacoes_contratada) {
            if (Array.isArray(trBanco.obrigacoes_contratada)) {
                obrigacoes_contratada = trBanco.obrigacoes_contratada;
            } else if (typeof trBanco.obrigacoes_contratada === 'string') {
                obrigacoes_contratada = trBanco.obrigacoes_contratada.split('\n').filter(line => line.trim());
            }
        }

        // Processar itens
        let itens = [];
        if (trBanco.itens && Array.isArray(trBanco.itens)) {
            itens = trBanco.itens.map(item => ({
                descricao: item.descricao,
                especificacoes_tecnicas: item.especificacoes_tecnicas || [],
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                valor_total: item.valor_total,
                unidade_medida: item.unidade_medida,
                codigo_catmat_catser: item.codigo_catmat_catser,
                finalidade: item.finalidade
            }));
        }

        // Processar nested JSONs
        const sistema_registro_precos = trBanco.sistema_registro_precos || {};
        const requisitos_contratacao = trBanco.requisitos_contratacao || {};
        const modelo_execucao = trBanco.modelo_execucao || {};
        const gestao_contrato = trBanco.gestao_contrato || {};
        const criterios_pagamento = trBanco.criterios_pagamento || {};
        const selecao_fornecedor = trBanco.selecao_fornecedor || {};
        const estimativa_valor = trBanco.estimativa_valor || {};
        const adequacao_orcamentaria = trBanco.adequacao_orcamentaria || {};

        // Montar objeto final no formato esperado pelo PDF do teste.html
        const dadosConvertidos = {
            orgao_contratante: trBanco.orgao_contratante || '',
            tipo_contratacao: trBanco.tipo_contratacao || '',
            objeto_contratacao: trBanco.objeto_contratacao || '',
            modalidade_licitacao: trBanco.modalidade_licitacao || '',
            fundamentacao_legal: trBanco.fundamentacao_legal || '',
            descricao_solucao: trBanco.descricao_solucao || '',
            prazo_vigencia_contrato: trBanco.prazo_vigencia_contrato || '',
            prazo_entrega_prestacao: trBanco.prazo_entrega_prestacao || '',
            local_entrega_prestacao: trBanco.local_entrega_prestacao || '',
            obrigacoes_contratante: obrigacoes_contratante,
            obrigacoes_contratada: obrigacoes_contratada,
            admite_subcontratacao: trBanco.admite_subcontratacao || false,
            exige_garantia_contratual: trBanco.exige_garantia_contratual || false,
            condicoes_pagamento: trBanco.condicoes_pagamento || '',
            sancoes_administrativas: trBanco.sancoes_administrativas || '',
            responsavel: trBanco.responsavel || '',
            cargo_responsavel: trBanco.cargo_responsavel || '',
            sistema_registro_precos: sistema_registro_precos,
            requisitos_contratacao: requisitos_contratacao,
            modelo_execucao: modelo_execucao,
            gestao_contrato: gestao_contrato,
            criterios_pagamento: criterios_pagamento,
            selecao_fornecedor: selecao_fornecedor,
            estimativa_valor: estimativa_valor,
            adequacao_orcamentaria: adequacao_orcamentaria,
            itens: itens
        };
        
        console.log('Dados convertidos para o PDF:', dadosConvertidos);
        return dadosConvertidos;
        
    } catch (error) {
        console.error('Erro ao converter dados do TR:', error);
        throw new Error('Erro ao processar dados do TR');
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

// Função para gerar PDF a partir dos dados JSON (adaptada de teste.html)
function generatePdf(jsonData) {
    return new Promise((resolve) => {
        const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = 15; // Posição vertical inicial

        const subsectionIndent = 5; // Indentação para as subseções

        // Helper function for adding text with line wrapping
        const addWrappedText = (text, x, y, maxWidth) => {
            if (typeof text !== 'string') {
                text = String(text);
            }
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, y, { align: 'justify', maxWidth: maxWidth });
            return (doc.getTextDimensions(lines).h) + 2;
        };
        
        // Helper for adding a numbered subsection with an optional title.
        // Handles text wrapping and vertical spacing.
        const addSubsection = (number, title, content, x, y, maxWidth) => {
            if (title) {
                doc.setFont("times", "bold");
                // If there is a title, the number and title are on the first line, bold.
                const fullText = `${number} ${title}`;
                doc.text(fullText, x, y);
                let currentY = y + 6; // Move down for the content
                
                doc.setFont("times", "normal");

                if (content && content.length > 0) {
                    const lines = doc.splitTextToSize(content, maxWidth);
                    doc.text(lines, x, currentY, { align: 'justify', maxWidth: maxWidth });
                    // Return total height used: title + content + margin
                    return 6 + (doc.getTextDimensions(lines).h) + 2;
                }
                // Return height for title only + margin
                return 6 + 2;
            } else {
                // If there is no title, number and content are on the same line.
                doc.setFont("times", "bold");
                const numberText = `${number} `;
                doc.text(numberText, x, y); // Draw bold number
                
                // Calculate width of the number to position the content correctly
                const numberWidth = doc.getStringUnitWidth(numberText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                
                doc.setFont("times", "normal");
                // Add the wrapped content next to the number
                const textHeight = addWrappedText(content, x + numberWidth, y, maxWidth - numberWidth);

                // Return the height of the content
                return textHeight;
            }
        };

        // Helper for adding numbered list items
        const addNumberedItem = (number, content, x, y, maxWidth) => {
            doc.setFont("times", "bold");
            const numberText = `${number} `;
            doc.text(numberText, x, y);
            
            const numberWidth = doc.getStringUnitWidth(numberText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
            
            doc.setFont("times", "normal");
            const lines = doc.splitTextToSize(content, maxWidth - numberWidth);
            doc.text(lines, x + numberWidth, y, { align: 'justify', maxWidth: maxWidth - numberWidth });
            
            return (doc.getTextDimensions(lines).h) + 2;
        };

        // Function to check for new page
        const checkPageBreak = (heightNeeded) => {
            if (y + heightNeeded > 282) { // 297mm - 15mm bottom margin
                doc.addPage();
                y = 15;
            }
        };
        
        // Helper function for adding explanatory notes without background
        const addNotaExplicativa = (title, content) => {
            const contentWidth = pageWidth - margin * 2;
            
            doc.setFont("times", "bold");
            const titleLines = doc.splitTextToSize(title, contentWidth);
            const titleHeight = (titleLines.length * 6);
            
            doc.setFont("times", "normal");
            const contentLines = doc.splitTextToSize(content, contentWidth);
            const contentHeight = (contentLines.length * 6);

            const notaHeight = titleHeight + contentHeight - 5;

            checkPageBreak(notaHeight + 5);
            
            let currentY = y + 5;
            
            doc.setFont("times", "bold");
            doc.text(titleLines, margin, currentY);
            currentY += titleHeight;
            
            doc.setFont("times", "normal");
            doc.text(contentLines, margin, currentY);
            
            y += notaHeight;
        };

        const addContent = () => {
            const contentWidth = pageWidth - margin * 2;
            const sectionSpacing = 4;

            // Section 1: DA DEFINIÇÃO DO OBJETO
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("1. DA DEFINIÇÃO DO OBJETO", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            // Subseção 1.1
            y += addSubsection("1.1", "", jsonData.objeto_contratacao, margin + subsectionIndent, y, contentWidth - subsectionIndent);

            // Subseção 1.2
            checkPageBreak(30);
            y += addSubsection("1.2", "Detalhamento dos bens que compõem a solução:", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            // Table Headers
            const tableHeaders = ["Item", "Descrição", "CATMAT", "Unidade", "Qtd", "V. Unit.", "V. Total"];
            const colWidths = [15, 55, 20, 20, 15, 25, 25]; // Total width = 175
            const tableStartX = margin + subsectionIndent;

            let currentX = tableStartX;
            doc.setFont("times", "bold");
            doc.setFontSize(10);
            const headerHeight = 10;
            tableHeaders.forEach((header, i) => {
                doc.rect(currentX, y, colWidths[i], headerHeight);
                const textWidth = doc.getStringUnitWidth(header) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                const textX = currentX + (colWidths[i] - textWidth) / 2;
                doc.text(header, textX, y + headerHeight / 2 + 3);
                currentX += colWidths[i];
            });
            y += headerHeight;

            // Table Body
            doc.setFont("times", "normal");
            doc.setFontSize(10);

            jsonData.itens.forEach((item, index) => {
                const rowData = [
                    (index + 1).toString(),
                    item.descricao,
                    item.codigo_catmat_catser || '[A DEFINIR]',
                    item.unidade_medida,
                    item.quantidade.toString(),
                    `R$ ${parseFloat(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    `R$ ${parseFloat(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ];

                let maxLines = 0;
                const cellPadding = 2;
                const lineHeight = 6;

                // Calculate the required height for the row by finding the cell with the most lines
                rowData.forEach((text, i) => {
                    const lines = doc.splitTextToSize(String(text), colWidths[i] - (cellPadding * 2));
                    if (lines.length > maxLines) {
                        maxLines = lines.length;
                    }
                });
                
                const rowHeight = maxLines * lineHeight + (cellPadding * 2);
                
                checkPageBreak(rowHeight);
                
                currentX = tableStartX;
                
                // Draw row cells and text
                rowData.forEach((text, i) => {
                    doc.rect(currentX, y, colWidths[i], rowHeight);
                    const lines = doc.splitTextToSize(String(text), colWidths[i] - (cellPadding * 2));
                    
                    // CORREÇÃO: Adicionar cellPadding na posição vertical inicial do texto
                    const textY = y + cellPadding + lineHeight;
                    
                    // Para células com alinhamento à direita (valores monetários)
                    if (i >= 5) { // Colunas de valores (V. Unit. e V. Total)
                        lines.forEach((line, lineIndex) => {
                            const textWidth = doc.getStringUnitWidth(line) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                            const textX = currentX + colWidths[i] - cellPadding - textWidth;
                            doc.text(line, textX, textY + (lineIndex * lineHeight));
                        });
                    } else {
                        doc.text(lines, currentX + cellPadding, textY);
                    }
                    
                    currentX += colWidths[i];
                });

                y += rowHeight;
            });
            doc.setFontSize(11);
            y += 10;
            
            // Subseção 1.3
            checkPageBreak(15);
            y += addSubsection("1.3", "", "Os bens objeto desta contratação são caracterizados como comuns, conforme indicado no Estudo Técnico Preliminar.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            // // Subseção 1.4
            // checkPageBreak(15);
            // y += addSubsection("1.4", "", "Demais regras das condições e especificações da solução: [acrescentar outras se houve alterações em relação às indicada no Estudo Técnico Preliminar]", margin + subsectionIndent, y, contentWidth - subsectionIndent);

            // Subseção 1.4
            checkPageBreak(15);
            const prazoVigencia = `O prazo de vigência da contratação é de ${jsonData.prazo_vigencia_contrato}`;
            y += addSubsection("1.4", "", prazoVigencia, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            // Subseção 1.5
            checkPageBreak(15);
            const prazoEntrega = `O prazo de entrega/prestação da compra é de ${jsonData.prazo_entrega_prestacao}`;
            y += addSubsection("1.5", "", prazoEntrega, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            // Subseção 1.6
            checkPageBreak(15);
            const localEntrega = `A entrega deve ser realizada no seguinte endereço: ${jsonData.local_entrega_prestacao}`;
            y += addSubsection("1.6", "", localEntrega, margin + subsectionIndent, y, contentWidth - subsectionIndent);

            // Subseção 1.7
            checkPageBreak(15);
            y += addSubsection("1.7", "", "O contrato oferece maior detalhamento das regras que serão aplicadas em relação à vigência da contratação.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            y += sectionSpacing;
            
            // Section 2: DA FUNDAMENTAÇÃO E DESCRIÇÃO DA NECESSIDADE DA CONTRATAÇÃO
            checkPageBreak(40);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("2. DA FUNDAMENTAÇÃO E DESCRIÇÃO DA NECESSIDADE DA CONTRATAÇÃO", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            y += addSubsection("2.1", "", jsonData.fundamentacao_legal, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            let previsaoPCATexto;
            if (jsonData.adequacao_orcamentaria.previsao_pca === true) {
                const codigoPCA = jsonData.adequacao_orcamentaria.codigo_pca || "[não informado]";
                previsaoPCATexto = `O objeto da contratação está previsto no Plano de Contratações Anual (PCA), sob o código PCA ${codigoPCA}.`;
            } else {
                previsaoPCATexto = `O objeto da contratação não está previsto no Plano de Contratações Anual (PCA).`;
            }

            y += addSubsection("2.2", "", previsaoPCATexto, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += sectionSpacing;

            y += sectionSpacing;    

            checkPageBreak(120);
            doc.setFont("times", "bold");
            doc.text("2.3 DO CABIMENTO DO SISTEMA DE REGISTRO DE PREÇOS", margin + subsectionIndent, y);
            y += 7;
            doc.setFont("times", "normal");

            const srpData = jsonData.sistema_registro_precos;
            const textIndent = margin + subsectionIndent + 5;
            const textWidth = contentWidth - subsectionIndent - 5;

            if (srpData.adota_srp) {
                // I
                y += addWrappedText(`I - Será adotado o Sistema de Registro de Preços (SRP) (art. 78, IV, Lei 14.133/2021) para a contratação pretendida.`, textIndent, y, textWidth);

                // II
                const quantidadeMaximaTexto = srpData.quantidade_maxima
                    ? 'Será prevista uma quantidade máxima a ser adquirida para cada item/grupo, de acordo com o quadro que constará no edital.'
                    : 'Não haverá quantidade máxima a ser adquirida para cada item/grupo.';
                y += addWrappedText(`II - ${quantidadeMaximaTexto}`, textIndent, y, textWidth);

                // III
                const quantidadeMinimaTexto = srpData.quantidade_minima_cotacao
                    ? `A quantidade mínima de unidades de bens a serem cotadas será de ${srpData.quantidade_minima_cotacao} unidade(s).`
                    : 'Não se aplica a previsão de quantidade mínima de unidades de bens a serem cotadas.';
                y += addWrappedText(`III - ${quantidadeMinimaTexto}`, textIndent, y, textWidth);

                // IV
                const precosDiferentesTexto = srpData.permite_precos_diferentes
                    ? `Será permitida a previsão de preços diferentes. Justificativa: ${srpData.justificativa_precos_diferentes || '[justificativa não informada].'}`
                    : 'Não será permitida a previsão de preços diferentes.';
                y += addWrappedText(`IV - ${precosDiferentesTexto}`, textIndent, y, textWidth);

                // V
                const propostaInferiorTexto = srpData.permite_proposta_inferior
                    ? 'O licitante poderá oferecer proposta com quantitativo inferior ao máximo previsto.'
                    : `O licitante não poderá oferecer proposta com quantitativo inferior ao máximo previsto.`;
                y += addWrappedText(`V - ${propostaInferiorTexto}`, textIndent, y, textWidth);

                // VI
                const criterioJulgamentoTexto = srpData.criterio_julgamento === 'grupo'
                    ? 'menor preço por grupo de itens, devendo ser observado o critério de aceitabilidade de preços unitários máximos. A contratação posterior de item específico constante de grupo de itens exigirá prévia pesquisa de mercado e demonstração de sua vantagem para o órgão.'
                    : 'menor preço por item.';
                y += addWrappedText(`VI - O critério de julgamento a ser adotado será o de ${criterioJulgamentoTexto}`, textIndent, y, textWidth);

                // VII
                const registroLimitadoTexto = srpData.registro_limitado
                    ? `Será permitido o registro de preços com indicação limitada a unidades de contratação.`
                    : 'Não será permitido o registro de preços com indicação limitada a unidades de contratação.';
                y += addWrappedText(`VII - ${registroLimitadoTexto}`, textIndent, y, textWidth);

                // VIII
                y += addWrappedText(`VIII - Os preços registrados poderão ser objeto de reajustamento, observados os requisitos exigidos pela Lei n. 14.133, de 2021.`, textIndent, y, textWidth);

                // IX
                y += addWrappedText(`IX - Para fins de reajustamento, será adotado o seguinte critério: ${srpData.criterio_reajuste || '[Critério não definido].'}`, textIndent, y, textWidth);
                
                // X
                y += addWrappedText(`X - O prazo de vigência da ata de registro de preços será de ${srpData.vigencia_ata || '[Prazo não definido].'}`, textIndent, y, textWidth);
            } else {
                y += addWrappedText(`Não será adotado o Sistema de Registro de Preços.`, textIndent, y, textWidth);
            }

            y += sectionSpacing;

            // Seção 3: DA DESCRIÇÃO DA SOLUÇÃO COMO UM TODO (ADICIONAR 3.1)
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont("times", "bold");

            const section3Title = "3. DA DESCRIÇÃO DA SOLUÇÃO COMO UM TODO CONSIDERADO O CICLO DE VIDA DO OBJETO E ESPECIFICAÇÃO DO PRODUTO";
            const titleHeight = addWrappedText(section3Title, margin, y, contentWidth);
            y += titleHeight;

            doc.setFontSize(11);
            doc.setFont("times", "normal");

            // ADICIONAR 3.1
            y += addSubsection("3.1", "", jsonData.descricao_solucao, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += sectionSpacing;

            // Section 4: DOS REQUISITOS DA CONTRATAÇÃO
            checkPageBreak(60);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("4. DOS REQUISITOS DA CONTRATAÇÃO", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            // ADICIONAR 4.1.1, 4.2.1, etc.
            checkPageBreak(15);
            y += addSubsection("4.1", "DA SUSTENTABILIDADE", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(30);
            y += addSubsection("4.1.1", "", jsonData.requisitos_contratacao.sustentabilidade, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            checkPageBreak(15);
            y += addSubsection("4.2", "DA INDICAÇÃO DE MARCAS OU MODELOS", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            y += addSubsection("4.2.1", "", jsonData.requisitos_contratacao.indicacao_marcas, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            checkPageBreak(15);
            y += addSubsection("4.3", "DA VEDAÇÃO DE UTILIZAÇÃO DE MARCA/PRODUTO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            y += addSubsection("4.3.1", "", jsonData.requisitos_contratacao.vedacao_marca_produto, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            checkPageBreak(15);
            y += addSubsection("4.4", "DA AMOSTRA", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(15);
            y += addSubsection("4.4.1", "", jsonData.requisitos_contratacao.exige_amostra ? 'Será exigida apresentação de amostra.' : 'Não será exigida apresentação de amostra.', margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            checkPageBreak(15);
            y += addSubsection("4.5", "DA CARTA DE SOLIDARIEDADE", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(15);
            y += addSubsection("4.5.1", "", jsonData.requisitos_contratacao.exige_carta_solidariedade ? 'Será exigida carta de solidariedade.' : 'Não será exigida carta de solidariedade.', margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            checkPageBreak(15);
            y += addSubsection("4.6", "DA VISTORIA", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(15);
            const vistoriaText = jsonData.requisitos_contratacao.exige_vistoria ? 'Será exigida a realização de vistoria.' : 'Não será exigida a realização de vistoria.';
            y += addSubsection("4.6.1", "", vistoriaText, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);

            checkPageBreak(15);
            y += addSubsection("4.7", "DA SUBCONTRATAÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(15);
            y += addSubsection("4.7.1", "", jsonData.admite_subcontratacao ? 'Admite-se subcontratação.' : 'Não se admite subcontratação.', margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            checkPageBreak(15);
            y += addSubsection("4.8", "DA GARANTIA DA CONTRATAÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            y += addSubsection("4.8.1", "", jsonData.exige_garantia_contratual ? jsonData.requisitos_contratacao.garantia_produto_servico : 'Não se exige garantia contratual.', margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);

            y += sectionSpacing;

            // Section 5: DO MODELO DE EXECUÇÃO DO OBJETO
            checkPageBreak(100);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("5. DO MODELO DE EXECUÇÃO DO OBJETO", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            y += addSubsection("5.1", "DAS CONDIÇÕES DE ENTREGA", jsonData.modelo_execucao.condicoes_entrega, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += addSubsection("5.2", "DA GARANTIA, MANUTENÇÃO E ASSISTÊNCIA TÉCNICA", jsonData.modelo_execucao.garantia_manutencao, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            // Subseção 5.3 com numeração
            checkPageBreak(15);
            y += addSubsection("5.3", "DOS DEVERES E RESPONSABILIDADES DO CONTRATANTE", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            jsonData.obrigacoes_contratante.forEach((item, index) => {
                checkPageBreak(10);
                y += addNumberedItem(`5.3.${index + 1}`, item, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            });
            
            // Subseção 5.4 com numeração
            checkPageBreak(15);
            y += addSubsection("5.4", "DOS DEVERES E RESPONSABILIDADES DA CONTRATADA", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            jsonData.obrigacoes_contratada.forEach((item, index) => {
                checkPageBreak(10);
                y += addNumberedItem(`5.4.${index + 1}`, item, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            });
            y += sectionSpacing;

            // Section 6: DO MODELO DE GESTÃO DO CONTRATO
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("6. DO MODELO DE GESTÃO DO CONTRATO", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            
            y += addSubsection("6.1", "", jsonData.gestao_contrato.modelo_gestao, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += addSubsection("6.2", "", jsonData.gestao_contrato.papeis_responsabilidades, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += sectionSpacing;
            
            // Section 7: DOS CRITÉRIOS DE PAGAMENTO
            checkPageBreak(50);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("7. DOS CRITÉRIOS DE PAGAMENTO", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            // ADICIONAR 7.1.1, 7.2.1, etc.
            checkPageBreak(15);
            y += addSubsection("7.1", "DAS CONDIÇÕES DE PAGAMENTO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            y += addSubsection("7.1.1", "", jsonData.condicoes_pagamento, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);        
            checkPageBreak(15);
            y += addSubsection("7.2", "DO RECEBIMENTO DO OBJETO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            y += addSubsection("7.2.1", "", jsonData.criterios_pagamento.recebimento_objeto, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            checkPageBreak(15);
            y += addSubsection("7.3", "DA LIQUIDAÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            y += addSubsection("7.3.1", "", jsonData.criterios_pagamento.liquidacao, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            checkPageBreak(15);
            y += addSubsection("7.4", "DO PRAZO DE PAGAMENTO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            y += addSubsection("7.4.1", "", jsonData.criterios_pagamento.prazo_pagamento, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            checkPageBreak(15);
            y += addSubsection("7.5", "DA FORMA DE PAGAMENTO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(15);
            y += addSubsection("7.5.1", "", jsonData.criterios_pagamento.forma_pagamento, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            // checkPageBreak(15);
            // y += addSubsection("7.6", "DA ANTECIPAÇÃO DE PAGAMENTO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            // checkPageBreak(15);
            // y += addSubsection("7.6.1", "", jsonData.criterios_pagamento.antecipacao_pagamento ? 'Sim' : 'Não', margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            // checkPageBreak(15);
            // y += addSubsection("7.7", "DA CESSÃO DE CRÉDITO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            // checkPageBreak(20);
            // y += addSubsection("7.7.1", "", jsonData.criterios_pagamento.cessao_credito, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            y += sectionSpacing;

            // Section 8: DA FORMA E CRITÉRIO DE SELEÇÃO DO FORNECEDOR
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("8. DA FORMA E CRITÉRIO DE SELEÇÃO DO FORNECEDOR", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            // ADICIONAR 8.1.1
            y += addSubsection("8.1", "DA FORMA DE SELEÇÃO E CRITÉRIO DE JULGAMENTO DA PROPOSTA", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += addSubsection("8.1.1", "", `${jsonData.selecao_fornecedor.forma_selecao} - ${jsonData.selecao_fornecedor.criterio_julgamento}`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            
            // Subseção 8.2 com numeração
            checkPageBreak(15);
            y += addSubsection("8.2", "DAS EXIGÊNCIAS DE HABILITAÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            // 8.2.1 - Jurídica
            y += addNumberedItem("8.2.1", "Jurídica:", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            jsonData.selecao_fornecedor.exigencias_habilitacao.juridica.forEach((item) => {
                checkPageBreak(10);
                y += addWrappedText(`• ${item}`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            });
            
            // 8.2.2 - Fiscal e Trabalhista
            checkPageBreak(15);
            y += addNumberedItem("8.2.2", "Fiscal e Trabalhista:", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            jsonData.selecao_fornecedor.exigencias_habilitacao.fiscal_trabalhista.forEach((item) => {
                checkPageBreak(10);
                y += addWrappedText(`• ${item}`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            });

            // 8.2.3 - Econômico-Financeira
            checkPageBreak(15);
            y += addNumberedItem("8.2.3", "Econômico-Financeira:", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            jsonData.selecao_fornecedor.exigencias_habilitacao.economico_financeira.forEach((item) => {
                checkPageBreak(10);
                y += addWrappedText(`• ${item}`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            });

            // 8.2.4 - Técnica
            checkPageBreak(15);
            y += addNumberedItem("8.2.4", "Técnica:", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            jsonData.selecao_fornecedor.exigencias_habilitacao.tecnica.forEach((item) => {
                checkPageBreak(10);
                y += addWrappedText(`• ${item}`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            });
            y += sectionSpacing;

            // Section 9: DA ESTIMATIVA DO VALOR DA CONTRATAÇÃO (ADICIONAR 9.1, 9.2, 9.3)
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("9. DA ESTIMATIVA DO VALOR DA CONTRATAÇÃO", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            // ADICIONAR 9.1, 9.2, 9.3
            y += addSubsection("9.1", "Valor Total:", `R$ ${jsonData.estimativa_valor.valor_total}`, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += addSubsection("9.2", "Metodologia da Pesquisa:", jsonData.estimativa_valor.metodologia_pesquisa, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += sectionSpacing;

            // Section 10: DA ADEQUAÇÃO ORÇAMENTÁRIA (ADICIONAR 10.1, 10.2)
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("10. DA ADEQUAÇÃO ORÇAMENTÁRIA", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            // ADICIONAR 10.1, 10.2
            y += addSubsection("10.1", "Fonte de Recursos:", jsonData.adequacao_orcamentaria.fonte_recursos, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += addSubsection("10.2", "Classificação Orçamentária:", jsonData.adequacao_orcamentaria.classificacao_orcamentaria, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += sectionSpacing;

            // Section 11: DAS INFRAÇÕES E SANÇÕES APLICÁVEIS (ADICIONAR 11.1)
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("11. DAS INFRAÇÕES E SANÇÕES APLICÁVEIS", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            // ADICIONAR 11.1
            y += addSubsection("11.1", "", jsonData.sancoes_administrativas, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += 20;

            // Signature
            checkPageBreak(20);
            doc.text("________________________________________", pageWidth / 2, y, { align: "center" });
            y += 7;
            doc.text(jsonData.responsavel, pageWidth / 2, y, { align: "center" });
            y += 5;
            doc.text(jsonData.cargo_responsavel, pageWidth / 2, y, { align: "center" });
        }

        const addHeaderAndResolve = () => {
            const brasaoImg = new Image();
            brasaoImg.src = "/static/assets/img/brasao_oficial_republica.png";

            const drawContentAndResolve = () => {
                doc.setFontSize(9);
                doc.setFont("times", "normal");
                doc.text("TRIBUNAL REGIONAL ELEITORAL DO ACRE", pageWidth / 2, y, { align: "center" });
                y += 10;

                doc.setFontSize(8);
                doc.text("Alameda Ministro Miguel Ferrante, 224 - Bairro Portal da Amazônia - CEP 69915-632 - Rio Branco - AC", pageWidth / 2, y, { align: "center" });
                y += 10;

                doc.setFontSize(11);
                doc.text("ANEXO VIII", pageWidth / 2, y, { align: "center" });
                y += 15;

                doc.setFontSize(11);
                doc.setFont("times", "bold");
                doc.text("TERMO DE REFERÊNCIA (TR) PARA COMPRAS", pageWidth / 2, y, { align: "center" });
                y += 15;

                doc.setFontSize(11);
                doc.setFont("times", "bold");
                doc.text("TERMO DE REFERÊNCIA", pageWidth / 2, y, { align: "center" });
                y += 15;

                addContent();
                resolve(doc);
            };

            brasaoImg.onload = () => {
                const targetWidth = 40;
                const aspectRatio = brasaoImg.height / brasaoImg.width;
                const targetHeight = targetWidth * aspectRatio;
                const xPosition = pageWidth / 2 - targetWidth / 2;

                y = 15;

                doc.addImage(brasaoImg, "PNG", xPosition, y, targetWidth, targetHeight);
                y += targetHeight + 10;

                drawContentAndResolve();
            };

            brasaoImg.onerror = () => {
                console.error("Falha ao carregar imagem do brasão.");
                y = 15; // Reset Y position if image fails
                y += 40; // Approximate space for the missing image
                drawContentAndResolve();
            };
        };

        addHeaderAndResolve();
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
        // Revogar a URL do objeto para liberar memória após o carregamento
        URL.revokeObjectURL(pdfUrl);
        console.log('PDF carregado e URL do objeto revogada.');
    };

    pdfPlaceholder.style.display = 'none';
    pdfViewer.style.display = 'block';
}

// Função para popular a pré-visualização do documento com PDF
async function populateDocument(jsonData) {
    const pdf = await generatePdf(jsonData);
    currentPDF = pdf;
    displayPDF(pdf);
}

// Função principal: Carregar e processar dados do TR
async function carregarDadosTR() {
    try {
        showLoading('Buscando dados do TR no banco de dados...');
        
        // Tentar buscar dados do banco primeiro
        const dadosBanco = await buscarDadosTR();
        
        if (dadosBanco) {
            console.log('Dados carregados do banco, gerando PDF...');
            showSuccess('Dados carregados do banco de dados! Gerando documento...');
            
            // Pequeno delay para mostrar o status de sucesso
            setTimeout(async () => {
                await populateDocument(dadosBanco);
                
                // Atualizar status para concluído
                setTimeout(() => {
                    showSuccess('Documento gerado com sucesso!');
                }, 1000);
            }, 500);
            
            return;
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados do banco:', error);
        showError(`Erro ao carregar TR: ${error.message}`);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 tr-resultado.js carregado');

    carregarDadosTR();

    // Funcionalidade do botão de download
    document.getElementById('downloadButton').addEventListener('click', function() {
        if (currentPDF) {
            // Gerar nome do arquivo com data atual
            const currentDate = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
            const fileName = `TR-${currentDate}.pdf`;
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
            // Fallback caso o ID do projeto não seja encontrado
            window.location.href = `${BASE_URL}/`;
        }
    });

    // Funcionalidade do botão Voltar à curadoria
    const voltarCuradoriaButton = document.getElementById('voltar-curadoria');
    if (voltarCuradoriaButton) {
        voltarCuradoriaButton.addEventListener('click', function() {
            const projectId = getProjectIdFromUrl();
            if (projectId) {
                window.location.href = `${BASE_URL}/projetos/${projectId}/confere_tr`;
            } else {
                // Fallback caso o ID do projeto não seja encontrado
                window.location.href = `${BASE_URL}/`;
            }
        });
    }
});