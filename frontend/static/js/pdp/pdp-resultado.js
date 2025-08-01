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

// Função para extrair project_id da URL
function getProjectIdFromUrl() {
    const url = window.location.pathname;
    const match = url.match(/\/projetos\/(\d+)\//);
    return match ? match[1] : null;
}

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

// Função para gerar PDF a partir dos dados JSON
function generatePDF(jsonData) {
    return new Promise((resolve) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let lineHeight = 7;
        const maxWidth = pageWidth - (margin * 2);
        
        const brasaoImg = new Image();
        brasaoImg.src = '/static/assets/img/brasao_oficial_republica.png';

        const proceedWithPdf = (yPosition) => {
            // Título do documento
            doc.setFontSize(14);
            doc.setFont("times", "bold");
            doc.text("RELATÓRIO DE PESQUISA DE PREÇOS", pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 15;

            // Seção de Informações Gerais (comuns)
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("1. INFORMAÇÕES GERAIS", margin, yPosition);
            yPosition += 10;

            doc.setFontSize(11);
            doc.setFont("times", "normal");
            const objetoText = doc.splitTextToSize(`Objeto da Contratação: ${jsonData.objeto}`, maxWidth);
            doc.text(objetoText, margin, yPosition);
            yPosition += (objetoText.length * lineHeight);
            yPosition += 5;

            // Seção de Fontes de Pesquisa
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text("2. FONTES DE PESQUISA", margin, yPosition);
            yPosition += 10;

            jsonData.fontes.forEach((fonte, index) => {
                if (yPosition > 250) { // Adicionar nova página se necessário
                    doc.addPage();
                    yPosition = 20;
                }

                doc.setFontSize(12);
                doc.setFont("times", "bold");
                doc.text(`Fonte ${index + 1}: ${fonte.empresa_adjudicada}`, margin, yPosition);
                yPosition += 8;

                doc.setFontSize(11);
                doc.setFont("times", "normal");
                doc.text(`Órgão Contratante: ${fonte.orgao_contratante}`, margin, yPosition);
                yPosition += lineHeight;
                doc.text(`Processo/Pregão: ${fonte.processo_pregao}`, margin, yPosition);
                yPosition += lineHeight;
                doc.text(`CNPJ: ${fonte.cnpj_empresa}`, margin, yPosition);
                yPosition += lineHeight;
                doc.text(`Data de Vigência: ${fonte.data_vigencia_inicio}`, margin, yPosition);
                yPosition += lineHeight;
                doc.text(`Tipo de Fonte: ${fonte.tipo_fonte}`, margin, yPosition);
                yPosition += 10;

                // Tabela de Itens para a fonte
                if (fonte.tabela_itens && fonte.tabela_itens.length > 0) {
                    doc.setFontSize(11);
                    doc.setFont("times", "bold");
                    doc.text("Itens:", margin, yPosition);
                    yPosition += 8;

                    fonte.tabela_itens.forEach((item) => {
                        if (yPosition > 260) { // Adicionar nova página
                            doc.addPage();
                            yPosition = 20;
                        }
                        
                        const descricao = item.descricao || item.descricao_item || "Descrição não informada";
                        const unidade = item.unidade || item.unidade_medida || "N/A";
                        const valor_unitario = item.valor_unitario || 0;
                        const valor_total = item.valor_total || (item.quantidade * valor_unitario);


                        doc.setFontSize(11);
                        doc.setFont("times", "bold");
                        doc.text(`Item ${item.item}: ${descricao}`, margin, yPosition);
                        yPosition += 6;

                        doc.setFont("times", "normal");
                        doc.text(`Unidade: ${unidade}`, margin, yPosition);
                        yPosition += lineHeight;
                        doc.text(`Quantidade: ${item.quantidade}`, margin, yPosition);
                        yPosition += lineHeight;
                        doc.text(`Valor Unitário: R$ ${valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, yPosition);
                        yPosition += lineHeight;
                        if (valor_total) {
                            doc.text(`Valor Total: R$ ${valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, yPosition);
                            yPosition += lineHeight;
                        }
                        yPosition += 5;
                    });
                }
                yPosition += 5;
            });

            resolve(doc);
        }

        brasaoImg.onload = function () {
            let yPosition = 15;

            const targetWidth = 50;
            const aspectRatio = brasaoImg.height / brasaoImg.width;
            const targetHeight = targetWidth * aspectRatio;
            const xPosition = pageWidth / 2 - targetWidth / 2;

            doc.addImage(brasaoImg, 'PNG', xPosition, yPosition, targetWidth, targetHeight);
            yPosition += targetHeight + 10;

            doc.setFontSize(9);
            doc.setFont("times", "normal");
            doc.text("TRIBUNAL REGIONAL ELEITORAL DO ACRE", pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;

            doc.setFontSize(8);
            doc.setFont("times", "normal");
            doc.text("Alameda Ministro Miguel Ferrante, 224 - Bairro Portal da Amazônia - CEP 69915-632 - Rio Branco - AC", pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 15;

            proceedWithPdf(yPosition);
        };

        brasaoImg.onerror = function() {
            console.error("Não foi possível carregar a imagem do brasão.");
            let yPosition = 30;
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