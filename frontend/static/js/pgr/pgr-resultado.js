import { getProjectIdFromUrl } from "../utils/projeto/getProject.js";
import { fazerRequisicaoAutenticada } from "../utils/auth/auth.js";

// Inicializar jsPDF
const { jsPDF } = window.jspdf;

// Configuração do endpoint
const BASE_URL = window.location.origin;

// Variáveis globais para gerenciar os PDFs
let pgrDataStore = [];
let generatedPdfs = {};
let activeSolutionId = null;

// ✅ FUNÇÃO: Buscar dados do PGR no banco de dados
async function buscarDadosPGR() {
  const projectId = getProjectIdFromUrl();
  if (!projectId) throw new Error("ID do projeto não encontrado na URL");

  console.log("Buscando PGR para o projeto:", projectId);
  const response = await fazerRequisicaoAutenticada(
    `/projetos/${projectId}/pgr`,
    {
      method: "GET",
      headers: {
        "remote-user": "user.test",
        "remote-groups": "TI,OUTROS",
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Erro ${response.status}: ${errorData.detail || "Erro ao buscar PGR"}`
    );
  }

  const pgrData = await response.json();
  console.log("PGR carregado do banco:", pgrData);

  // Garante que a saída seja sempre um array
  return Array.isArray(pgrData) ? pgrData : [pgrData];
}

// Funções de UI (loading, success, error)
function showStatus(type, message) {
  const loadingStatus = document.getElementById("loadingStatus");
  const statusTypes = {
    loading: { icon: "uil-spinner animate-spin", color: "blue" },
    success: { icon: "uil-check", color: "green" },
    error: { icon: "uil-exclamation-triangle", color: "red" },
  };
  const status = statusTypes[type];
  if (loadingStatus && status) {
    loadingStatus.innerHTML = `
            <div class="inline-flex items-center text-${status.color}-700 bg-${status.color}-50 border border-${status.color}-200 font-medium rounded-lg text-sm px-4 py-2">
                <i class="uil ${status.icon} mr-2"></i>
                ${message}
            </div>
        `;
  }
}

// ✅ FUNÇÃO: Criar a interface do Dropdown
function criarInterfacePGR(pgrDataArray) {
  const container = document.getElementById("pgrDropdownContainer");
  const previewContainer = document.getElementById("pdfPreviewContainer");
  if (!container || !previewContainer) return;

  pgrDataStore = pgrDataArray;

  if (pgrDataArray.length === 0) {
    container.innerHTML = `<span class="text-gray-500">Nenhuma solução encontrada.</span>`;
    previewContainer.innerHTML = `<div class="p-6 text-center text-gray-500">Nenhuma solução com análise de riscos foi encontrada para este projeto.</div>`;
    return;
  }

  const optionsHtml = pgrDataArray
    .map((pgrItem, index) => {
      const solucaoId = pgrItem.id_solucao || index;
      const nomeSolucao = pgrItem.risco?.nome_solucao || `Solução ${solucaoId}`;
      return `<option value="${solucaoId}">${nomeSolucao}</option>`;
    })
    .join("");

  container.innerHTML = `
        <select id="pgrSelector" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5">
            ${optionsHtml}
        </select>
    `;

  const selector = document.getElementById("pgrSelector");
  selector.addEventListener("change", (event) => {
    const selectedId = event.target.value;
    // Use '==' for comparison because option value is a string
    const selectedPgrItem = pgrDataStore.find(
      (p, i) => (p.id_solucao || i) == selectedId
    );
    if (selectedPgrItem) {
      handleSolutionSelection(selectedPgrItem, selectedId);
    }
  });

  // Carregar o primeiro item da lista ao iniciar
  if (pgrDataArray.length > 0) {
    const firstId = pgrDataArray[0].id_solucao || 0;
    handleSolutionSelection(pgrDataArray[0], firstId);
  }
}

// ✅ FUNÇÃO: Lidar com a seleção de uma solução no dropdown
async function handleSolutionSelection(pgrItem, solucaoId) {
  activeSolutionId = solucaoId;
  console.log(`Solução ${solucaoId} selecionada.`);

  if (generatedPdfs[solucaoId]) {
    console.log("PDF já gerado. Exibindo.");
    displayPDF(generatedPdfs[solucaoId]);
    return;
  }

  const placeholder = document.getElementById("pdf-placeholder");
  const pdfViewer = document.getElementById("pdfViewer");

  // Mostrar placeholder e esconder viewer
  placeholder.style.display = "flex";
  pdfViewer.style.display = "none";
  placeholder.innerHTML = `
        <div class="text-center">
            <i class="uil uil-spinner animate-spin text-4xl text-blue-500 mb-4"></i>
            <p class="text-gray-600">Gerando documento para ${pgrItem.risco?.nome_solucao}...</p>
        </div>
    `;

  try {
    const pdf = await generatePDF(pgrItem);
    generatedPdfs[solucaoId] = pdf;
    displayPDF(pdf);
  } catch (error) {
    console.error(`Erro ao gerar PDF para solução ${solucaoId}:`, error);
    placeholder.innerHTML = `
            <div class="text-center text-red-600">
                <i class="uil uil-exclamation-triangle text-4xl mb-4"></i>
                <p>Falha ao gerar o documento.</p>
                <p class="text-sm">${error.message}</p>
            </div>
        `;
  }
}

// ✅ FUNÇÃO: Gerar o PDF do PGR
function generatePDF(pgrData) {
  return new Promise((resolve) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const { risco } = pgrData;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Funções auxiliares de PDF
    const checkPageBreak = (neededHeight) => {
      if (y + neededHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addHeader = () => {
      const brasaoImg = new Image();
      brasaoImg.src = "/static/assets/img/brasao_oficial_republica.png";
      brasaoImg.onload = () => {
        const targetWidth = 40; // mm
        const aspectRatio = brasaoImg.height / brasaoImg.width;
        const targetHeight = targetWidth * aspectRatio;
        const xPosition = pageWidth / 2 - targetWidth / 2;

        y = 15; // start from 15mm from top. 'y' is from outer scope.

        doc.addImage(brasaoImg, "PNG", xPosition, y, targetWidth, targetHeight);
        y += targetHeight + 10; // 10mm space

        // Tribunal info from dfd-resultado.js
        doc.setFontSize(9);
        doc.setFont("times", "normal");
        doc.text("TRIBUNAL REGIONAL ELEITORAL DO ACRE", pageWidth / 2, y, {
          align: "center",
        });
        y += 6;

        doc.setFontSize(8);
        doc.setFont("times", "normal");
        doc.text(
          "Alameda Ministro Miguel Ferrante, 224 - Bairro Portal da Amazônia - CEP 69915-632 - Rio Branco - AC",
          pageWidth / 2,
          y,
          { align: "center" }
        );
        y += 15;

        // Document Title (as it was in pgr)
        doc.setFontSize(14);
        doc.setFont("times", "bold");
        doc.text("PLANO DE GERENCIAMENTO DE RISCOS (PGR)", pageWidth / 2, y, {
          align: "center",
        });
        y += 10;

        addContent();
        resolve(doc);
      };
      brasaoImg.onerror = () => {
        console.error("Falha ao carregar imagem do brasão.");
        y = 20;
        doc.setFontSize(9);
        doc.setFont("times", "normal");
        doc.text("TRIBUNAL REGIONAL ELEITORAL DO ACRE", pageWidth / 2, y, {
          align: "center",
        });
        y += 6;

        doc.setFontSize(8);
        doc.setFont("times", "normal");
        doc.text(
          "Alameda Ministro Miguel Ferrante, 224 - Bairro Portal da Amazônia - CEP 69915-632 - Rio Branco - AC",
          pageWidth / 2,
          y,
          { align: "center" }
        );
        y += 15;

        doc.setFontSize(14);
        doc.setFont("times", "bold");
        doc.text("PLANO DE GERENCIAMENTO DE RISCOS (PGR)", pageWidth / 2, y, {
          align: "center",
        });
        y += 10;
        addContent();
        resolve(doc);
      };
    };

    const addSectionTitle = (title) => {
      checkPageBreak(15);
      y += 10;
      doc.setFontSize(12);
      doc.setFont("times", "bold");
      doc.text(title, margin, y);
      y += 7;
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const addText = (label, content, indent) => {
      checkPageBreak(10);
      doc.setFontSize(10);
      doc.setFont("times", "bold");
      doc.text(label, margin, y);
      doc.setFont("times", "normal");
      const contentMargin = margin + indent;
      const contentWidth = pageWidth - contentMargin - margin;
      const splitText = doc.splitTextToSize(
        content || "Não informado",
        contentWidth
      );
      doc.text(splitText, contentMargin, y);
      y += splitText.length * 5 + 5;
    };

    const addList = (label, items) => {
      checkPageBreak(10 + items.length * 5);
      doc.setFontSize(10);
      doc.setFont("times", "bold");
      doc.text(label, margin, y);
      y += 5;
      doc.setFont("times", "normal");
      items.forEach((item) => {
        const splitItem = doc.splitTextToSize(
          `• ${item}`,
          pageWidth - margin * 2 - 5
        );
        doc.text(splitItem, margin + 5, y);
        y += splitItem.length * 5;
      });
      y += 5;
    };

    const addContent = () => {
      const indent = 15;
      const indentInformacoesGerais = 15; // Espaço para o rótulo

      // 1. Informações Gerais
      addSectionTitle("1. INFORMAÇÕES GERAIS");
      addText("Objeto:", pgrData.objeto, indentInformacoesGerais);
      addText("Solução:", risco.nome_solucao, indentInformacoesGerais);
      addText("Resumo:", risco.resumo_analise, indentInformacoesGerais);

      // 2. Matriz de Riscos
      addSectionTitle("2. MATRIZ DE RISCOS");
      if (risco.matriz_riscos.riscos_criticos.length > 0)
        addList("Riscos Críticos:", risco.matriz_riscos.riscos_criticos);
      if (risco.matriz_riscos.riscos_altos.length > 0)
        addList("Riscos Altos:", risco.matriz_riscos.riscos_altos);
      if (risco.matriz_riscos.riscos_medios.length > 0)
        addList("Riscos Médios:", risco.matriz_riscos.riscos_medios);
      if (risco.matriz_riscos.riscos_baixos.length > 0)
        addList("Riscos Baixos:", risco.matriz_riscos.riscos_baixos);

      // 3. Detalhamento dos Riscos
      const indentDetalhamento = 25;

      addSectionTitle("3. DETALHAMENTO DOS RISCOS IDENTIFICADOS");
      risco.riscos_identificados.forEach((r, index) => {
        checkPageBreak(20);
        y += 5;
        doc.setFontSize(11);
        doc.setFont("times", "bold");
        doc.text(`3.${index + 1} ${r.tipo_risco}`, margin, y);
        y += 8;

        addText("Descrição:", r.descricao, indentDetalhamento - 7);
        addText("Categoria:", r.categoria, indentDetalhamento - 7);
        addText("Probabilidade:", r.probabilidade, indentDetalhamento);
        addText("Impacto:", r.impacto, indentDetalhamento - 10);
        addText("Nível do Risco:", r.nivel_risco, indentDetalhamento);
        addList("Causas Potenciais:", r.causas_potenciais);
        addList("Consequências:", r.consequencias);

        // Tabela de Ações de Mitigação
        checkPageBreak(20);
        doc.setFontSize(10);
        doc.setFont("times", "bold");
        doc.text("Ações de Mitigação:", margin, y);
        y += 6;
        doc.autoTable({
          startY: y,
          head: [["Ação", "Responsável", "Prazo", "Custo", "Eficácia"]],
          body: r.acoes_mitigacao.map((a) => [
            a.acao,
            a.responsavel,
            a.prazo,
            a.custo_estimado,
            a.eficacia_estimada,
          ]),
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [220, 220, 220],
            textColor: 0,
            fontStyle: "bold",
          },
        });
        y = doc.autoTable.previous.finalY + 10;

        // Plano de Contingência
        checkPageBreak(15);
        addText("Gatilho Contingência:", r.plano_contingencia.trigger, 35);
        addList("Ações de Contingência:", r.plano_contingencia.acoes);

        // Monitoramento
        checkPageBreak(15);
        addText(
          "Monitoramento:",
          `Frequência: ${r.monitoramento.frequencia}, Responsável: ${r.monitoramento.responsavel}`,
          indentDetalhamento + 2
        );
        addList("Métricas:", r.monitoramento.metricas);
      });

      // 4. Recomendações
      addSectionTitle("4. RECOMENDAÇÕES GERAIS");
      addList("", risco.recomendacoes_gerais);

      // 5. Metodologia
      addSectionTitle("5. METODOLOGIA APLICADA");
      addText("", risco.metodologia_aplicada, 0);
    };

    addHeader();
  });
}

// ✅ FUNÇÃO: Exibir PDF no visualizador
function displayPDF(pdf) {
  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const pdfViewer = document.getElementById("pdfViewer");
  const pdfPlaceholder = document.getElementById("pdf-placeholder");

  if (pdfViewer && pdfPlaceholder) {
    pdfViewer.src = pdfUrl;
    pdfPlaceholder.style.display = "none";
    pdfViewer.style.display = "block";
  }
}

// ✅ FUNÇÃO PRINCIPAL: Carregar e processar dados do PGR
async function carregarDadosPGR() {
  try {
    showStatus("loading", "Buscando dados do PGR no banco de dados...");
    const pgrDataArray = await buscarDadosPGR();

    if (pgrDataArray.length > 0) {
      showStatus(
        "success",
        "Dados carregados. Selecione uma solução para ver o documento."
      );
      criarInterfacePGR(pgrDataArray);
    } else {
      showStatus(
        "error",
        "Nenhuma análise de risco encontrada para este projeto."
      );
    }
  } catch (error) {
    console.error("Erro ao carregar dados do PGR:", error);
    showStatus("error", `Erro ao carregar PGR: ${error.message}`);
  }
}

// Event listener para carregar dados automaticamente
document.addEventListener("DOMContentLoaded", carregarDadosPGR);

// Event listener para o botão de download principal
document
  .getElementById("downloadButton")
  .addEventListener("click", function () {
    if (activeSolutionId !== null && generatedPdfs[activeSolutionId]) {
      const pgrItem = pgrDataStore.find(
        (p) => (p.id_solucao || pgrDataStore.indexOf(p)) == activeSolutionId
      );
      const nomeSolucao =
        pgrItem.risco?.nome_solucao.replace(/\s+/g, "_") ||
        `solucao_${activeSolutionId}`;
      const currentDate = new Date()
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-");
      const fileName = `PGR_${nomeSolucao}_${currentDate}.pdf`;
      generatedPdfs[activeSolutionId].save(fileName);
    } else {
      alert("Por favor, selecione e gere o documento de uma solução primeiro.");
    }
  });

// Event listener para o botão Voltar ao início
document.getElementById("voltar-inicio").addEventListener("click", function () {
  const projectId = getProjectIdFromUrl();
  window.location.href = projectId
    ? `${BASE_URL}/projetos/${projectId}/`
    : `${BASE_URL}/`;
});

// Event listener para o botão Voltar à curadoria
document
  .getElementById("voltar-curadoria")
  .addEventListener("click", function () {
    const projectId = getProjectIdFromUrl();
    window.location.href = projectId
      ? `${BASE_URL}/projetos/${projectId}/confere_pgr`
      : `${BASE_URL}/`;
  });
