// Inicializar jsPDF
const { jsPDF } = window.jspdf;

// Configuração do endpoint
const BASE_URL = window.location.origin;

// ✅ FUNÇÃO AUXILIAR: Obter token de autenticação
function obterTokenAutenticacao() {
  const tokenLocalStorage =
    localStorage.getItem("access_token") || localStorage.getItem("token");
  const tokenSessionStorage =
    sessionStorage.getItem("access_token") || sessionStorage.getItem("token");

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }

  const tokenCookie =
    getCookie("access_token") || getCookie("token") || getCookie("auth_token");

  return tokenLocalStorage || tokenSessionStorage || tokenCookie;
}

// ✅ FUNÇÃO AUXILIAR: Fazer requisição com autenticação
async function fazerRequisicaoAutenticada(url, options = {}) {
  const token = obterTokenAutenticacao();

  const requestConfig = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...options.headers,
    },
  };

  if (token) {
    requestConfig.headers["Authorization"] = `Bearer ${token}`;
  }

  console.log("Fazendo requisição ETP com config:", requestConfig);

  try {
    const response = await fetch(url, requestConfig);

    if (response.status === 401 && token) {
      console.log("Tentativa com token falhou, tentando só com cookies...");
      delete requestConfig.headers["Authorization"];
      return await fetch(url, requestConfig);
    }

    return response;
  } catch (error) {
    console.error("Erro na requisição ETP:", error);
    throw error;
  }
}

// Função para extrair project_id da URL
function getProjectIdFromUrl() {
  const url = window.location.pathname;
  const match = url.match(/\/projetos\/(\d+)/);
  return match ? match[1] : null;
}

