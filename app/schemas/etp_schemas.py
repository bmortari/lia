from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime


class ETPCreate(BaseModel):
    """
    Schema para criação de ETP
    """
    prompt_usuario: str = Field(..., description="Prompt do usuário para guiar a geração do ETP")
    parametros_etp: Optional[Dict[str, Any]] = Field(default=None, description="Parâmetros adicionais para geração")


class LevantamentoMercado(BaseModel):
    """
    Schema para estrutura do levantamento de mercado
    """
    pesquisa_mercado: str = Field(..., description="Descrição da pesquisa realizada")
    preco_medio: float = Field(..., description="Preço médio encontrado")
    variacao_percentual: float = Field(..., description="Variação percentual entre preços")
    fontes: List[str] = Field(default_factory=list, description="Fontes consultadas")
    data_pesquisa: Optional[str] = Field(None, description="Data da pesquisa")
    observacoes: Optional[str] = Field(None, description="Observações sobre a pesquisa")


class QuantidadeEstimada(BaseModel):
    """
    Schema para estrutura de quantidade estimada
    """
    item_principal: Dict[str, Any] = Field(..., description="Item principal com quantidade e valor")
    itens_adicionais: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Itens adicionais se houver")
    total_estimado: Optional[float] = Field(None, description="Total estimado da contratação")
    criterios_dimensionamento: Optional[str] = Field(None, description="Critérios utilizados para dimensionamento")


class DemonstracaoResultados(BaseModel):
    """
    Schema para demonstração de resultados esperados
    """
    resultados_quantitativos: Dict[str, Any] = Field(..., description="Resultados mensuráveis esperados")
    resultados_qualitativos: Dict[str, str] = Field(..., description="Resultados qualitativos esperados")
    indicadores_desempenho: Optional[List[str]] = Field(default_factory=list, description="Indicadores de desempenho")
    prazo_resultados: Optional[str] = Field(None, description="Prazo para obtenção dos resultados")


class ProvidenciasETP(BaseModel):
    """
    Schema para providências necessárias
    """
    pre_contratacao: List[str] = Field(..., description="Providências antes da contratação")
    durante_execucao: List[str] = Field(..., description="Providências durante execução")
    pos_contratacao: Optional[List[str]] = Field(default_factory=list, description="Providências pós-contratação")
    responsaveis: Optional[Dict[str, str]] = Field(default_factory=dict, description="Responsáveis por cada providência")


class ETPRead(BaseModel):
    """
    Schema para leitura de ETP
    """
    id: int
    id_projeto: int
    user_created: str
    data_created: datetime
    unidade_demandante: Optional[str] = None
    objeto_contratado: Optional[str] = None
    sist_reg_preco: bool
    necessidade_contratacao: Optional[str] = None
    alinhamento_estrategico: List[str] = Field(default_factory=list)
    info_contratacao: Optional[str] = None
    previsto_pca: bool
    item: int
    req_contratacao: List[str] = Field(default_factory=list)
    lev_mercado: Dict[str, Any] = Field(default_factory=dict)
    solucao: Optional[str] = None
    quantidade_estimada: Dict[str, Any] = Field(default_factory=dict)
    just_nao_parc: Optional[str] = None
    valor_total: Optional[str] = None
    demonst_resultados: Dict[str, Any] = Field(default_factory=dict)
    serv_continuo: bool
    justif_serv_continuo: Optional[str] = None
    providencias: Dict[str, Any] = Field(default_factory=dict)
    impac_ambientais: Optional[str] = None
    alinhamento_pls: List[str] = Field(default_factory=list)
    posic_conclusivo: bool
    justif_posic_conclusivo: Optional[str] = None
    equipe_de_planejamento: Optional[str] = None
    status: bool = True

    class Config:
        from_attributes = True


