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
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
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
        loadingStatus.innerHTML =
            `<div class="inline-flex items-center text-red-700 bg-red-50 border border-red-200 font-medium rounded-lg text-sm px-4 py-2">
                <i class="uil uil-exclamation-triangle mr-2"></i>
                ${message}
            </div>`;
    }
}

// Função para exibir sucesso
function showSuccess(message) {
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.innerHTML =
            `<div class="inline-flex items-center text-green-700 bg-green-50 border border-green-200 font-medium rounded-lg text-sm px-4 py-2">
                <i class="uil uil-check mr-2"></i>
                ${message}
            </div>`;
    }
}

// Função para exibir loading
function showLoading(message) {
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.innerHTML =
            `<div class="inline-flex items-center text-blue-700 bg-blue-50 border border-blue-200 font-medium rounded-lg text-sm px-4 py-2">
                <i class="uil uil-spinner animate-spin mr-2"></i>
                ${message}
            </div>`;
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

        const anexo = "ANEXO IX";
        const tituloAnexo = "TERMO DE REFERÊNCIA PARA SERVIÇOS";
        const textoSubsecaoComum = "Os serviços objeto desta contratação são caracterizados como comuns, conforme indicado no Estudo Técnico Preliminar.";
        const tabelaHeaderCodigo = "CATSER";

        const subsectionIndent = 5; // Indentação para as subseções

        // Helper function for adding text with line wrapping
        const addWrappedText = (text, x, y, maxWidth, alignment = 'justify') => {
            if (typeof text !== 'string') {
                text = String(text);
            }
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, y, { align: alignment, maxWidth: maxWidth });
            return (doc.getTextDimensions(lines).h) + 2;
        };
        
        // Helper for adding a numbered subsection with an optional title.
        // Handles text wrapping and vertical spacing.
        const addSubsection = (number, title, content, x, y, maxWidth) => {
            let titleHeight = 0;
            if (title) {
                doc.setFont("times", "bold");
                const fullText = `${number} ${title}`;
                const lines = doc.splitTextToSize(fullText, maxWidth);
                doc.text(lines, x, y);
                titleHeight = (doc.getTextDimensions(lines).h);
            } else {
                doc.setFont("times", "bold");
                const numberText = `${number} `;
                doc.text(numberText, x, y);
            }

            doc.setFont("times", "normal");
            
            let contentHeight = 0;
            if (content && content.length > 0) {
                const contentX = title ? x : x + (doc.getStringUnitWidth(number + ' ') * doc.internal.getFontSize() / doc.internal.scaleFactor);
                const contentY = title ? y + titleHeight : y;
                const contentMaxWidth = title ? maxWidth : maxWidth - (contentX - x);
                
                contentHeight = addWrappedText(content, contentX, contentY, contentMaxWidth);
            }
            
            return Math.max(titleHeight, contentHeight) + 2;
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
            const tipoContratacaoTexto = `${jsonData.objeto_contratacao}, conforme condições e exigências estabelecidas neste instrumento.`;
            y += addSubsection("1.1", "", tipoContratacaoTexto, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += sectionSpacing;

            // Tabela de Itens
            checkPageBreak(30);
            const tableHeaders = ["Item/grupo", "Especificação de Serviço", tabelaHeaderCodigo, "Unidade de medida", "Quantidade", "Valor unitário", "Valor total"];
            const colWidths = [20, 50, 20, 20, 20, 25, 25]; // Total width = 180
            const tableStartX = margin;

            let currentX = tableStartX;
            doc.setFont("times", "bold");
            doc.setFontSize(10);
            const headerHeight = 10;
            tableHeaders.forEach((header, i) => {
                doc.rect(currentX, y, colWidths[i], headerHeight);
                const textLines = doc.splitTextToSize(header, colWidths[i] - 4);
                const textHeight = doc.getTextDimensions(textLines).h;
                doc.text(textLines, currentX + colWidths[i]/2, y + headerHeight/2, {align: 'center', baseline: 'middle'});
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
                const lineHeight = 5;

                rowData.forEach((text, i) => {
                    const lines = doc.splitTextToSize(String(text), colWidths[i] - (cellPadding * 2));
                    if (lines.length > maxLines) {
                        maxLines = lines.length;
                    }
                });
                
                const rowHeight = maxLines * lineHeight + (cellPadding * 2);
                
                checkPageBreak(rowHeight);
                
                currentX = tableStartX;
                
                rowData.forEach((text, i) => {
                    doc.rect(currentX, y, colWidths[i], rowHeight);
                    const lines = doc.splitTextToSize(String(text), colWidths[i] - (cellPadding * 2));
                    const textY = y + cellPadding + (lineHeight/2);
                    
                    if (i >= 5) { // Colunas de valores
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
            
            // Subseção 1.2
            checkPageBreak(15);
            y += addSubsection("1.2", "", textoSubsecaoComum, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            // Subseção 1.3
            checkPageBreak(15);
            const prazoVigencia = `O prazo de vigência da contratação é de ${jsonData.prazo_vigencia_contrato || '[não definido]'}.`;
            y += addSubsection("1.3", "", prazoVigencia, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            y += sectionSpacing;
            
            // Section 2: DA FUNDAMENTAÇÃO E DESCRIÇÃO DA NECESSIDADE DA CONTRATAÇÃO
            checkPageBreak(40);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("2. DA FUNDAMENTAÇÃO E DESCRIÇÃO DA NECESSIDADE DA CONTRATAÇÃO", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            y += addSubsection("2.1", "", "A Fundamentação da Contratação e de seus quantitativos encontra-se pormenorizada em tópico específico dos Estudos Técnicos Preliminares, apêndice deste Termo de Referência.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            let previsaoPCATexto;
            if (jsonData.adequacao_orcamentaria.previsao_pca === true) {
                const codigoPCA = jsonData.adequacao_orcamentaria.codigo_pca || "[não informado]";
                previsaoPCATexto = `O objeto da contratação está previsto no Plano de Contratações Anual, sob o código PCA ${codigoPCA}`;
            } else {
                previsaoPCATexto = "O objeto da contratação não está previsto no Plano de Contratações Anual (PCA).";
            }

            y += addSubsection("2.2", "", previsaoPCATexto, margin + subsectionIndent, y, contentWidth - subsectionIndent);
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
                    ? 'Será prevista uma quantidade máxima a ser adquirida para cada item/grupo de serviços, de acordo com o quadro que constará no edital.'
                    : 'Não haverá quantidade máxima a ser adquirida para cada item/grupo de serviços.';
                y += addWrappedText(`II - ${quantidadeMaximaTexto}`, textIndent, y, textWidth);

                // III
                const quantidadeMinimaTexto = srpData.quantidade_minima_cotacao
                    ? `A quantidade mínima de unidades de serviços a serem cotadas será de ${srpData.quantidade_minima_cotacao} unidade(s).`
                    : 'Não se aplica a previsão de quantidade mínima de unidades de serviços a serem cotadas.';
                y += addWrappedText(`III - ${quantidadeMinimaTexto}`, textIndent, y, textWidth);

                // IV
                const precosDiferentesTexto = srpData.permite_precos_diferentes
                    ? `Será permitida a previsão de preços diferentes. Justificativa: ${srpData.justificativa_precos_diferentes || '[justificativa não informada].'}`
                    : 'Não será permitida a previsão de preços diferentes.';
                y += addWrappedText(`IV - ${precosDiferentesTexto}`, textIndent, y, textWidth);

                // V
                const propostaInferiorTexto = srpData.permite_proposta_inferior
                    ? 'O licitante poderá oferecer proposta com quantitativo inferior de serviços ao máximo previsto.'
                    : `O licitante não poderá oferecer proposta com quantitativo inferior de serviços ao máximo previsto.`;
                y += addWrappedText(`V - ${propostaInferiorTexto}`, textIndent, y, textWidth);
    
                // VI
                const criterioJulgamentoTexto = srpData.criterio_julgamento === 'grupo'
                    ? 'menor preço por grupo de itens de serviços, devendo ser observado o critério de aceitabilidade de preços unitários máximos. A contratação posterior de item específico constante de grupo de itens exigirá prévia pesquisa de mercado e demonstração de sua vantagem para o órgão.'
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

            // Seção 3: DA DESCRIÇÃO DA SOLUÇÃO COMO UM TODO
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            const section3Title = "3. DA DESCRIÇÃO DA SOLUÇÃO COMO UM TODO CONSIDERADO O CICLO DE VIDA DO OBJETO E ESPECIFICAÇÃO DO PRODUTO";
            y += addWrappedText(section3Title, margin, y, contentWidth, 'left');
            doc.setFontSize(11);
            doc.setFont("times", "normal");
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
            y += sectionSpacing;   

            checkPageBreak(15);
            y += addSubsection("4.2", "DA INDICAÇÃO DE MARCAS OU MODELOS", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            y += addSubsection("4.2.1", "", jsonData.requisitos_contratacao.indicacao_marcas, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;   

            checkPageBreak(15);
            y += addSubsection("4.3", "DA VEDAÇÃO DE UTILIZAÇÃO DE MARCA OU PRODUTO NA EXECUÇÃO DO SERVIÇO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
         
            const vedacao = jsonData.requisitos_contratacao.vedacao_marca_produto?.trim();

            const vedacaoTexto = vedacao && vedacao !== ""
            ? `A Administração não aceitará o fornecimento dos seguintes produtos/marcas: ${vedacao}.`
            : "Não há vedação de utilização de marcas ou produtos na execução do serviço referido neste termo.";

            y += addSubsection(
            "4.3.1",
            "",
            vedacaoTexto,
            margin + subsectionIndent + 5,
            y,
            contentWidth - subsectionIndent - 5
            );
            
            // checkPageBreak(15);
            // y += addSubsection("4.4", "DA AMOSTRA", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            // checkPageBreak(15);
            // y += addSubsection("4.4.1", "", jsonData.requisitos_contratacao.exige_amostra ? 'Será exigida apresentação de amostra.' : 'Não será exigida apresentação de amostra.', margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            // y += sectionSpacing;   

            checkPageBreak(15);
            y += addSubsection("4.4", "DA EXIGÊNCIA DE CARTA DE SOLIDARIEDADE", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(15);
            y += addSubsection("4.4.1", "", jsonData.requisitos_contratacao.exige_carta_solidariedade ? 'Em caso de fornecedor revendedor ou distribuidor, será exigita carta de solidariedade emitida pelo fabricante, que assegure a execução do contrato.' : 'Não será exigida carta de solidariedade para a execução do contrato.', margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;   

            // checkPageBreak(15);
            // y += addSubsection("4.6", "DA VISTORIA", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            // checkPageBreak(15);
            // const vistoriaText = jsonData.requisitos_contratacao.exige_vistoria ? 'Será exigida a realização de vistoria.' : 'Não será exigida a realização de vistoria.';
            // y += addSubsection("4.6.1", "", vistoriaText, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            // y += sectionSpacing;   

            checkPageBreak(15);
            y += addSubsection("4.5", "DA SUBCONTRATAÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(15);
            y += addSubsection("4.5.1", "", jsonData.admite_subcontratacao ? 'É admitida a subcontratação do objeto contratual' : 'Não é admitida a subcontratação do objeto contratual.', margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;   

            checkPageBreak(15);
            y += addSubsection("4.6", "DA GARANTIA DA CONTRATAÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            y += addSubsection("4.6.1", "", jsonData.exige_garantia_contratual ? jsonData.requisitos_contratacao.garantia_produto_servico : 'Não se exige garantia contratual.', margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;


            // Section 5: DO MODELO DE EXECUÇÃO DO OBJETO
            checkPageBreak(100);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("5. DO MODELO DE EXECUÇÃO DO OBJETO", margin, y);
            y += 7;
            doc.setFontSize(11);
            
            y += addSubsection("5.1", "DAS CONDIÇÕES DE EXECUÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            y += addSubsection("5.1.1", "", jsonData.modelo_execucao.condicoes_execucao, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;   

            y += addSubsection("5.2", "DO LOCAL DA PRESTAÇÃO DOS SERVIÇOS", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            y += addSubsection("5.2.1", "", "Os serviços serão prestados no seguinte endereço: "+ jsonData.local_entrega_prestacao, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;

            y += addSubsection("5.3", "DOS MATERIAIS A SEREM DISPONIBILIZADOS", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            y += addSubsection("5.3.1", "", "Para  a  perfeita  execução  dos  serviços,  a  Contratada  deverá  disponibilizar  os  materiais,  equipamentos,  ferramentas  e  utensílios  necessários,  nas  quantidades estimadas e qualidades a seguir estabelecidas, promovendo sua substituição quando necessário:\n" + jsonData.modelo_execucao.materiais_disponibilizados || "A Contratada deverá disponibilizar os materiais, equipamentos, ferramentas e utensílios necessários para a prestação do serviço.", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;

            y += addSubsection("5.4", "DAS INFORMAÇÕES RELEVANTES PARA O DIMENSIONAMENTO DA PROPOSTA", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            y += addSubsection("5.4.1", "", "A demanda do órgão tem como base as seguintes características: \n" + jsonData.modelo_execucao.informacoes_relevantes || "A demanda do órgão tem como base as características descritas neste Termo de Referência.", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;

            y += addSubsection("5.5", "DA ESPECIFICAÇÃO DA GARANTIA DO SERVIÇO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            y += addSubsection("5.5.1", "", jsonData.requisitos_contratacao.garantia_produto_servico || "O prazo de garantia contratual dos serviços é aquele estabelecido na Lei nº 8.078, de 11 de setembro de 1990 (Código de Defesa do Consumidor).", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;

            y += addSubsection("5.6", "DOS DEVERES E RESPONSABILIDADES DO CONTRATANTE", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            jsonData.obrigacoes_contratante.forEach((item, index) => {
                checkPageBreak(10);
                y += addNumberedItem(`5.6.${index + 1}`, item, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            });
            y += sectionSpacing;   
            
            y += addSubsection("5.7", "DOS DEVERES E RESPONSABILIDADES DA CONTRATADA", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            jsonData.obrigacoes_contratada.forEach((item, index) => {
                checkPageBreak(10);
                y += addNumberedItem(`5.7.${index + 1}`, item, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
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
            y += addSubsection("6.1", "", "O contrato deverá ser executado fielmente pelas partes, de acordo com as cláusulas avençadas e as normas da Lei nº 14.133, de 2021, e cada parte responderá pelas consequências de sua inexecução total ou parcial.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);

            y += addSubsection("6.2", "", "Em caso de impedimento, ordem de paralisação ou suspensão do contrato, o cronograma de execução será prorrogado automaticamente pelo tempo correspondente, anotadas tais circunstâncias mediante simples apostila.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20); 

            y += addSubsection("6.3", "", "As comunicações entre o órgão ou entidade e a contratada devem ser realizadas por escrito sempre que o ato exigir tal formalidade, admitindo-se o uso de mensagem eletrônica para esse fim.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);

            y += addSubsection("6.4", "", "O órgão ou entidade poderá convocar representante da empresa para adoção de providências que devam ser cumpridas de imediato.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            
            y += addSubsection("6.5", "", "Após a assinatura do contrato ou instrumento equivalente, o órgão ou entidade poderá convocar o representante da empresa contratada para reunião inicial para apresentação do plano de fiscalização, que conterá informações acerca das obrigações contratuais, dos mecanismos de fiscalização, das estratégias para execução do objeto, do plano complementar de execução da contratada, quando houver, do método de aferição dos resultados e das sanções aplicáveis, dentre outros.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20); 
            
            y += addSubsection("6.6", "", "A execução do contrato deverá ser acompanhada e fiscalizada pelo(s) fiscal(is) do contrato, ou pelos respectivos substitutos.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20); 
            
            y += addSubsection("6.7", "", "O fiscal técnico do contrato, quando houver, acompanhará a execução do contrato, para que sejam cumpridas todas as condições estabelecidas no contrato, de modo a assegurar os melhores resultados para a Administração.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20); 

            y += addSubsection("6.8", "", "O fiscal administrativo do contrato verificará a manutenção das condições de habilitação da contratada, acompanhará o empenho, o pagamento, as garantias, as glosas e a formalização de apostilamento e termos aditivos, solicitando quaisquer documentos comprobatórios pertinentes, caso necessário.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);
            
            y += addSubsection("6.9", "", "O gestor do contrato - ou a equipe de gestão - coordenará a atualização do processo de acompanhamento e fiscalização do contrato contendo todos os registros formais da execução no histórico de gerenciamento do contrato, a exemplo da ordem de serviço, do registro de ocorrências, das alterações e das prorrogações contratuais, elaborando relatório com vistas à verificação da necessidade de adequações do contrato para fins de atendimento da finalidade da administração.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);     
            
            y += addSubsection("6.10", "", "O gestor do contrato tomará providências para a formalização de processo administrativo de responsabilização para fins de aplicação de sanções, a ser conduzido pela comissão de que trata o art. 158 da Lei n. 14.133, de 2021, ou pelo agente ou pelo setor com competência para tal, conforme o caso (Decreto n. 11.246, de 2022, art. 21, X).", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20); 
            
            y += addSubsection("6.11", "", "A indicação ou a manutenção do preposto da empresa poderá ser recusada pelo órgão ou entidade, desde que devidamente justificada, devendo a empresa designar outro para o exercício da atividade.", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            checkPageBreak(20);

            // y += addSubsection("6.12", "", jsonData.gestao_contrato.papeis_responsabilidades, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += sectionSpacing;
            
            // Section 7: DOS CRITÉRIOS DE MEDIÇÃO E PAGAMENTO
            checkPageBreak(50);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("7. DOS CRITÉRIOS DE MEDIÇÃO E PAGAMENTO", margin, y);
            y += 7;
            doc.setFontSize(11);
            
            y += addSubsection("7.1", "DA AVALIAÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");

            y += addSubsection("7.1.1", "", jsonData.criterios_pagamento.avaliacao || "A avaliação da execução do objeto utilizará o Instrumento de Medição de Resultado (IMR) ou outro instrumento substituto.", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);        
            y += sectionSpacing;
            checkPageBreak(20);   

            y += addSubsection("7.2", "DO RECEBIMENTO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");

            y += addSubsection("7.2.1", "", `Os serviços serão recebidos provisoriamente, no prazo de ${jsonData.criterios_pagamento.prazo_provisiorio_recebimento} dias, pelos fiscais técnico e administrativo, mediante termos detalhados, quando verificado o cumprimento das exigências de caráter técnico e administrativo. (Art. 140, I, a , da Lei nº 14.133 e Arts. 22, X e 23, X do Decreto nº 11.246, de 2022).`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);

            y += addSubsection("7.2.1.1", "", `O prazo da disposição acima será contado do recebimento de comunicação de cobrança oriunda do contratado com a comprovação da prestação dos serviços a que se referem a parcela a ser paga.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.1.2", "", `O fiscal técnico do contrato realizará o recebimento provisório do objeto do contrato mediante termo detalhado que comprove o cumprimento das exigências de caráter técnico. (Art. 22, X, Decreto nº 11.246, de 2022).`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.1.3", "", `O fiscal administrativo do contrato realizará o recebimento provisório do objeto do contrato mediante termo detalhado que comprove o cumprimento das exigências de caráter administrativo. (Art. 23, X, Decreto nº 11.246, de 2022)`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.1.4", "", `O fiscal setorial do contrato, quando houver, realizará o recebimento provisório sob o ponto de vista técnico e administrativo.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.2", "", `Para efeito de recebimento provisório, ao final de cada período de faturamento, o fiscal técnico do contrato irá apurar o resultado das avaliações da execução do objeto e, se for o caso, a análise do desempenho e qualidade da prestação dos serviços realizados em consonância com os indicadores previstos, que poderá resultar no redimensionamento de valores a serem pagos à contratada, registrando em relatório a ser encaminhado ao gestor do contrato.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);

            y += addSubsection("7.2.2.1", "", `O Contratado fica obrigado a reparar, corrigir, remover, reconstruir ou substituir, às suas expensas, no todo ou em parte, o objeto em que se verificarem vícios, defeitos ou incorreções resultantes da execução ou materiais empregados, cabendo à fiscalização não atestar a última e/ou única medição de serviços até que sejam sanadas todas as eventuais pendências que possam vir a ser apontadas no Recebimento Provisório.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.2.2", "", `A fiscalização não efetuará o ateste da última e/ou única medição de serviços até que sejam sanadas todas as eventuais pendências que possam vir a ser apontadas no Recebimento Provisório. (Art. 119 c/c art. 140 da Lei nº 14133, de 2021)`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.2.3", "", `O recebimento provisório também ficará sujeito, quando cabível, à conclusão de todos os testes de campo e à entrega dos Manuais e Instruções exigíveis.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.2.4", "", `Os serviços poderão ser rejeitados, no todo ou em parte, quando em desacordo com as especificações constantes neste Termo de Referência e na proposta, sem prejuízo da aplicação das penalidades.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.3", "", `Quando a fiscalização for exercida por um único servidor, o Termo Detalhado deverá conter o registro, a análise e a conclusão acerca das ocorrências na execução do contrato, em relação à fiscalização técnica e administrativa e demais documentos que julgar necessários, devendo encaminhá-los ao gestor do contrato para recebimento definitivo.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);

            y += addSubsection("7.2.4", "", `Os serviços serão recebidos definitivamente no prazo de ${jsonData.criterios_pagamento.prazo_definitivo_recebimento} dias, contados do recebimento provisório, por servidor ou comissão designada pela autoridade competente, após a verificação da qualidade e quantidade do serviço e consequente aceitação mediante termo detalhado, obedecendo os seguintes procedimentos:`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);

            y += addSubsection("7.2.4.1", "", `Emitir documento comprobatório da avaliação realizada pelos fiscais técnico, administrativo e setorial, quando houver, no cumprimento de obrigações assumidas pelo contratado, com menção ao seu desempenho na execução contratual, baseado em indicadores objetivamente definidos e aferidos, e a eventuais penalidades aplicadas, devendo constar do cadastro de atesto de cumprimento de obrigações, conforme regulamento (art. 21, VIII, Decreto nº 11.246, de 2022).`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.4.2", "", `Realizar a análise dos relatórios e de toda a documentação apresentada pela fiscalização e, caso haja irregularidades que impeçam a liquidação e o pagamento da despesa, indicar as cláusulas contratuais pertinentes, solicitando à CONTRATADA, por escrito, as respectivas correções;`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.4.3", "", `Emitir Termo Circunstanciado para efeito de recebimento definitivo dos serviços prestados, com base nos relatórios e documentações apresentadas; e`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.4.4", "", `Comunicar a empresa para que emita a Nota Fiscal ou Fatura, com o valor exato dimensionado pela fiscalização.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);

            y += addSubsection("7.2.4.5", "", `Enviar a documentação pertinente ao setor de contratos para a formalização dos procedimentos de liquidação e pagamento, no valor dimensionado pela fiscalização e gestão.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            y += sectionSpacing;   
            checkPageBreak(20);

            y += addSubsection("7.3", "DA LIQUIDAÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            y += addSubsection("7.3.1", "", `Recebida a Nota Fiscal ou documento de cobrança equivalente, correrá o prazo de dez dias úteis para fins de liquidação, na forma desta seção, prorrogáveis por igual período, nos termos do art. 7º, §2º da Instrução Normativa SEGES/ME nº 77/2022.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.3.1.1", "", `O prazo de que trata o item anterior será reduzido à metade, mantendo-se a possibilidade de prorrogação, no caso de contratações decorrentes de despesas cujos valores não ultrapassem o limite de que trata o inciso II do art. 75 da Lei nº 14.133, de 2021.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);

            const texto7_3_2 = `Para fins de liquidação, o setor competente deve verificar se a Nota Fiscal ou Fatura apresentada expressa os elementos necessários e essenciais do documento, tais como: o prazo de validade; a data de emissão; os dados do contrato e do órgão contratante; o período respectivo de execução do contrato; o valor a pagar; e eventual destaque do valor de retenções tributárias cabíveis.`;

            y += addSubsection("7.3.2", "", texto7_3_2, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.3.3", "", `Havendo erro na apresentação da nota fiscal ou instrumento de cobrança equivalente, ou circunstância que impeça a liquidação da despesa, esta ficará sobrestada até que o contratado providencie as medidas saneadoras, reiniciando-se o prazo após a comprovação da regularização da situação, sem ônus ao contratante;`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.3.4", "", `A nota fiscal ou instrumento de cobrança equivalente deverá ser obrigatoriamente acompanhado da comprovação da regularidade fiscal, constatada por meio de consulta on-line ao SICAF ou, na impossibilidade de acesso ao referido Sistema, mediante consulta aos sítios eletrônicos oficiais ou à documentação mencionada no art. 68 da Lei nº 14.133, de 2021.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.3.5", "", `A Administração deverá realizar consulta ao SICAF para: a) verificar a manutenção das condições de habilitação exigidas no edital; b) identificar possível razão que impeça a participação em licitação, no âmbito do órgão ou entidade, que implique proibição de contratar com o Poder Público, bem como ocorrências impeditivas indiretas.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.3.6", "", `Constatando-se, junto ao SICAF, a situação de irregularidade do contratado, será providenciada sua notificação, por escrito, para que, no prazo de 5 (cinco) dias úteis, regularize sua situação ou, no mesmo prazo, apresente sua defesa. O prazo poderá ser prorrogado uma vez, por igual período, a critério do contratante.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.3.7", "", `Não havendo regularização ou sendo a defesa considerada improcedente, o contratante deverá comunicar aos órgãos responsáveis pela fiscalização da regularidade fiscal quanto à inadimplência do contratado, bem como quanto à existência de pagamento a ser efetuado, para que sejam acionados os meios pertinentes e necessários para garantir o recebimento de seus créditos.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.3.8", "", `Persistindo a irregularidade, o contratante deverá adotar as medidas necessárias à rescisão contratual nos autos do processo administrativo correspondente, assegurada ao contratado a ampla defesa.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.3.9", "", `Havendo a efetiva execução do objeto, os pagamentos serão realizados normalmente, até que se decida pela rescisão do contrato, caso o contratado não regularize sua situação junto ao SICAF.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;   

            y += addSubsection("7.4", "DO PRAZO DE PAGAMENTO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            y += addSubsection("7.4.1", "", `O pagamento será efetuado no prazo de até 10 (dez) dias úteis contados da finalização da liquidação da despesa, conforme seção anterior, nos termos da Instrução Normativa SEGES/ME nº 77, de 2022.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;   

            // Inserir subseção 7.4.2 com tabela para calculo da taxa de compensação financeira

            y += addSubsection("7.5", "DA FORMA DE PAGAMENTO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            const texto7_5_1 = `O pagamento será realizado mediante ordem bancária ou por OBPIX, por meio do Banco do Brasil S/A, em moeda corrente, até ${jsonData.criterios_pagamento.prazo_pagamento}, contados a partir do recebimento da nota fiscal/fatura, após o recebimento definitivo dos bens ou dos serviços atestados pelo fiscal e autorizado pelo gestor do contrato, aplicadas as retenções legais, inclusive quanto à legislação municipal do imposto sobre serviços.`;
            y += addSubsection("7.5.1", "", texto7_5_1, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.5.1.1", "", `Para o pagamento por meio de OBPIX serão aceitas chaves PIX nos formatos CPF/CNPJ, email, número de celular ou chave aleatória.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);
            y += addSubsection("7.5.1.2", "", `Poderá ainda o pagamento via OBPIX utilizar apenas o domicílio bancário (banco, agência e nº de conta), desde que haja chave PIX cadastrada para o domicílio bancário, exigindo-se, contudo, que a contratada informe tratar-se de conta corrente ou conta poupança.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);
            y += addSubsection("7.5.1.3", "", `O pagamento via OBPIX não será realizado caso apresentado apenas imagem de QR-Code.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            checkPageBreak(20);
            y += addSubsection("7.5.2", "", `Será considerada data do pagamento o dia em que constar como emitida a ordem bancária para pagamento.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.5.3", "", `Quando do pagamento, será efetuada a retenção tributária prevista na legislação aplicável.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            checkPageBreak(20);
            y += addSubsection("7.5.3.1", "", `Independentemente do percentual de tributo inserido na planilha, quando houver, serão retidos na fonte, quando da realização do pagamento, os percentuais estabelecidos na legislação vigente.`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            y += sectionSpacing;
            
            y += addSubsection("7.6", "DA ANTECIPAÇÃO DE PAGAMENTO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            const antecipacaoTxt = jsonData.criterios_pagamento.antecipacao_pagamento ? 'Será permitido a antecipação do pagamento para o serviço referido.' : 'Não será permitido a antecipação de pagamento para o serviço referido.';
            y += addSubsection("7.6.1", "", antecipacaoTxt, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;
            
            y += addSubsection("7.7", "DA CESSÃO DE CRÉDITO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            y += addSubsection("7.7.1", "", jsonData.criterios_pagamento.cessao_credito, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;

            // Section 8: DA FORMA E CRITÉRIO DE SELEÇÃO DO FORNECEDOR
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("8. FORMA E CRITÉRIO DE SELEÇÃO DO FORNECEDOR", margin, y);
            y += 7;
            doc.setFontSize(11);
            
            y += addSubsection("8.1", "DA FORMA DE SELEÇÃO E CRITÉRIO DE JULGAMENTO DA PROPOSTA", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            doc.setFont("times", "normal");
            y += addSubsection("8.1.1", "", `O fornecedor será selecionado por meio da realização de procedimento de ${jsonData.selecao_fornecedor.forma_selecao}, com adoção do critério de julgamento: ${jsonData.selecao_fornecedor.criterio_julgamento}.`, margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            y += sectionSpacing;   

            y += addSubsection("8.2", "DAS EXIGÊNCIAS DE HABILITAÇÃO", "", margin + subsectionIndent, y, contentWidth - subsectionIndent);
            
            doc.setFont("times", "normal");
            y += addNumberedItem("8.2.1", "DA HABILITAÇÃO JURÍDICA:", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            jsonData.selecao_fornecedor.exigencias_habilitacao.juridica.forEach((item) => {
                checkPageBreak(10);
                y += addWrappedText(`• ${item}`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            });
            y += sectionSpacing;   
            
            y += addNumberedItem("8.2.2", "DA HABILITAÇÃO FISCAL, SOCIAL E TRABALHISTA:", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            jsonData.selecao_fornecedor.exigencias_habilitacao.fiscal_trabalhista.forEach((item) => {
                checkPageBreak(10);
                y += addWrappedText(`• ${item}`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            });
            y += sectionSpacing;   

            y += addNumberedItem("8.3", "DA QUALIFICAÇÃO ECONÔMICA-FINANCEIRA:", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            jsonData.selecao_fornecedor.exigencias_habilitacao.economico_financeira.forEach((item) => {
                checkPageBreak(10);
                y += addWrappedText(`• ${item}`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            });
            y += sectionSpacing;   

            y += addNumberedItem("8.4", "DA QUALIFICAÇÃO TÉCNICA:", margin + subsectionIndent + 5, y, contentWidth - subsectionIndent - 5);
            jsonData.selecao_fornecedor.exigencias_habilitacao.tecnica.forEach((item) => {
                checkPageBreak(10);
                y += addWrappedText(`• ${item}`, margin + subsectionIndent + 10, y, contentWidth - subsectionIndent - 10);
            });
            y += sectionSpacing;

            // Section 9: DA ESTIMATIVA DO VALOR DA CONTRATAÇÃO
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("9. DA ESTIMATIVA DO VALOR DA CONTRATAÇÃO", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            y += addSubsection("9.1", "", `O custo estimado total da contratação é de R$ ${jsonData.estimativa_valor.valor_total}`, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += sectionSpacing;   

            // Section 10: DA ADEQUAÇÃO ORÇAMENTÁRIA
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("10. DA ADEQUAÇÃO ORÇAMENTÁRIA", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            y += addSubsection("10.1", "", `A fonte orçamentária para o custeio das despesas da contratação está indicada no quadro adiante.`, margin + subsectionIndent, y, contentWidth - subsectionIndent);
            y += sectionSpacing;   

            // Section 11: DAS INFRAÇÕES E SANÇÕES APLICÁVEIS
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("11. DAS INFRAÇÕES E SANÇÕES APLICÁVEIS", margin, y);
            y += 7;
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            
            y += addSubsection("11.1", "SANÇÕES:", jsonData.sancoes_administrativas, margin + subsectionIndent, y, contentWidth - subsectionIndent);
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
                doc.text("TERMO DE REFERÊNCIA (TR) PARA SERVIÇOS", pageWidth / 2, y, { align: "center" });
                y += 15;

                doc.setFontSize(11);
                doc.setFont("times", "bold");
                doc.text("TERMO DE REFERÊNCIA", pageWidth / 2, y, { align: "center" });
                y += 15;

                addContent();
                resolve(doc);
            };

            brasaoImg.onload = () => {
                const targetWidth = 25;
                const aspectRatio = brasaoImg.height / brasaoImg.width;
                const targetHeight = targetWidth * aspectRatio;
                const xPosition = pageWidth / 2 - targetWidth / 2;

                y = 15;

                doc.addImage(brasaoImg, "PNG", xPosition, y, targetWidth, targetHeight);
                y += targetHeight + 5;

                drawContentAndResolve();
            };

            brasaoImg.onerror = () => {
                console.error("Falha ao carregar imagem do brasão.");
                y = 15; // Reset Y position if image fails
                y += 30; // Approximate space for the missing image
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
    console.log('🔄 tr-resultado-servicos.js carregado');

    carregarDadosTR();

    // Funcionalidade do botão de download
    document.getElementById('downloadButton').addEventListener('click', function() {
        if (currentPDF) {
            // Gerar nome do arquivo com data atual
            const currentDate = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-') ;
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