// ✅ NOVA FUNÇÃO: Buscar dados do ETP no banco de dados
async function buscarDadosETP() {
  try {
    const projectId = getProjectIdFromUrl();

    if (!projectId) {
      throw new Error("ID do projeto não encontrado na URL");
    }

    console.log("Buscando ETP para o projeto:", projectId);

    const response = await fazerRequisicaoAutenticada(
      `/projetos/${projectId}/etp`,
      {
        method: "GET",
        headers: {
          "remote-user": "user.test",
          "remote-groups": "TI,OUTROS",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("ETP não encontrado para este projeto");
      } else if (response.status === 401) {
        throw new Error(
          "Você não está autenticado. Por favor, faça login novamente."
        );
      } else if (response.status === 403) {
        throw new Error("Você não tem permissão para visualizar este ETP.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Erro ${response.status}: ${errorData.detail || "Erro ao buscar ETP"}`
        );
      }
    }

    const etpList = await response.json();
    console.log("ETP carregado do banco:", etpList);

    if (!etpList || etpList.length === 0) {
      throw new Error("Nenhum ETP encontrado para este projeto");
    }

    // Pegar o primeiro ETP (mais recente)
    const etpData = etpList[0];

    // Converter os dados do banco para o formato esperado pelo PDF
    return converterDadosETP(etpData);
  } catch (error) {
    console.error("Erro ao buscar dados do ETP:", error);
    throw error;
  }
}

// ✅ NOVA FUNÇÃO: Converter dados do banco para formato do JSON esperado
function converterDadosETP(etpBanco) {
  try {
    console.log("Convertendo dados do ETP:", etpBanco);

    // Processar alinhamento estratégico
    let alinhamento_estrategico = [];
    if (etpBanco.alinhamento_estrategico) {
      if (Array.isArray(etpBanco.alinhamento_estrategico)) {
        alinhamento_estrategico = etpBanco.alinhamento_estrategico;
      } else if (typeof etpBanco.alinhamento_estrategico === "string") {
        alinhamento_estrategico = etpBanco.alinhamento_estrategico
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
    }

    // Processar requisitos de contratação
    let req_contratacao = [];
    if (etpBanco.req_contratacao) {
      if (Array.isArray(etpBanco.req_contratacao)) {
        req_contratacao = etpBanco.req_contratacao;
      } else if (typeof etpBanco.req_contratacao === "string") {
        req_contratacao = etpBanco.req_contratacao
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
    }

    // Processar levantamento de mercado
    let lev_mercado = {};
    if (etpBanco.lev_mercado) {
      if (typeof etpBanco.lev_mercado === "object") {
        lev_mercado = etpBanco.lev_mercado;
      } else if (typeof etpBanco.lev_mercado === "string") {
        try {
          lev_mercado = JSON.parse(etpBanco.lev_mercado);
        } catch (e) {
          lev_mercado = { pesquisa_mercado: etpBanco.lev_mercado };
        }
      }
    }

    // Processar demonstração de resultados
    let demonst_resultados = {};
    if (etpBanco.demonst_resultados) {
      if (typeof etpBanco.demonst_resultados === "object") {
        demonst_resultados = etpBanco.demonst_resultados;
      } else if (typeof etpBanco.demonst_resultados === "string") {
        try {
          demonst_resultados = JSON.parse(etpBanco.demonst_resultados);
        } catch (e) {
          demonst_resultados = { resumo: etpBanco.demonst_resultados };
        }
      }
    }

    // Processar providências
    let providencias = {};
    if (etpBanco.providencias) {
      if (typeof etpBanco.providencias === "object") {
        providencias = etpBanco.providencias;
      } else if (typeof etpBanco.providencias === "string") {
        try {
          // Tenta fazer o parse como um objeto JSON
          providencias = JSON.parse(etpBanco.providencias);
        } catch (e) {
          // Se não for um objeto JSON, trata a string como pre_contratacao
          providencias = { pre_contratacao: etpBanco.providencias };
        }
      }

      // Garante que pre_contratacao, durante_execucao, pos_contratacao sejam arrays de strings
      const ensureArray = (field) => {
        if (providencias[field]) {
          if (typeof providencias[field] === "string") {
            // Divide por quebra de linha, então remove espaços de cada item
            providencias[field] = providencias[field].split('\n').map(item => item.trim()).filter(item => item.length > 0);
          } else if (!Array.isArray(providencias[field])) {
            // Se não for uma string e nem um array, torna-o um array vazio
            providencias[field] = [];
          }
        } else {
          providencias[field] = [];
        }
      };

      ensureArray('pre_contratacao');
      ensureArray('durante_execucao');
      ensureArray('pos_contratacao');
    }

    // Processar alinhamento PLS
    let alinhamento_pls = [];
    if (etpBanco.alinhamento_pls) {
      if (Array.isArray(etpBanco.alinhamento_pls)) {
        alinhamento_pls = etpBanco.alinhamento_pls;
      } else if (typeof etpBanco.alinhamento_pls === "string") {
        alinhamento_pls = etpBanco.alinhamento_pls
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
    }

    // Montar objeto final no formato esperado
    const dadosConvertidos = {
      unidade_demandante:
        etpBanco.unidade_demandante || "Unidade não especificada",
      objeto_contratado:
        etpBanco.objeto_contratado || "Objeto não especificado",
      sist_reg_preco: etpBanco.sist_reg_preco || false,
      necessidade_contratacao:
        etpBanco.necessidade_contratacao || "Justificativa não especificada",
      alinhamento_estrategico: alinhamento_estrategico,
      info_contratacao:
        etpBanco.info_contratacao || "Informações não especificadas",
      previsto_pca: etpBanco.previsto_pca || false,
      item: etpBanco.item || 0,
      req_contratacao: req_contratacao,
      lev_mercado: lev_mercado,
      solucao: etpBanco.solucao || "Solução não especificada",
      quantidade_estimada: etpBanco.quantidade_estimada || {},
      just_nao_parc: etpBanco.just_nao_parc || "Justificativa não especificada",
      valor_total: etpBanco.valor_total || "A definir",
      demonst_resultados: demonst_resultados,
      serv_continuo: etpBanco.serv_continuo || false,
      justif_serv_continuo: etpBanco.justif_serv_continuo || "",
      providencias: providencias,
      impac_ambientais: etpBanco.impac_ambientais || "Não especificado",
      alinhamento_pls: alinhamento_pls,
      posic_conclusivo: etpBanco.posic_conclusivo ?? true,
      justif_posic_conclusivo:
        etpBanco.justif_posic_conclusivo || "Não especificada",
      equipe_de_planejamento:
        etpBanco.equipe_de_planejamento || "Equipe não especificada",
    };

    console.log("Dados convertidos para o PDF:", dadosConvertidos);
    return dadosConvertidos;
  } catch (error) {
    console.error("Erro ao converter dados do ETP:", error);
    throw new Error("Erro ao processar dados do ETP");
  }
}

// Função para carregar dados do localStorage (mantida como fallback)
function loadDataFromStorage() {
  try {
    const savedData = localStorage.getItem("etpGerado");
    if (!savedData) {
      console.warn("Nenhum dado encontrado no localStorage");
      return null;
    }

    const parsedData = JSON.parse(savedData);
    console.log("Dados carregados do localStorage:", parsedData);
    return parsedData;
  } catch (error) {
    console.error("Erro ao carregar dados do localStorage:", error);
    return null;
  }
}

// Função para exibir erro
function showError(message) {
  const loadingStatus = document.getElementById("loadingStatus");
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
  const loadingStatus = document.getElementById("loadingStatus");
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
  const loadingStatus = document.getElementById("loadingStatus");
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
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine + (currentLine ? " " : "") + word;
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

// Mapeamento de chaves de resultados para nomes de exibição amigáveis
const resultadoKeyMap = {
    // Quantitativos
    'reducao_custos': 'Redução de custos',
    'aumento_receita': 'Aumento de receita',
    'aumento_produtividade': 'Aumento de produtividade',
    'reducao_tempo_ciclo': 'Redução do tempo de ciclo',
    'aumento_market_share': 'Aumento de market share',
    'reducao_taxa_erro': 'Redução da taxa de erro',

    // Qualitativos
    'eficiencia_operacional': 'Eficiência operacional',
    'satisfacao_usuarios': 'Satisfação dos usuários',
    'melhoria_servicos': 'Melhoria na qualidade dos serviços',
    'reducao_riscos': 'Redução de riscos',
    'conformidade_legal': "Conformidade legal",
    'inovacao_tecnologica': 'Inovação tecnológica',
    'sustentabilidade_ambiental': 'Sustentabilidade ambiental',
    'melhora_imagem_organizacao': 'Melhora na imagem da organização',
    'acessibilidade': 'Acessibilidade',
    'seguranca_informacao': 'Segurança da informação',
    'resiliencia_operacional': 'Resiliência operacional',
    'escalabilidade': 'Escalabilidade',
    'interoperabilidade': 'Interoperabilidade',
    'usabilidade': 'Usabilidade',
    'transparencia': 'Transparência',
    'participacao_cidada': 'Participação cidadã',
    'satisfacao_servidores': 'Satisfação dos servidores'
};

// Função para obter o nome de exibição de uma chave de resultado
function getResultadoDisplayName(key) {
    return resultadoKeyMap[key] || key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Função para gerar PDF a partir dos dados JSON do ETP
function generateETPPDF(jsonData) {
    return new Promise((resolve) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const lineHeight = 7;
        const maxWidth = pageWidth - margin * 2;

        const brasaoImg = new Image();
        brasaoImg.src = '/static/assets/img/brasao_oficial_republica.png';

        const proceedWithPdf = (yPosition) => {
            // Título do documento
            doc.setFontSize(12);
            doc.setFont("times", "bold");
            const currentDate = new Date().toLocaleDateString("pt-BR");
            const docTitle = `ETP - ESTUDO TÉCNICO PRELIMINAR - ${currentDate}`;
            doc.text(docTitle, pageWidth / 2, yPosition, {
                align: "center",
            });
            yPosition += 10;

            doc.setFontSize(11);
            doc.text("ANEXO I", pageWidth / 2, yPosition, {
                align: "center",
            });
            yPosition += 15;

            doc.setFontSize(11);
            doc.text("ESTUDO TÉCNICO PRELIMINAR (ETP)", pageWidth / 2, yPosition, {
                align: "center",
            });
            yPosition += 20;

            // Função auxiliar para adicionar seção
            function addSection(title, content, startY) {
                const sectionWidth = maxWidth;
                const padding = 4;

                // Calcular altura do título
                doc.setFontSize(10);
                doc.setFont("times", "bold");
                const titleLines = doc.splitTextToSize(title, sectionWidth - 8);
                const titleHeight = titleLines.length * 7 + 6;

                // Calcular altura do conteúdo
                doc.setFontSize(9);
                doc.setFont("times", "normal");
                const contentLines = doc.splitTextToSize(
                    content || "Não informado",
                    sectionWidth - 8
                );
                const contentHeight = contentLines.length * 6 + padding;

                const totalHeight = titleHeight + contentHeight + padding;

                // Verificar se precisa de nova página
                if (startY + totalHeight > 270) {
                    doc.addPage();
                    startY = 30;
                }

                // Desenhar borda
                doc.setLineWidth(0.2);
                doc.setDrawColor(0, 0, 0);
                doc.rect(margin, startY, sectionWidth, totalHeight);

                // Linha separadora do título
                doc.setDrawColor(169, 169, 169);
                doc.line(
                    margin,
                    startY + titleHeight,
                    margin + sectionWidth,
                    startY + titleHeight
                );
                doc.setDrawColor(0, 0, 0);

                // Adicionar título
                doc.setFontSize(10);
                doc.setFont("times", "bold");
                titleLines.forEach((line, index) => {
                    doc.text(line, margin + 4, startY + 10 + index * 7);
                });

                // Adicionar conteúdo
                doc.setFontSize(9);
                doc.setFont("times", "normal");
                contentLines.forEach((line, index) => {
                    doc.text(line, margin + 4, startY + titleHeight + 8 + index * 6);
                });

                return startY + totalHeight + 10;
            }

            // Seção 1 - UNIDADE DEMANDANTE
            yPosition = addSection(
                "1. IDENTIFICAÇÃO DA UNIDADE DEMANDANTE",
                jsonData.unidade_demandante,
                yPosition
            );

            // Seção 2 - OBJETO DA CONTRATAÇÃO
            yPosition = addSection(
                "2. OBJETO DA CONTRATAÇÃO",
                jsonData.objeto_contratado,
                yPosition
            );

            // Seção 3 - JUSTIFICATIVA DA NECESSIDADE
            yPosition = addSection(
                "3. JUSTIFICATIVA DA NECESSIDADE DA CONTRATAÇÃO",
                jsonData.necessidade_contratacao,
                yPosition
            );

            // Seção 4 - SISTEMA DE REGISTRO DE PREÇOS
            const srpText = jsonData.sist_reg_preco ?
                "Sim, utilizará Sistema de Registro de Preços" :
                "Não utilizará Sistema de Registro de Preços";
            yPosition = addSection(
                "4. SISTEMA DE REGISTRO DE PREÇOS",
                srpText,
                yPosition
            );

            // Seção 5 - ALINHAMENTO ESTRATÉGICO
            const alinhamentoText = 
                jsonData.alinhamento_estrategico &&
                jsonData.alinhamento_estrategico.length > 0 ?
                jsonData.alinhamento_estrategico.map((item) => `• ${item}`).join("\n") :
                "Não possui alinhamento estratégico.";
            yPosition = addSection(
                "5. ALINHAMENTO ESTRATÉGICO",
                alinhamentoText,
                yPosition
            );

            // Seção 6 - REQUISITOS PARA CONTRATAÇÃO
            const requisitosText = 
                jsonData.req_contratacao && jsonData.req_contratacao.length > 0 ?
                jsonData.req_contratacao.map((item) => `• ${item}`).join("\n") :
                "Requisitos não especificados";
            yPosition = addSection(
                "6. REQUISITOS PARA CONTRATAÇÃO",
                requisitosText,
                yPosition
            );

            // Seção 7 - LEVANTAMENTO DE MERCADO
            const levMercado = jsonData.lev_mercado || {};
            const mercadoText = 
                `${ 
      levMercado.pesquisa_mercado || "Não informado" 
    }\n\n` +
                `Preço Médio Encontrado: R$ ${(levMercado.preco_medio || 0).toLocaleString(
      "pt-BR",
      { minimumFractionDigits: 2 }
    )}\n` +
                `Variação Percentual: ${levMercado.variacao_percentual || 0}%\n\n` +
                `Fontes Consultadas: ${ 
      (levMercado.fontes || []).join(", ") || "Não informado" 
    }\n\n` +
                `Observações: ${levMercado.observacoes || "Nenhuma observação"}`;
            yPosition = addSection("7. LEVANTAMENTO DE MERCADO", mercadoText, yPosition);

            // Seção 8 - SOLUÇÃO PROPOSTA
            yPosition = addSection("8. SOLUÇÃO PROPOSTA", jsonData.solucao, yPosition);

            // Seção 9 - QUANTIDADE ESTIMADA
            let quantidadeText = "Quantidade não especificada";
            if (
                jsonData.quantidade_estimada &&
                Object.keys(jsonData.quantidade_estimada).length > 0
            ) {
                const quant = jsonData.quantidade_estimada;
                quantidadeText =
                    `Total Estimado: R$ ${(quant.total_estimado || 0).toLocaleString(
        "pt-BR",
        { minimumFractionDigits: 2 }
      )}\n\n` +
                    `Critérios de Dimensionamento: ${ 
        quant.criterios_dimensionamento || "Não especificado" 
      }`;

                if (quant.item_principal) {
                    quantidadeText +=
                        `\n\nItem Principal:\n` +
                        `• Descrição: ${ 
          quant.item_principal.descricao || "Não especificado" 
        }\n` +
                        `• Quantidade: ${quant.item_principal.quantidade || 0}\n` +
                        `• Valor Unitário: R$ ${( 
          quant.item_principal.valor_unitario || 0
        ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
                }
            }
            yPosition = addSection("9. QUANTIDADE ESTIMADA", quantidadeText, yPosition);

            // Seção 10 - JUSTIFICATIVA PARA PARCELAMENTO OU NÃO
            yPosition = addSection(
                "10. JUSTIFICATIVAS PARA O PARCELAMENTO OU NÃO DA CONTRATAÇÃO",
                jsonData.just_nao_parc,
                yPosition
            );

            // Seção 11 - VALOR TOTAL ESTIMADO
            yPosition = addSection(
                "11. VALOR TOTAL ESTIMADO",
                jsonData.valor_total,
                yPosition
            );

            // Seção 12 - DEMONSTRAÇÃO DE RESULTADOS
            let resultadosText = "Resultados não especificados";
            if (
                jsonData.demonst_resultados &&
                Object.keys(jsonData.demonst_resultados).length > 0
            ) {
                const demo = jsonData.demonst_resultados;
                resultadosText = "";

                if (demo.resultados_quantitativos) {
                    resultadosText += "RESULTADOS QUANTITATIVOS:\n";
                    Object.entries(demo.resultados_quantitativos).forEach(([key, value]) => {
                        resultadosText += `• ${getResultadoDisplayName(key)}: ${value}\n`;
                    });
                    resultadosText += "\n";
                }

                if (demo.resultados_qualitativos) {
                    resultadosText += "RESULTADOS QUALITATIVOS:\n";
                    Object.entries(demo.resultados_qualitativos).forEach(([key, value]) => {
                        resultadosText += `• ${getResultadoDisplayName(key)}: ${value}\n`;
                    });
                    resultadosText += "\n";
                }

                if (demo.indicadores_desempenho && demo.indicadores_desempenho.length > 0) {
                    resultadosText += `INDICADORES DE DESEMPENHO:\n${demo.indicadores_desempenho
        .map((ind) => `• ${ind}`)
        .join("\n")}\n\n`;
                }

                if (demo.prazo_resultados) {
                    resultadosText += `PRAZO PARA RESULTADOS: ${demo.prazo_resultados}`;
                }
            }
            yPosition = addSection(
                "12. DEMONSTRAÇÃO DE RESULTADOS",
                resultadosText,
                yPosition
            );

            // Seção 13 - SERVIÇO CONTÍNUO
            const servicoContinuoText = jsonData.serv_continuo ?
                `Sim, trata-se de serviço de natureza continuada.\n\nJustificativa: ${ 
        jsonData.justif_serv_continuo || "Não informada" 
      }` :
                "Não se trata de serviço de natureza continuada.";
            yPosition = addSection(
                "13. SERVIÇO DE NATUREZA CONTINUADA",
                servicoContinuoText,
                yPosition
            );

            // Seção 14 - PROVIDÊNCIAS NECESSÁRIAS
            let providenciasText = "Providências não especificadas";
            if (jsonData.providencias && Object.keys(jsonData.providencias).length > 0) {
                const prov = jsonData.providencias;
                providenciasText = "";

                if (prov.pre_contratacao && prov.pre_contratacao.length > 0) {
                    providenciasText += "PRÉ-CONTRATAÇÃO:\n";
                    prov.pre_contratacao.forEach((item) => {
                        providenciasText += `• ${item}\n`;
                    });
                    providenciasText += "\n";
                }

                if (prov.durante_execucao && prov.durante_execucao.length > 0) {
                    providenciasText += "DURANTE A EXECUÇÃO:\n";
                    prov.durante_execucao.forEach((item) => {
                        providenciasText += `• ${item}\n`;
                    });
                    providenciasText += "\n";
                }

                if (prov.pos_contratacao && prov.pos_contratacao.length > 0) {
                    providenciasText += "PÓS-CONTRATAÇÃO:\n";
                    prov.pos_contratacao.forEach((item) => {
                        providenciasText += `• ${item}\n`;
                    });
                }
            }
            yPosition = addSection(
                "14. PROVIDÊNCIAS NECESSÁRIAS",
                providenciasText,
                yPosition
            );

            // Seção 15 - IMPACTOS AMBIENTAIS
            yPosition = addSection(
                "15. IMPACTOS AMBIENTAIS",
                jsonData.impac_ambientais,
                yPosition
            );

            // Seção 16 - ALINHAMENTO COM PLS
            const plsText = 
                jsonData.alinhamento_pls && jsonData.alinhamento_pls.length > 0 ?
                jsonData.alinhamento_pls.map((item) => `• ${item}`).join("\n") :
                "Nenhum critério específico de sustentabilidade definido";
            yPosition = addSection(
                "16. ALINHAMENTO COM PLANO DE LOGÍSTICA SUSTENTÁVEL",
                plsText,
                yPosition
            );

            // Seção 17 - POSIÇÃO CONCLUSIVA
            const posicaoText =
              `Posição: ${ 
                jsonData.posic_conclusivo ? "Favorável" : "Contrária" 
              } à contratação\n\n` + `Justificativa: ${jsonData.justif_posic_conclusivo}`;
            yPosition = addSection("17. POSIÇÃO CONCLUSIVA", posicaoText, yPosition);

            // Seção 18 - EQUIPE DE PLANEJAMENTO
            yPosition = addSection(
                "18. EQUIPE DE PLANEJAMENTO",
                jsonData.equipe_de_planejamento,
                yPosition
            );

            resolve(doc);
        }

        brasaoImg.onload = function() {
            let yPosition = 15;

            const targetWidth = 50;
            const aspectRatio = brasaoImg.height / brasaoImg.width;
            const targetHeight = targetWidth * aspectRatio;
            const xPosition = pageWidth / 2 - targetWidth / 2;

            doc.addImage(brasaoImg, 'PNG', xPosition, yPosition, targetWidth, targetHeight);
            yPosition += targetHeight + 10;

            // Cabeçalho
            doc.setFontSize(9);
            doc.setFont("times", "normal");
            doc.text("TRIBUNAL REGIONAL ELEITORAL DO ACRE", pageWidth / 2, yPosition, {
                align: "center",
            });
            yPosition += 6;

            doc.setFontSize(8);
            doc.setFont("times", "normal");
            doc.text(
                "Alameda Ministro Miguel Ferrante, 224 - Bairro Portal da Amazônia - CEP 69915-632 - Rio Branco - AC",
                pageWidth / 2,
                yPosition, { align: "center" }
            );
            yPosition += 15;

            proceedWithPdf(yPosition);
        };

        brasaoImg.onerror = function() {
            console.error("Não foi possível carregar a imagem do brasão.");
            let yPosition = 30; // Posição inicial sem imagem
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
      // Revogar a URL do objeto para liberar memória após o carregamento
      URL.revokeObjectURL(pdfUrl);
      console.log('PDF carregado e URL do objeto revogada.');
  };

  pdfPlaceholder.style.display = 'none';
  pdfViewer.style.display = 'block';
}

// Função para popular a pré-visualização do documento com PDF
async function populateDocument(jsonData) {
  const pdf = await generateETPPDF(jsonData);
  currentPDF = pdf;
  displayPDF(pdf);
}

// ✅ FUNÇÃO PRINCIPAL: Carregar e processar dados do ETP
async function carregarDadosETP() {
  try {
    showLoading("Buscando dados do ETP no banco de dados...");

    // Tentar buscar dados do banco primeiro
    const dadosBanco = await buscarDadosETP();

    if (dadosBanco) {
      console.log("Dados carregados do banco, gerando PDF...");
      showSuccess("Dados carregados do banco de dados! Gerando documento...");

      // Pequeno delay para mostrar o status de sucesso
      setTimeout(async () => {
        await populateDocument(dadosBanco);

        // Atualizar status para concluído
        setTimeout(() => {
          showSuccess("Documento ETP gerado com sucesso!");
        }, 1000);
      }, 500);

      return;
    }
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    showError(`Erro ao carregar ETP: ${error.message}`);

    // Tentar fallback para localStorage
    console.log("Tentando carregar dados do localStorage como fallback...");
    const savedData = loadDataFromStorage();

    if (savedData) {
      console.log("Dados encontrados no localStorage, gerando PDF...");
      showSuccess("Dados carregados do localStorage! Gerando documento...");

      setTimeout(async () => {
        // Se são dados do localStorage, podem estar em formato diferente
        const dadosProcessados = Array.isArray(savedData)
          ? savedData[0]
          : savedData;
        await populateDocument(dadosProcessados);

        setTimeout(() => {
          showSuccess(
            "Documento ETP gerado com sucesso! (usando dados locais)"
          );
        }, 1000);
      }, 500);
    } else {
      showError(
        "Nenhum dado encontrado. Retorne à página de curadoria para gerar o documento."
      );
    }
  }
}


// Event listener para carregar dados automaticamente quando a página carrega
document.addEventListener("DOMContentLoaded", function () {
  console.log("Iniciando carregamento dos dados do ETP...");
  carregarDadosETP();
});

// Funcionalidade do botão de download
document
  .getElementById("downloadButton")
  .addEventListener("click", function () {
    if (currentPDF) {
      // Gerar nome do arquivo com data atual
      const currentDate = new Date()
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-");
      const fileName = `ETP-${currentDate}.pdf`;
      currentPDF.save(fileName);
    } else {
      alert(
        "Nenhum documento foi gerado ainda. Por favor, aguarde o processamento."
      );
    }
  });

// Função para ser chamada ao receber JSON de fonte externa
function processJSON(jsonResponse) {
  populateDocument(jsonResponse);
}

// Event listener para o botão Voltar à curadoria
document
  .getElementById("voltar-curadoria")
  .addEventListener("click", function () {
    const projectId = getProjectIdFromUrl();
    window.location.href = projectId
      ? `${BASE_URL}/projetos/${projectId}/confere_etp`
      : `${BASE_URL}/`;
  });

// Event listener para o botão Voltar ao início
document.getElementById("voltar-inicio").addEventListener("click", function () {
  const projectId = getProjectIdFromUrl();
  window.location.href = projectId
    ? `${BASE_URL}/projetos/${projectId}/`
    : `${BASE_URL}/`;
});
