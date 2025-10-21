import { getProjectIdFromUrl } from "../utils/projeto/getProject.js";
import { fazerRequisicaoAutenticada } from "../utils/auth/auth.js";

const projectId = getProjectIdFromUrl();

document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Inicializando PGR Curadoria");
  console.log("Dados PGR recebidos:", window.pgrData);

  let currentPgrData = null;
  let currentPgrIndex = 0;

  // Função para exibir alertas customizados
  function exibirAlerta(titulo, mensagem, tipo = "info") {
    const icones = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    const icone = icones[tipo] || icones["info"];
    alert(`${icone} ${titulo}\n\n${mensagem}`);
  }

  // Função para inicializar o seletor de PGR
  function inicializarSeletorPGR() {
    const selector = document.getElementById("pgr-select");
    const selectorContainer = document.getElementById("pgr-selector");

    if (!window.pgrData || window.pgrData.length === 0) {
      if (selectorContainer) {
        selectorContainer.style.display = "none";
      }
      return;
    }

    // Se há apenas um PGR, ocultar o seletor
    if (window.pgrData.length === 1) {
      if (selectorContainer) {
        selectorContainer.style.display = "none";
      }
      currentPgrIndex = 0;
      carregarPGR(0);
      return;
    }

    // Preencher opções do seletor
    if (selector) {
      selector.innerHTML = "";
      window.pgrData.forEach((pgr, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `PGR ${pgr.id_pgr} - ${
          pgr.id_solucao ? `Solução ${pgr.id_solucao}` : "Geral"
        }`;
        selector.appendChild(option);
      });

      // Event listener para mudança de seleção
      selector.addEventListener("change", function () {
        currentPgrIndex = parseInt(this.value);
        carregarPGR(currentPgrIndex);
      });
    }

    // Carregar o primeiro PGR
    carregarPGR(0);
  }

  // Função para carregar dados de um PGR específico
  function carregarPGR(index) {
    if (!window.pgrData || !window.pgrData[index]) {
      console.error("PGR não encontrado no índice:", index);
      return;
    }

    currentPgrData = window.pgrData[index];
    console.log("Carregando PGR:", currentPgrData);

    // Preencher informações gerais
    preencherInformacoesGerais();

    // Preencher campos do risco
    preencherCamposRisco();

    // Mostrar conteúdo
    const conteudo = document.getElementById("pgr-content");
    if (conteudo) {
      conteudo.style.display = "block";
    }
  }

  // Função para preencher informações gerais
  function preencherInformacoesGerais() {
    // Objeto do contrato
    const objetoField = document.getElementById("objeto-contrato");
    if (objetoField) {
      objetoField.value = currentPgrData.objeto || "";
    }

    // Metadados
    const pgrIdField = document.getElementById("pgr-id");
    if (pgrIdField) {
      pgrIdField.textContent = currentPgrData.id_pgr || "";
    }

    const usuarioField = document.getElementById("usuario-criacao");
    if (usuarioField) {
      usuarioField.textContent = currentPgrData.usuario_criacao || "";
    }

    const dataField = document.getElementById("data-criacao");
    if (dataField) {
      const data = currentPgrData.data_criacao
        ? new Date(currentPgrData.data_criacao).toLocaleString("pt-BR")
        : "";
      dataField.textContent = data;
    }
  }

  // Função para preencher campos baseados no JSON de risco
  function preencherCamposRisco() {
    const risco = currentPgrData.risco || {};

    console.log("Estrutura do risco:", risco);

    // Resumo da análise
    const resumoField = document.getElementById("resumo-analise");
    if (resumoField) {
      resumoField.value = risco.resumo_analise || "";
    }

    // Metodologia aplicada
    const metodologiaField = document.getElementById("metodologia-aplicada");
    if (metodologiaField) {
      metodologiaField.value = risco.metodologia_aplicada || "";
    }

    // Análise comparativa
    const analiseComparativa = risco.analise_comparativa || {};

    const menorRiscoField = document.getElementById("solucao-menor-risco");
    if (menorRiscoField) {
      menorRiscoField.value = analiseComparativa.solucao_menor_risco || "";
    }

    const maiorRiscoField = document.getElementById("solucao-maior-risco");
    if (maiorRiscoField) {
      maiorRiscoField.value = analiseComparativa.solucao_maior_risco || "";
    }

    const recomendacaoField = document.getElementById("recomendacao-final");
    if (recomendacaoField) {
      recomendacaoField.value = analiseComparativa.recomendacao_final || "";
    }

    // Plano geral de riscos
    const planoGeral = risco.plano_geral_riscos || {};

    const governancaField = document.getElementById("estrutura-governanca");
    if (governancaField) {
      governancaField.value = planoGeral.estrutura_governanca || "";
    }

    const periodicidadeField = document.getElementById("periodicidade-revisao");
    if (periodicidadeField) {
      periodicidadeField.value = planoGeral.periodicidade_revisao || "";
    }

    // Carregar riscos - adaptado para a estrutura real dos dados
    carregarRiscosPorSolucao(risco);
  }

  // Função para carregar e exibir riscos por solução
  function carregarRiscosPorSolucao(riscoData) {
    const container = document.getElementById("riscos-container");
    if (!container) return;

    container.innerHTML = "";

    console.log("Dados de risco recebidos:", riscoData);

    // Verificar se há dados de solução
    if (!riscoData || !riscoData.id_solucao) {
      container.innerHTML =
        '<div class="text-center text-gray-500 p-4">Nenhum risco identificado</div>';
      return;
    }

    const solucaoRisco = riscoData;
    const solucaoDiv = document.createElement("div");
    solucaoDiv.className = "border border-gray-200 rounded-lg p-4 bg-gray-50";

    solucaoDiv.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-gray-800">
                    ${
                      solucaoRisco.nome_solucao ||
                      `Solução ${solucaoRisco.id_solucao}`
                    }
                </h3>
                <span class="px-3 py-1 text-xs font-medium rounded-full ${getRiscoColorClass(
                  solucaoRisco.nivel_risco_geral
                )}">
                    ${solucaoRisco.nivel_risco_geral || "N/A"}
                </span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <span class="text-sm font-medium text-gray-600">Categoria Principal:</span>
                    <span class="text-sm text-gray-800">${
                      solucaoRisco.categoria_risco_principal || "N/A"
                    }</span>
                </div>
                <div>
                    <span class="text-sm font-medium text-gray-600">Total de Riscos:</span>
                    <span class="text-sm text-gray-800">${
                      (solucaoRisco.riscos_identificados || []).length
                    }</span>
                </div>
            </div>

            ${
              (solucaoRisco.riscos_identificados || []).length > 0
                ? `
                <div class="mb-4">
                    <h4 class="text-md font-medium text-gray-700 mb-2">Riscos Identificados:</h4>
                    <div id="riscos-identificados-container" class="space-y-3">
                        ${solucaoRisco.riscos_identificados
                          .map(
                            (risco, riscoIndex) => `
                            <div class="bg-white p-3 rounded border border-gray-200">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="font-medium text-sm">${
                                      risco.tipo_risco ||
                                      "Tipo não especificado"
                                    }</span>
                                    <span class="px-2 py-1 text-xs rounded ${getRiscoColorClass(
                                      risco.nivel_risco
                                    )}">${risco.nivel_risco || "N/A"}</span>
                                </div>
                                
                                <label for="risco-descricao-${riscoIndex}" class="text-sm font-medium text-gray-600">Descrição do Risco:</label>
                                <textarea id="risco-descricao-${riscoIndex}" data-risco-index="${riscoIndex}" class="editable-risco-field readonly-content mt-1 block w-full p-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300" rows="3" disabled>${
                              risco.descricao || ""
                            }</textarea>
                                
                                <div class="text-xs text-gray-500 my-2">
                                    <span>Probabilidade: ${
                                      risco.probabilidade || "N/A"
                                    }</span> | 
                                    <span>Impacto: ${
                                      risco.impacto || "N/A"
                                    }</span> | 
                                    <span>Fase: ${
                                      risco.fase_projeto || "N/A"
                                    }</span>
                                </div>

                                ${
                                  (risco.acoes_mitigacao || []).length > 0
                                    ? `
                                    <div class="mt-3">
                                        <span class="text-sm font-medium text-gray-600">Ações de Mitigação:</span>
                                        <div id="acoes-mitigacao-container-${riscoIndex}" class="text-sm text-gray-600 mt-1 space-y-2">
                                            ${risco.acoes_mitigacao
                                              .map(
                                                (acao, acaoIndex) => `
                                                <div>
                                                    <label for="acao-mitigacao-${riscoIndex}-${acaoIndex}" class="text-xs font-medium text-gray-500">Ação (Responsável: ${
                                                  acao.responsavel || "N/A"
                                                }):</label>
                                                    <textarea id="acao-mitigacao-${riscoIndex}-${acaoIndex}" data-risco-index="${riscoIndex}" data-acao-index="${acaoIndex}" class="editable-risco-field readonly-content mt-1 block w-full p-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300" rows="2" disabled>${
                                                  acao.acao || ""
                                                }</textarea>
                                                </div>
                                            `
                                              )
                                              .join("")}
                                        </div>
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `
                : ""
            }

            ${
              (solucaoRisco.recomendacoes_gerais || []).length > 0
                ? `
                <div class="mb-4">
                    <h4 class="text-md font-medium text-gray-700 mb-2">Recomendações Gerais:</h4>
                    <div id="recomendacoes-gerais-container" class="space-y-2">
                        ${solucaoRisco.recomendacoes_gerais
                          .map(
                            (rec, recIndex) => `
                            <div>
                                <label for="recomendacao-geral-${recIndex}" class="text-xs font-medium text-gray-500">Recomendação ${
                              recIndex + 1
                            }:</label>
                                <textarea id="recomendacao-geral-${recIndex}" data-rec-index="${recIndex}" class="editable-risco-field readonly-content mt-1 block w-full p-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300" rows="2" disabled>${rec}</textarea>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `
                : ""
            }

            ${
              solucaoRisco.matriz_riscos
                ? `
                <div>
                    <h4 class="text-md font-medium text-gray-700 mb-2">Matriz de Riscos:</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        ${
                          solucaoRisco.matriz_riscos.riscos_criticos &&
                          solucaoRisco.matriz_riscos.riscos_criticos.length > 0
                            ? `
                            <div class="bg-red-50 p-2 rounded">
                                <span class="font-medium text-red-800">Críticos (${solucaoRisco.matriz_riscos.riscos_criticos.length})</span>
                            </div>
                        `
                            : ""
                        }
                        ${
                          solucaoRisco.matriz_riscos.riscos_altos &&
                          solucaoRisco.matriz_riscos.riscos_altos.length > 0
                            ? `
                            <div class="bg-orange-50 p-2 rounded">
                                <span class="font-medium text-orange-800">Altos (${solucaoRisco.matriz_riscos.riscos_altos.length})</span>
                            </div>
                        `
                            : ""
                        }
                        ${
                          solucaoRisco.matriz_riscos.riscos_medios &&
                          solucaoRisco.matriz_riscos.riscos_medios.length > 0
                            ? `
                            <div class="bg-yellow-50 p-2 rounded">
                                <span class="font-medium text-yellow-800">Médios (${solucaoRisco.matriz_riscos.riscos_medios.length})</span>
                            </div>
                        `
                            : ""
                        }
                        ${
                          solucaoRisco.matriz_riscos.riscos_baixos &&
                          solucaoRisco.matriz_riscos.riscos_baixos.length > 0
                            ? `
                            <div class="bg-green-50 p-2 rounded">
                                <span class="font-medium text-green-800">Baixos (${solucaoRisco.matriz_riscos.riscos_baixos.length})</span>
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>
            `
                : ""
            }
        `;

    container.appendChild(solucaoDiv);
  }

  // Função auxiliar para obter classes CSS baseadas no nível de risco
  function getRiscoColorClass(nivelRisco) {
    switch (nivelRisco?.toLowerCase()) {
      case "crítico":
      case "critico":
        return "bg-red-100 text-red-800";
      case "alto":
        return "bg-orange-100 text-orange-800";
      case "médio":
      case "medio":
        return "bg-yellow-100 text-yellow-800";
      case "baixo":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  // Função para extrair dados atuais do formulário
  function extrairDadosAtuais() {
    if (!currentPgrData) {
      console.error("Nenhum PGR carregado");
      return null;
    }

    const risco = JSON.parse(JSON.stringify(currentPgrData.risco || {})); // Deep copy

    // Atualizar campos editáveis
    const objeto =
      document.getElementById("objeto-contrato")?.value?.trim() || "";
    const resumoAnalise =
      document.getElementById("resumo-analise")?.value?.trim() || "";
    const metodologiaAplicada =
      document.getElementById("metodologia-aplicada")?.value?.trim() || "";

    const solucaoMenorRisco =
      document.getElementById("solucao-menor-risco")?.value?.trim() || "";
    const solucaoMaiorRisco =
      document.getElementById("solucao-maior-risco")?.value?.trim() || "";
    const recomendacaoFinal =
      document.getElementById("recomendacao-final")?.value?.trim() || "";

    const estruturaGovernanca =
      document.getElementById("estrutura-governanca")?.value?.trim() || "";
    const periodicidadeRevisao =
      document.getElementById("periodicidade-revisao")?.value?.trim() || "";

    // Extrair dados dos riscos e recomendações editáveis
    if (risco.riscos_identificados) {
      risco.riscos_identificados.forEach((riscoItem, riscoIndex) => {
        const descricaoTextarea = document.getElementById(
          `risco-descricao-${riscoIndex}`
        );
        if (descricaoTextarea) {
          riscoItem.descricao = descricaoTextarea.value;
        }

        if (riscoItem.acoes_mitigacao) {
          riscoItem.acoes_mitigacao.forEach((acaoItem, acaoIndex) => {
            const acaoTextarea = document.getElementById(
              `acao-mitigacao-${riscoIndex}-${acaoIndex}`
            );
            if (acaoTextarea) {
              acaoItem.acao = acaoTextarea.value;
            }
          });
        }
      });
    }

    if (risco.recomendacoes_gerais) {
      const recomendacoesContainer = document.getElementById(
        "recomendacoes-gerais-container"
      );
      if (recomendacoesContainer) {
        const textareas = recomendacoesContainer.querySelectorAll("textarea");
        const novasRecomendacoes = [];
        textareas.forEach((textarea) => {
          novasRecomendacoes.push(textarea.value);
        });
        risco.recomendacoes_gerais = novasRecomendacoes;
      }
    }

    // Montar o objeto de risco atualizado
    const riscoAtualizado = {
      ...risco,
      resumo_analise: resumoAnalise,
      metodologia_aplicada: metodologiaAplicada,
      analise_comparativa: {
        ...(risco.analise_comparativa || {}),
        solucao_menor_risco: solucaoMenorRisco,
        solucao_maior_risco: solucaoMaiorRisco,
        recomendacao_final: recomendacaoFinal,
      },
      plano_geral_riscos: {
        ...(risco.plano_geral_riscos || {}),
        estrutura_governanca: estruturaGovernanca,
        periodicidade_revisao: periodicidadeRevisao,
      },
    };

    return {
      objeto: objeto,
      risco: riscoAtualizado,
    };
  }

  // Função para validar campos obrigatórios
  function validarFormulario() {
    const dados = extrairDadosAtuais();
    if (!dados) return false;

    const erros = [];

    if (!dados.objeto) {
      erros.push("Objeto do contrato é obrigatório");
    }

    if (!dados.risco.resumo_analise) {
      erros.push("Resumo da análise é obrigatório");
    }

    if (!dados.risco.metodologia_aplicada) {
      erros.push("Metodologia aplicada é obrigatória");
    }

    if (erros.length > 0) {
      const mensagem = erros
        .map((erro, index) => `${index + 1}. ${erro}`)
        .join("\n");
      exibirAlerta("Campos Obrigatórios Não Preenchidos", mensagem, "error");
      return false;
    }

    return true;
  }

  // Event listeners para botões de editar
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const targetElement = document.getElementById(targetId);

      if (!targetElement) {
        console.warn(`Elemento com ID ${targetId} não encontrado`);
        return;
      }

      const isCurrentlyDisabled = targetElement.disabled;

      if (isCurrentlyDisabled) {
        // Habilitar edição
        targetElement.disabled = false;
        targetElement.focus();
        targetElement.classList.remove("editable-content:disabled");
        this.innerHTML = '<i class="las la-save mr-1"></i>Salvar';
      } else {
        // Desabilitar edição
        targetElement.disabled = true;
        targetElement.classList.add("editable-content:disabled");
        this.innerHTML = '<i class="las la-edit mr-1"></i>Editar';
      }
    });
  });

  // Event listener específico para editar riscos
  const botaoEditarRiscos = document.getElementById("btn-edit-riscos");
  if (botaoEditarRiscos) {
    botaoEditarRiscos.addEventListener("click", function () {
      const camposEditaveis = document.querySelectorAll(
        ".editable-risco-field"
      );

      if (camposEditaveis.length === 0) {
        console.warn("Nenhum campo editável encontrado na seção de riscos");
        return;
      }

      // Verificar o estado atual (usando o primeiro campo como referência)
      const isCurrentlyDisabled = camposEditaveis[0].disabled !== false;

      if (isCurrentlyDisabled) {
        // Habilitar edição para todos os campos
        camposEditaveis.forEach((campo) => {
          campo.disabled = false;
          campo.classList.remove("readonly-content");
          campo.classList.add("focus:ring-primary", "focus:border-primary");
        });

        // Focar no primeiro campo
        if (camposEditaveis[0]) {
          camposEditaveis[0].focus();
        }

        this.innerHTML = '<i class="las la-save mr-1"></i>Salvar';
      } else {
        // Desabilitar edição para todos os campos
        camposEditaveis.forEach((campo) => {
          campo.disabled = true;
          campo.classList.add("readonly-content");
          campo.classList.remove(
            "focus:ring-primary",
            "focus:border-primary"
          );
        });

        this.innerHTML = '<i class="las la-edit mr-1"></i>Editar';
      }
    });
  }

  // Event listener para salvar alterações
  const botaoSalvarAlteracoes = document.getElementById(
    "btn-salvar-alteracoes"
  );
  if (botaoSalvarAlteracoes) {
    botaoSalvarAlteracoes.addEventListener("click", async function (e) {
      e.preventDefault();

      if (!validarFormulario()) {
        return;
      }

      if (!currentPgrData) {
        exibirAlerta("Erro", "Nenhum PGR selecionado para salvar.", "error");
        return;
      }

      const dados = extrairDadosAtuais();
      console.log("Dados para salvar:", dados);

      // Mostrar loading
      botaoSalvarAlteracoes.disabled = true;
      botaoSalvarAlteracoes.innerHTML =
        '<i class="las la-spinner la-spin text-lg mr-2"></i>Salvando...';

      try {
        const response = await fazerRequisicaoAutenticada(
          `/projetos/${projectId}/pgr/${currentPgrData.id_pgr}`,
          {
            method: "PATCH",
            body: JSON.stringify(dados),
          }
        );

        if (response.ok) {
          const pgrAtualizado = await response.json();
          console.log("PGR atualizado com sucesso:", pgrAtualizado);

          // Atualizar dados locais
          currentPgrData = { ...currentPgrData, ...dados };
          window.pgrData[currentPgrIndex] = currentPgrData;

          exibirAlerta(
            "Alterações Salvas com Sucesso!",
            "Todas as alterações foram salvas no banco de dados!",
            "success"
          );
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Erro na resposta da API:", response.status, errorData);

          if (response.status === 401) {
            exibirAlerta(
              "Erro de Autenticação",
              "Você não está autenticado. Por favor, faça login novamente.",
              "error"
            );
          } else if (response.status === 403) {
            exibirAlerta(
              "Erro de Permissão",
              "Você não tem permissão para editar este PGR.",
              "error"
            );
          } else {
            exibirAlerta(
              "Erro ao Salvar",
              `Erro ${response.status}: ${
                errorData.detail || "Erro ao salvar no banco."
              }`,
              "error"
            );
          }
        }
      } catch (error) {
        console.error("Erro ao salvar PGR:", error);
        exibirAlerta(
          "Erro de Conexão",
          "Não foi possível conectar com o servidor. Verifique sua conexão e tente novamente.",
          "error"
        );
      } finally {
        // Restaurar botão
        botaoSalvarAlteracoes.disabled = false;
        botaoSalvarAlteracoes.innerHTML =
          '<i class="las la-save text-lg mr-2"></i>Salvar alterações';
      }
    });
  }

  // Inicializar a interface
  inicializarSeletorPGR();

  // Exportar funções para uso global
  window.extrairDadosAtuais = extrairDadosAtuais;
  window.validarFormulario = validarFormulario;
  window.carregarPGR = carregarPGR;
});
