document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 ETP Curadoria carregado");

  const resultadoKeyMap = {
    // Quantitativos
    redução_custos: "Redução de custos",
    aumento_receita: "Aumento de receita",
    aumento_produtividade: "Aumento de produtividade",
    reducao_tempo_ciclo: "Redução do tempo de ciclo",
    aumento_market_share: "Aumento de market share",
    reducao_taxa_erro: "Redução da taxa de erro",
    tempo_execucao: "Tempo de execução",

    // Qualitativos
    eficiencia_operacional: "Eficiência operacional",
    satisfacao_usuarios: "Satisfação dos usuários",
    melhoria_servicos: "Melhoria na qualidade dos serviços",
    reducao_riscos: "Redução de riscos",
    conformidade_legal: "Conformidade legal",
    inovacao_tecnologica: "Inovação tecnológica",
    sustentabilidade_ambiental: "Sustentabilidade ambiental",
    melhora_imagem_organizacao: "Melhora na imagem da organização",
    acessibilidade: "Acessibilidade",
    seguranca_informacao: "Segurança da informação",
    resiliencia_operacional: "Resiliência operacional",
    escalabilidade: "Escalabilidade",
    interoperabilidade: "Interoperabilidade",
    usabilidade: "Usabilidade",
    transparencia: "Transparência",
    participacao_cidada: "Participação cidadã",
    satisfacao_servidores: "Satisfação dos servidores",
  };

  const reverseResultadoKeyMap = Object.fromEntries(
    Object.entries(resultadoKeyMap).map(([key, value]) => [value, key])
  );

  let currentEtpData = null; // Variável para armazenar os dados do ETP carregados

  // Função para obter o ID do projeto da URL
  function getProjectIdFromUrl() {
    const url = window.location.pathname;
    const match = url.match(/\/projetos\/(\d+)/);
    return match ? match[1] : null;
  }

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
      getCookie("access_token") ||
      getCookie("token") ||
      getCookie("auth_token");

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

  // Função para mostrar status
  function showStatus(message, type = "info") {
    const statusContainer = document.getElementById("status-container");
    const icons = {
      info: "las la-info-circle",
      success: "las la-check-circle",
      error: "las la-exclamation-triangle",
      loading: "las la-spinner la-spin",
    };

    const colors = {
      info: "blue",
      success: "green",
      error: "red",
      loading: "blue",
    };

    const color = colors[type] || "blue";
    const icon = icons[type] || icons["info"];

    statusContainer.innerHTML = `
            <div class="bg-${color}-50 border border-${color}-200 rounded-lg p-4">
                <div class="flex items-center">
                    <i class="${icon} text-${color}-600 text-2xl mr-3"></i>
                    <p class="text-${color}-800">${message}</p>
                </div>
            </div>
        `;
  }

  // Função para ocultar status e mostrar conteúdo
  function hideStatusAndShowContent() {
    const statusContainer = document.getElementById("status-container");
    const etpContent = document.getElementById("etp-content");
    const actionButtons = document.getElementById("action-buttons");

    statusContainer.style.display = "none";
    etpContent.style.display = "block";
    actionButtons.style.display = "block";
  }

  // Função para carregar dados do ETP
  async function carregarDadosETP() {
    const projectId = getProjectIdFromUrl();

    if (!projectId) {
      showStatus("ID do projeto não encontrado na URL", "error");
      return;
    }

    try {
      showStatus("Carregando dados do ETP...", "loading");

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
          throw new Error(
            "ETP não encontrado para este projeto. Certifique-se de que foi criado corretamente."
          );
        } else if (response.status === 401) {
          throw new Error(
            "Você não está autenticado. Por favor, faça login novamente."
          );
        } else if (response.status === 403) {
          throw new Error("Você não tem permissão para visualizar este ETP.");
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Erro ${response.status}: ${
              errorData.detail || "Erro ao buscar ETP"
            }`
          );
        }
      }

      const etpList = await response.json();
      console.log("ETPs carregados:", etpList);

      if (!etpList || etpList.length === 0) {
        throw new Error("Nenhum ETP encontrado para este projeto.");
      }

      // Pegar o primeiro ETP (mais recente)
      const etpData = etpList[0];

      currentEtpData = etpData; // Armazenar os dados do ETP carregados

      // Preencher os campos do formulário
      preencherFormularioETP(etpData);

      hideStatusAndShowContent();
      showStatus("ETP carregado com sucesso!", "success");

      // Esconder status após 3 segundos
      setTimeout(() => {
        const statusContainer = document.getElementById("status-container");
        statusContainer.style.display = "none";
      }, 3000);
    } catch (error) {
      console.error("Erro ao carregar ETP:", error);
      showStatus(`Erro ao carregar ETP: ${error.message}`, "error");
    }
  }

  // Função para preencher o formulário com dados do ETP
  function preencherFormularioETP(etpData) {
    console.log("Preenchendo formulário com dados:", etpData);

    // Campos de texto simples
    const camposTexto = {
      "unidade-demandante": etpData.unidade_demandante || "",
      "objeto-contratado": etpData.objeto_contratado || "",
      "necessidade-contratacao": etpData.necessidade_contratacao || "",
      solucao: etpData.solucao || "",
      "valor-total": etpData.valor_total || "",
      "justif-posic-conclusivo": etpData.justif_posic_conclusivo || "",
      "equipe-de-planejamento": etpData.equipe_de_planejamento || "",
      "just-nao-parc": etpData.just_nao_parc || "",
    };

    Object.entries(camposTexto).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        elemento.value = valor;
      }
    });

    // Sistema de Registro de Preços
    if (etpData.sist_reg_preco !== undefined) {
      const srpSim = document.getElementById("srp-sim");
      const srpNao = document.getElementById("srp-nao");

      if (etpData.sist_reg_preco) {
        if (srpSim) srpSim.checked = true;
      } else {
        if (srpNao) srpNao.checked = true;
      }
    }

    // Posição Conclusiva
    if (etpData.posic_conclusivo !== undefined) {
      const posFavoravel = document.getElementById("pos-favoravel");
      const posContraria = document.getElementById("pos-contraria");

      if (etpData.posic_conclusivo) {
        if (posFavoravel) posFavoravel.checked = true;
      } else {
        if (posContraria) posContraria.checked = true;
      }
    }

    // Alinhamento Estratégico
    preencherAlinhamentoEstrategico(etpData.alinhamento_estrategico || []);

    // Requisitos de Contratação
    preencherRequisitos(etpData.req_contratacao || []);

    // Levantamento de Mercado
    preencherLevantamentoMercado(etpData.lev_mercado || {});

    // Demonstração de Resultados
    preencherDemonstracaoResultados(etpData.demonst_resultados || {});

    // Caracterização de Serviços ou Fornecimentos Contínuos
    if (etpData.serv_continuo !== undefined) {
      const servContinuoSim = document.getElementById("serv-continuo-sim");
      const servContinuoNao = document.getElementById("serv-continuo-nao");
      const justifContainer = document.getElementById(
        "justificativa-serv-continuo-container"
      );
      const justifTextarea = document.getElementById("justif-serv-continuo");

      if (etpData.serv_continuo) {
        if (servContinuoSim) servContinuoSim.checked = true;
        if (justifContainer) justifContainer.style.display = "block";
      } else {
        if (servContinuoNao) servContinuoNao.checked = true;
        if (justifContainer) justifContainer.style.display = "none";
      }

      if (justifTextarea) {
        justifTextarea.value = etpData.justif_serv_continuo || "";
      }
    }
  }

  // Função para preencher demonstração de resultados
  function preencherDemonstracaoResultados(demonstracao) {
    const resultadosQuantitativos = document.getElementById(
      "resultados-quantitativos"
    );
    const resultadosQualitativos = document.getElementById(
      "resultados-qualitativos"
    );
    const indicadoresDesempenho = document.getElementById(
      "indicadores-desempenho"
    );
    const prazoResultados = document.getElementById("prazo-resultados");

    if (resultadosQuantitativos) {
      let quantText = "";
      if (demonstracao.resultados_quantitativos) {
        quantText = Object.entries(demonstracao.resultados_quantitativos)
          .map(([key, value]) => `${resultadoKeyMap[key] || key}: ${value}`)
          .join("\n");
      }
      resultadosQuantitativos.value = quantText;
    }

    if (resultadosQualitativos) {
      let qualText = "";
      if (demonstracao.resultados_qualitativos) {
        qualText = Object.entries(demonstracao.resultados_qualitativos)
          .map(([key, value]) => `${resultadoKeyMap[key] || key}: ${value}`)
          .join("\n");
      }
      resultadosQualitativos.value = qualText;
    }

    if (indicadoresDesempenho) {
      indicadoresDesempenho.value = (
        demonstracao.indicadores_desempenho || []
      ).join("\n");
    }

    if (prazoResultados) {
      prazoResultados.value = demonstracao.prazo_resultados || "";
    }
  }

  // Função para preencher alinhamento estratégico
  function preencherAlinhamentoEstrategico(alinhamentos) {
    const container = document.getElementById(
      "alinhamento-estrategico-container"
    );
    if (!container) return;

    container.innerHTML = "";

    if (alinhamentos.length === 0) {
      // Criar um campo vazio para permitir adição
      criarLinhaAlinhamento("");
      return;
    }

    alinhamentos.forEach((alinhamento) => {
      criarLinhaAlinhamento(alinhamento);
    });
  }

  // Função para criar linha de alinhamento estratégico
  function criarLinhaAlinhamento(alinhamento = "") {
    const container = document.getElementById(
      "alinhamento-estrategico-container"
    );
    const div = document.createElement("div");
    div.className =
      "flex items-center gap-3 p-2 border rounded-md alinhamento-row";

    const input = document.createElement("input");
    input.type = "text";
    input.value = alinhamento;
    input.placeholder = "Alinhamento estratégico";
    input.className =
      "flex-grow p-2 border-gray-300 border rounded-md alinhamento-input";
    input.disabled = false; // Habilitado por padrão

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className =
      "text-red-500 hover:text-red-700 remove-alinhamento-btn";
    removeBtn.innerHTML = '<i class="las la-trash-alt text-xl"></i>';
    removeBtn.style.display = "block"; // Visível por padrão

    removeBtn.onclick = () => {
      div.remove();
    };

    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);
  }

  // Função para preencher requisitos
  function preencherRequisitos(requisitos) {
    const container = document.getElementById("requisitos-container");
    if (!container) return;

    container.innerHTML = "";

    if (requisitos.length === 0) {
      // Criar um requisito vazio
      criarLinhaRequisito("");
      return;
    }

    requisitos.forEach((requisito) => {
      criarLinhaRequisito(requisito);
    });
  }

  // Função para criar linha de requisito
  function criarLinhaRequisito(requisito = "") {
    const container = document.getElementById("requisitos-container");
    const div = document.createElement("div");
    div.className =
      "flex items-center gap-3 p-2 border rounded-md requisito-row";

    const input = document.createElement("input");
    input.type = "text";
    input.value = requisito;
    input.placeholder = "Requisito para contratação";
    input.className =
      "flex-grow p-2 border-gray-300 border rounded-md requisito-input";
    input.disabled = false; // Habilitado por padrão

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className =
      "text-red-500 hover:text-red-700 remove-requisito-btn";
    removeBtn.innerHTML = '<i class="las la-trash-alt text-xl"></i>';
    removeBtn.style.display = "block"; // Visível por padrão

    removeBtn.onclick = () => {
      const totalRows = container.querySelectorAll(".requisito-row").length;
      if (totalRows > 1) {
        div.remove();
      } else {
        alert("É necessário manter pelo menos um requisito.");
      }
    };

    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);
  }

  // Função para preencher levantamento de mercado
  function preencherLevantamentoMercado(levMercado) {
    const pesquisaMercado = document.getElementById("pesquisa-mercado");
    const precoMedio = document.getElementById("preco-medio");
    const observacoesMercado = document.getElementById("observacoes-mercado");
    const variacaoPercentual = document.getElementById("variacao-percentual");
    const dataPesquisa = document.getElementById("data-pesquisa");

    if (pesquisaMercado)
      pesquisaMercado.value = levMercado.pesquisa_mercado || "";
    if (precoMedio) precoMedio.value = levMercado.preco_medio || "";
    if (observacoesMercado)
      observacoesMercado.value = levMercado.observacoes || "";
    if (variacaoPercentual) {
      variacaoPercentual.value = levMercado.variacao_percentual ?? "";
    }
    if (dataPesquisa) {
      let dateValue = levMercado.data_pesquisa || "";
      if (typeof dateValue === "string" && dateValue.includes("T")) {
        dateValue = dateValue.split("T")[0];
      }
      dataPesquisa.value = dateValue;
    }
  }

  // Event listener para botões de edição
  document.addEventListener("click", function (e) {
    if (e.target.closest(".edit-btn")) {
      e.preventDefault();
      const button = e.target.closest(".edit-btn");
      const targetId = button.getAttribute("data-target");
      // For "lev-mercado", the targetId refers to the container, not an input.
      // We need to check the disabled status of one of the inputs within the container.
      let isCurrentlyDisabled;
      if (targetId === "lev-mercado") {
        const pesquisaMercado = document.getElementById("pesquisa-mercado");
        isCurrentlyDisabled = pesquisaMercado ? pesquisaMercado.disabled : true; // Assume disabled if element not found
      } else if (targetId === "posic-conclusivo") {
        const justifPosic = document.getElementById("justif-posic-conclusivo");
        isCurrentlyDisabled = justifPosic ? justifPosic.disabled : true;
      } else if (targetId === "demonstracao-resultados") {
        const resultadosQuantitativos = document.getElementById(
          "resultados-quantitativos"
        );
        isCurrentlyDisabled = resultadosQuantitativos
          ? resultadosQuantitativos.disabled
          : true;
      } else {
        const targetElement = document.getElementById(targetId);
        if (!targetElement) {
          console.warn(`Elemento com ID ${targetId} não encontrado`);
          return;
        }
        isCurrentlyDisabled = targetElement.disabled;
      }

      if (isCurrentlyDisabled) {
        // Habilitar edição
        habilitarEdicao(targetId, button);
      } else {
        // Desabilitar edição
        desabilitarEdicao(targetId, button);
      }
    }
  });

  // Função para habilitar edição
  function habilitarEdicao(targetId, button) {
    const targetElement = document.getElementById(targetId);

    if (targetId === "sist-reg-preco") {
      // Sistema de Registro de Preços (radio buttons)
      const srpSim = document.getElementById("srp-sim");
      const srpNao = document.getElementById("srp-nao");
      if (srpSim) srpSim.disabled = false;
      if (srpNao) srpNao.disabled = false;
    } else if (targetId === "posic-conclusivo") {
      // Posição Conclusiva (radio buttons)
      const posFavoravel = document.getElementById("pos-favoravel");
      const posContraria = document.getElementById("pos-contraria");
      const justifPosic = document.getElementById("justif-posic-conclusivo");
      // Radio buttons should always be enabled, so no action needed here.
      // if (posFavoravel) {
      //   posFavoravel.disabled = false;
      //   posFavoravel.classList.remove("editable-content:disabled");
      // }
      // if (posContraria) {
      //   posContraria.disabled = false;
      //   posContraria.classList.remove("editable-content:disabled");
      // }
      if (justifPosic) {
        justifPosic.disabled = false;
        justifPosic.focus();
        justifPosic.classList.remove("editable-content:disabled");
      }
    } else if (targetId === "lev-mercado") {
      // Levantamento de mercado
      const pesquisaMercado = document.getElementById("pesquisa-mercado");
      const precoMedio = document.getElementById("preco-medio");
      const observacoesMercado = document.getElementById("observacoes-mercado");
      const variacaoPercentual = document.getElementById("variacao-percentual");
      const dataPesquisa = document.getElementById("data-pesquisa");
      if (pesquisaMercado) {
        pesquisaMercado.disabled = false;
        pesquisaMercado.focus();
        pesquisaMercado.classList.remove("editable-content:disabled");
      }
      if (precoMedio) {
        precoMedio.disabled = false;
        precoMedio.classList.remove("editable-content:disabled");
      }
      if (observacoesMercado) {
        observacoesMercado.disabled = false;
        observacoesMercado.classList.remove("editable-content:disabled");
      }
      if (variacaoPercentual) {
        variacaoPercentual.disabled = false;
        variacaoPercentual.classList.remove("editable-content:disabled");
      }
      if (dataPesquisa) {
        dataPesquisa.disabled = false;
        dataPesquisa.classList.remove("editable-content:disabled");
      }
    } else if (targetId === "demonstracao-resultados") {
      const quant = document.getElementById("resultados-quantitativos");
      const qual = document.getElementById("resultados-qualitativos");
      const ind = document.getElementById("indicadores-desempenho");
      const prazo = document.getElementById("prazo-resultados");
      if (quant) {
        quant.disabled = false;
        quant.classList.remove("editable-content:disabled");
        quant.focus();
      }
      if (qual) {
        qual.disabled = false;
        qual.classList.remove("editable-content:disabled");
      }
      if (ind) {
        ind.disabled = false;
        ind.classList.remove("editable-content:disabled");
      }
      if (prazo) {
        prazo.disabled = false;
        prazo.classList.remove("editable-content:disabled");
      }
    } else {
      // Campo normal
      targetElement.disabled = false;
      targetElement.focus();
      targetElement.classList.remove("editable-content:disabled");
    }

    button.innerHTML = '<i class="las la-save mr-1"></i>Salvar';
  }

  // Função para desabilitar edição
  function desabilitarEdicao(targetId, button) {
    const targetElement = document.getElementById(targetId);

    if (targetId === "sist-reg-preco") {
      // Sistema de Registro de Preços (radio buttons)
      const srpSim = document.getElementById("srp-sim");
      const srpNao = document.getElementById("srp-nao");
      if (srpSim) srpSim.disabled = true;
      if (srpNao) srpNao.disabled = true;
    } else if (targetId === "posic-conclusivo") {
      // Posição Conclusiva (radio buttons)
      const posFavoravel = document.getElementById("pos-favoravel");
      const posContraria = document.getElementById("pos-contraria");
      const justifPosic = document.getElementById("justif-posic-conclusivo");
      // Radio buttons should always be enabled, so no action needed here.
      // if (posFavoravel) {
      //   posFavoravel.disabled = true;
      //   posFavoravel.classList.add("editable-content:disabled");
      // }
      // if (posContraria) {
      //   posContraria.disabled = true;
      //   posContraria.classList.add("editable-content:disabled");
      // }
      if (justifPosic) {
        justifPosic.disabled = true;
        justifPosic.classList.add("editable-content:disabled");
      }
    } else if (targetId === "lev-mercado") {
      // Levantamento de mercado
      const pesquisaMercado = document.getElementById("pesquisa-mercado");
      const precoMedio = document.getElementById("preco-medio");
      const observacoesMercado = document.getElementById("observacoes-mercado");
      const variacaoPercentual = document.getElementById("variacao-percentual");
      const dataPesquisa = document.getElementById("data-pesquisa");
      if (pesquisaMercado) {
        pesquisaMercado.disabled = true;
        pesquisaMercado.classList.add("editable-content:disabled");
      }
      if (precoMedio) {
        precoMedio.disabled = true;
        precoMedio.classList.add("editable-content:disabled");
      }
      if (observacoesMercado) {
        observacoesMercado.disabled = true;
        observacoesMercado.classList.add("editable-content:disabled");
      }
      if (variacaoPercentual) {
        variacaoPercentual.disabled = true;
        variacaoPercentual.classList.add("editable-content:disabled");
      }
      if (dataPesquisa) {
        dataPesquisa.disabled = true;
        dataPesquisa.classList.add("editable-content:disabled");
      }
    } else if (targetId === "demonstracao-resultados") {
      const quant = document.getElementById("resultados-quantitativos");
      const qual = document.getElementById("resultados-qualitativos");
      const ind = document.getElementById("indicadores-desempenho");
      const prazo = document.getElementById("prazo-resultados");
      if (quant) {
        quant.disabled = true;
        quant.classList.add("editable-content:disabled");
      }
      if (qual) {
        qual.disabled = true;
        qual.classList.add("editable-content:disabled");
      }
      if (ind) {
        ind.disabled = true;
        ind.classList.add("editable-content:disabled");
      }
      if (prazo) {
        prazo.disabled = true;
        prazo.classList.add("editable-content:disabled");
      }
    } else {
      // Campo normal
      targetElement.disabled = true;
      targetElement.classList.add("editable-content:disabled");
    }

    button.innerHTML = '<i class="las la-edit mr-1"></i>Editar';
  }

  // Event listener para adicionar requisito
  const addRequisitoBtn = document.getElementById("add-requisito-btn");
  if (addRequisitoBtn) {
    addRequisitoBtn.addEventListener("click", () => {
      criarLinhaRequisito();
    });
  }

  // Event listener para adicionar alinhamento estratégico
  const addAlinhamentoBtn = document.getElementById("add-alinhamento-btn");
  if (addAlinhamentoBtn) {
    addAlinhamentoBtn.addEventListener("click", () => {
      criarLinhaAlinhamento();
    });
  }

  // Event listener para os radio buttons de serviço contínuo
  document.querySelectorAll('input[name="serv_continuo"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      const justifContainer = document.getElementById(
        "justificativa-serv-continuo-container"
      );
      const justifTextarea = document.getElementById("justif-serv-continuo");
      if (this.value === "true") {
        justifContainer.style.display = "block";
        if (justifTextarea) justifTextarea.disabled = false;
      } else {
        justifContainer.style.display = "none";
        if (justifTextarea) justifTextarea.disabled = true;
      }
    });
  });

  // Função para extrair dados do formulário
  function extrairDadosFormulario() {
    const dados = {};

    // Campos de texto simples
    const camposTexto = {
      unidade_demandante: "unidade-demandante",
      objeto_contratado: "objeto-contratado",
      necessidade_contratacao: "necessidade-contratacao",
      solucao: "solucao",
      valor_total: "valor-total",
      justif_posic_conclusivo: "justif-posic-conclusivo",
      equipe_de_planejamento: "equipe-de-planejamento",
      just_nao_parc: "just-nao-parc",
    };

    Object.entries(camposTexto).forEach(([key, id]) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        dados[key] = elemento.value.trim();
      }
    });

    // Sistema de Registro de Preços
    const srpSim = document.getElementById("srp-sim");
    if (srpSim) {
      dados.sist_reg_preco = srpSim.checked;
    }

    // Posição Conclusiva
    const posFavoravel = document.getElementById("pos-favoravel");
    if (posFavoravel) {
      dados.posic_conclusivo = posFavoravel.checked;
    }

    // Alinhamento Estratégico
    const alinhamentoInputs = document.querySelectorAll(".alinhamento-input");
    dados.alinhamento_estrategico = Array.from(alinhamentoInputs)
      .map((input) => input.value.trim())
      .filter((value) => value.length > 0);

    // Requisitos de Contratação
    const requisitoInputs = document.querySelectorAll(".requisito-input");
    dados.req_contratacao = Array.from(requisitoInputs)
      .map((input) => input.value.trim())
      .filter((value) => value.length > 0);

    // Levantamento de Mercado
    const pesquisaMercado = document.getElementById("pesquisa-mercado");
    const precoMedio = document.getElementById("preco-medio");
    const observacoesMercado = document.getElementById("observacoes-mercado");
    const variacaoPercentual = document.getElementById("variacao-percentual");
    const dataPesquisa = document.getElementById("data-pesquisa");

    dados.lev_mercado = {
      pesquisa_mercado: pesquisaMercado ? pesquisaMercado.value.trim() : "",
      preco_medio: precoMedio ? parseFloat(precoMedio.value) || 0 : 0,
      observacoes: observacoesMercado ? observacoesMercado.value.trim() : "",
      variacao_percentual: variacaoPercentual
        ? parseFloat(variacaoPercentual.value) || 0
        : 0,
      data_pesquisa: dataPesquisa ? dataPesquisa.value : "",
      fontes: (currentEtpData && currentEtpData.lev_mercado && currentEtpData.lev_mercado.fontes)
        ? currentEtpData.lev_mercado.fontes
    : {},
    };

    // Demonstração de Resultados
    const resultadosQuantitativos = document.getElementById(
      "resultados-quantitativos"
    );
    const resultadosQualitativos = document.getElementById(
      "resultados-qualitativos"
    );
    const indicadoresDesempenho = document.getElementById(
      "indicadores-desempenho"
    );
    const prazoResultados = document.getElementById("prazo-resultados");

    const quantObj = {};
    if (resultadosQuantitativos && resultadosQuantitativos.value) {
      resultadosQuantitativos.value.split("\n").forEach((line) => {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(":").trim();
          if (key) quantObj[key] = value;
        }
      });
    }

    const qualObj = {};
    if (resultadosQualitativos && resultadosQualitativos.value) {
      resultadosQualitativos.value.split("\n").forEach((line) => {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const displayName = parts[0].trim();
          const value = parts.slice(1).join(":").trim();
          const key = reverseResultadoKeyMap[displayName] || displayName;
          if (key) qualObj[key] = value;
        }
      });
    }

    const indicadores = indicadoresDesempenho
      ? indicadoresDesempenho.value
          .split("\n")
          .filter((line) => line.trim() !== "")
      : [];
    const prazo = prazoResultados ? prazoResultados.value.trim() : "";

    dados.demonst_resultados = {
      resultados_quantitativos: quantObj,
      resultados_qualitativos: qualObj,
      indicadores_desempenho: indicadores,
      prazo_resultados: prazo,
    };

    // Caracterização de Serviços ou Fornecimentos Contínuos
    const servContinuoSim = document.getElementById("serv-continuo-sim");
    if (servContinuoSim) {
      dados.serv_continuo = servContinuoSim.checked;
    }
    const justifServContinuo = document.getElementById("justif-serv-continuo");
    if (justifServContinuo) {
      dados.justif_serv_continuo = justifServContinuo.value.trim();
    }

    return dados;
  }

  // Event listener para salvar alterações
  const saveChangesBtn = document.getElementById("save-changes-btn");
  if (saveChangesBtn) {
    saveChangesBtn.addEventListener("click", async function (e) {
      e.preventDefault();

      const projectId = getProjectIdFromUrl();
      if (!projectId) {
        alert("ID do projeto não encontrado na URL");
        return;
      }

      try {
        // Extrair dados do formulário
        const dados = extrairDadosFormulario();
        console.log("Dados extraídos para salvamento:", dados);

        // --- INÍCIO: Nova Validação para Requisitos ---
        if (!dados.req_contratacao || dados.req_contratacao.length === 0) {
          alert("É obrigatório preencher ao menos um Requisito para Contratação.");
          saveChangesBtn.disabled = false; // Reabilitar o botão
          saveChangesBtn.innerHTML =
            '<i class="las la-save text-lg mr-2"></i>Salvar alterações'; // Restaurar o texto do botão
          return; // Interromper o processo de salvamento
        }
        // --- FIM: Nova Validação para Requisitos ---

        // --- INÍCIO: Nova Validação para Justificativa de Não Parcelamento ---
        if (!dados.just_nao_parc || dados.just_nao_parc.trim().length === 0) {
          alert("É obrigatório preencher a Justificativa para o parcelamento ou não da contratação.");
          saveChangesBtn.disabled = false;
          saveChangesBtn.innerHTML =
            '<i class="las la-save text-lg mr-2"></i>Salvar alterações';
          return;
        }
        // --- FIM: Nova Validação para Justificativa de Não Parcelamento ---

        // Mostrar loading
        saveChangesBtn.disabled = true;
        saveChangesBtn.innerHTML =
          '<i class="las la-spinner la-spin text-lg mr-2"></i>Salvando...';

        // Buscar o ID do ETP atual
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
          throw new Error("Erro ao buscar ETP para atualização");
        }

        const etpList = await response.json();
        if (!etpList || etpList.length === 0) {
          throw new Error("Nenhum ETP encontrado para atualizar");
        }

        const etpId = etpList[0].id;

        // Fazer a requisição de atualização
        const updateResponse = await fazerRequisicaoAutenticada(
          `/projetos/${projectId}/etp/${etpId}`,
          {
            method: "PATCH",
            headers: {
              "remote-user": "user.test",
              "remote-groups": "TI,OUTROS",
            },
            body: JSON.stringify(dados),
          }
        );

        if (updateResponse.ok) {
          const etpAtualizado = await updateResponse.json();
          console.log("ETP atualizado com sucesso:", etpAtualizado);

          alert(
            "✅ Alterações salvas com sucesso!\n\nRedirecionando para a página de visualização..."
          );

          // Redirecionar para a página de visualização
          setTimeout(() => {
            window.location.href = window.location.href.replace(
              "confere_etp",
              "visualizacao_etp"
            );
          }, 1000);
        } else {
          const errorData = await updateResponse.json().catch(() => ({}));
          console.error(
            "Erro na resposta da API:",
            updateResponse.status,
            errorData
          );

          if (updateResponse.status === 401) {
            alert(
              "❌ Erro de Autenticação\n\nVocê não está autenticado. Por favor, faça login novamente."
            );
          } else if (updateResponse.status === 403) {
            alert(
              "❌ Erro de Permissão\n\nVocê não tem permissão para editar este ETP."
            );
          } else {
            alert(
              `❌ Erro ao Salvar\n\nErro ${updateResponse.status}: ${
                errorData.detail || "Erro ao salvar no banco."
              }`
            );
          }
        }
      } catch (error) {
        console.error("Erro ao salvar alterações:", error);
        alert(
          `❌ Erro de Conexão\n\n${error.message}\n\nVerifique sua conexão e tente novamente.`
        );
      } finally {
        // Restaurar botão
        saveChangesBtn.disabled = false;
        saveChangesBtn.innerHTML =
          '<i class="las la-save text-lg mr-2"></i>Salvar alterações';
      }
    });
  }

  // Carregar dados do ETP ao inicializar
  carregarDadosETP();

  console.log("✅ ETP Curadoria inicializado com sucesso");
});