class ETPUpdate(BaseModel):
    """
    Schema para atualização de ETP
    """
    unidade_demandante: Optional[str] = None
    objeto_contratado: Optional[str] = None
    sist_reg_preco: Optional[bool] = None
    necessidade_contratacao: Optional[str] = None
    alinhamento_estrategico: Optional[List[str]] = None
    info_contratacao: Optional[str] = None
    previsto_pca: Optional[bool] = None
    item: Optional[int] = None
    req_contratacao: Optional[List[str]] = None
    lev_mercado: Optional[Dict[str, Any]] = None
    solucao: Optional[str] = None
    quantidade_estimada: Optional[Dict[str, Any]] = None
    just_nao_parc: Optional[str] = None
    valor_total: Optional[str] = None
    demonst_resultados: Optional[Dict[str, Any]] = None
    serv_continuo: Optional[bool] = None
    justif_serv_continuo: Optional[str] = None
    providencias: Optional[Dict[str, Any]] = None
    impac_ambientais: Optional[str] = None
    alinhamento_pls: Optional[List[str]] = None
    posic_conclusivo: Optional[bool] = None
    justif_posic_conclusivo: Optional[str] = None
    equipe_de_planejamento: Optional[str] = None


class ETPCompleto(BaseModel):
    """
    Schema para ETP completo gerado pela IA
    """
    unidade_demandante: str = Field(..., description="Unidade que está demandando a contratação")
    objeto_contratacao: str = Field(..., description="Objeto detalhado da contratação")
    sist_reg_preco: bool = Field(..., description="Se utilizará sistema de registro de preços")
    justificativa_necessidade: str = Field(..., description="Justificativa da necessidade da contratação")
    alinhamento_estrategico: List[str] = Field(..., description="Alinhamentos estratégicos da contratação")
    informacoes_contratacao: str = Field(..., description="Informações técnicas sobre a contratação")
    previsto_pca: bool = Field(..., description="Se está previsto no PCA")
    item_pca: int = Field(..., description="Item do PCA correspondente")
    requisitos_contratacao: List[str] = Field(..., description="Requisitos técnicos e habilitatórios")
    levantamento_mercado: LevantamentoMercado = Field(..., description="Dados do levantamento de mercado")
    solucao_proposta: str = Field(..., description="Solução técnica proposta")
    quantidade_estimada: QuantidadeEstimada = Field(..., description="Quantidades e valores estimados")
    justificativa_nao_parcelamento: str = Field(..., description="Justificativa para não parcelamento")
    valor_total_estimado: str = Field(..., description="Valor total da contratação")
    demonst_resultados: DemonstracaoResultados = Field(..., description="Resultados esperados")
    servico_continuo: bool = Field(..., description="Se é serviço de natureza contínua")
    justificativa_servico_continuo: Optional[str] = Field(None, description="Justificativa se for serviço contínuo")
    providencias: ProvidenciasETP = Field(..., description="Providências necessárias")
    impactos_ambientais: str = Field(..., description="Análise de impactos ambientais")
    alinhamento_pls: List[str] = Field(..., description="Alinhamento com PLS da Administração Pública")
    posicao_conclusiva: bool = Field(..., description="Posição conclusiva sobre a contratação")
    justificativa_posicao: str = Field(..., description="Justificativa da posição conclusiva")
    equipe_planejamento: str = Field(..., description="Equipe responsável pelo planejamento")

    @validator('valor_total_estimado')
    def format_valor(cls, v):
        """Formata valor monetário"""
        if isinstance(v, (int, float)):
            return f"R$ {v:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        return v

    def to_etp_data(self):
        """Converte para formato compatível com modelo ETP"""
        return {
            'unidade_demandante': self.unidade_demandante,
            'objeto_contratado': self.objeto_contratacao,
            'sist_reg_preco': self.sist_reg_preco,
            'necessidade_contratacao': self.justificativa_necessidade,
            'alinhamento_estrategico': self.alinhamento_estrategico,
            'info_contratacao': self.informacoes_contratacao,
            'previsto_pca': self.previsto_pca,
            'item': self.item_pca,
            'req_contratacao': self.requisitos_contratacao,
            'lev_mercado': self.levantamento_mercado.dict(),
            'solucao': self.solucao_proposta,
            'quantidade_estimada': self.quantidade_estimada.dict(),
            'just_nao_parc': self.justificativa_nao_parcelamento,
            'valor_total': self.valor_total_estimado,
            'demonst_resultados': self.demonst_resultados.dict(),
            'serv_continuo': self.servico_continuo,
            'justif_serv_continuo': self.justificativa_servico_continuo,
            'providencias': self.providencias.dict(),
            'impac_ambientais': self.impactos_ambientais,
            'alinhamento_pls': self.alinhamento_pls,
            'posic_conclusivo': self.posicao_conclusiva,
            'justif_posic_conclusivo': self.justificativa_posicao,
            'equipe_de_planejamento': self.equipe_planejamento
        }


class ArtefatosIntegracao(BaseModel):
    """
    Schema para dados dos artefatos anteriores
    """
    dfd: Optional[Dict[str, Any]] = None
    pdp: Optional[List[Dict[str, Any]]] = None
    pgr: Optional[List[Dict[str, Any]]] = None
    solucoes: Optional[List[Dict[str, Any]]] = None


class AnaliseETPCompleta(BaseModel):
    """
    Schema para análise completa para geração do ETP
    """
    resumo_projeto: str
    objeto_principal: str
    valor_estimado_total: Optional[float] = None
    complexidade_geral: str
    riscos_principais: List[str] = Field(default_factory=list)
    solucoes_disponiveis: List[str] = Field(default_factory=list)
    recomendacoes_tecnicas: List[str] = Field(default_factory=list)
    alertas_importantes: List[str] = Field(default_factory=list)
    dados_mercado: Optional[Dict[str, Any]] = None
    requisitos_especiais: List[str] = Field(default_factory=list)


class ProjetoContext(BaseModel):
    """
    Schema para contexto do projeto
    """
    id: int
    nome: str
    tipo: str
    objeto: str
    unidade_demandante: str
    data_criacao: str


class AnaliseETPResponse(BaseModel):
    """
    Schema para resposta da análise ETP
    """
    projeto: ProjetoContext
    artefatos_disponiveis: Dict[str, bool]
    analise_etp: AnaliseETPCompleta
    dados_etp_preliminar: Optional[Dict[str, Any]] = None
    status: str
    timestamp: str
    erro: Optional[str] = None
    sugestoes_melhoria: Optional[List[str]] = None


class RequisitosContratacao(BaseModel):
    """
    Schema para requisitos de contratação
    """
    tecnicos: List[str] = Field(default_factory=list, description="Requisitos técnicos")
    habilitatorios: List[str] = Field(default_factory=list, description="Requisitos habilitatórios")
    experiencia: List[str] = Field(default_factory=list, description="Requisitos de experiência")
    certificacoes: List[str] = Field(default_factory=list, description="Certificações necessárias")
    outros: List[str] = Field(default_factory=list, description="Outros requisitos")


class AlinhamentoEstrategico(BaseModel):
    """
    Schema para alinhamento estratégico
    """
    objetivos_institucionais: List[str] = Field(default_factory=list)
    metas_organizacionais: List[str] = Field(default_factory=list)
    diretrizes_governo: List[str] = Field(default_factory=list)
    beneficios_esperados: List[str] = Field(default_factory=list)


class SustentabilidadeAmbiental(BaseModel):
    """
    Schema para sustentabilidade ambiental
    """
    impactos_identificados: List[str] = Field(default_factory=list)
    medidas_mitigacao: List[str] = Field(default_factory=list)
    conformidade_legal: List[str] = Field(default_factory=list)
    oportunidades_melhoria: List[str] = Field(default_factory=list)