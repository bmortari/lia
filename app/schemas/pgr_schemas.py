from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class PGRCreate(BaseModel):
    """
    Schema para criação de PGR
    """
    prompt_usuario: str = Field(..., description="Prompt do usuário para guiar a análise de riscos")
    solucoes_selecionadas: Optional[List[int]] = Field(default=None, description="IDs das soluções para análise (opcional)")
    parametros_analise: Optional[Dict[str, Any]] = Field(default=None, description="Parâmetros adicionais para análise")


class PGRRead(BaseModel):
    """
    Schema para leitura de PGR
    """
    id_pgr: int
    id_projeto: int
    id_solucao: Optional[int] = None
    usuario_criacao: str
    data_criacao: datetime
    objeto: Optional[str] = None
    risco: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class RiscoBase(BaseModel):
    """
    Schema base para estrutura de um risco
    """
    categoria: str = Field(..., description="Categoria do risco: Técnico/Operacional/Financeiro/Legal/Estratégico")
    tipo_risco: str = Field(..., description="Nome específico do tipo de risco")
    descricao: str = Field(..., description="Descrição detalhada do risco")
    probabilidade: str = Field(..., description="Muito Baixa/Baixa/Média/Alta/Muito Alta")
    impacto: str = Field(..., description="Muito Baixo/Baixo/Médio/Alto/Muito Alto")
    nivel_risco: str = Field(..., description="Baixo/Médio/Alto/Crítico")
    fase_projeto: str = Field(..., description="Planejamento/Licitação/Contratação/Execução/Encerramento")
    causas_potenciais: List[str] = Field(default_factory=list)
    consequencias: List[str] = Field(default_factory=list)
    indicadores: List[str] = Field(default_factory=list)


class AcaoMitigacao(BaseModel):
    """
    Schema para ações de mitigação de risco
    """
    acao: str = Field(..., description="Descrição da ação de mitigação")
    responsavel: str = Field(..., description="Área ou função responsável")
    prazo: str = Field(..., description="Prazo para implementação")
    custo_estimado: str = Field(..., description="Estimativa de custo")
    eficacia_estimada: str = Field(..., description="Baixa/Média/Alta")


class PlanoContingencia(BaseModel):
    """
    Schema para plano de contingência
    """
    trigger: str = Field(..., description="Condição que ativa o plano")
    acoes: List[str] = Field(default_factory=list)
    recursos_necessarios: List[str] = Field(default_factory=list)


class MonitoramentoRisco(BaseModel):
    """
    Schema para monitoramento de risco
    """
    frequencia: str = Field(..., description="Diária/Semanal/Mensal/Trimestral")
    responsavel: str = Field(..., description="Área ou função responsável")
    metricas: List[str] = Field(default_factory=list)


class RiscoCompleto(RiscoBase):
    """
    Schema completo para um risco com todas as informações
    """
    acoes_mitigacao: List[AcaoMitigacao] = Field(default_factory=list)
    plano_contingencia: Optional[PlanoContingencia] = None
    monitoramento: Optional[MonitoramentoRisco] = None


class MatrizRiscos(BaseModel):
    """
    Schema para matriz de classificação de riscos
    """
    riscos_criticos: List[str] = Field(default_factory=list)
    riscos_altos: List[str] = Field(default_factory=list)
    riscos_medios: List[str] = Field(default_factory=list)
    riscos_baixos: List[str] = Field(default_factory=list)


class AnaliseRiscoSolucao(BaseModel):
    """
    Schema para análise de riscos de uma solução específica
    """
    id_solucao: int
    nome_solucao: str
    categoria_risco_principal: str
    nivel_risco_geral: str
    riscos_identificados: List[RiscoCompleto] = Field(default_factory=list)
    matriz_riscos: Optional[MatrizRiscos] = None
    recomendacoes_gerais: List[str] = Field(default_factory=list)


class AnaliseComparativa(BaseModel):
    """
    Schema para análise comparativa entre soluções
    """
    solucao_menor_risco: str
    solucao_maior_risco: str
    fatores_decisao: List[str] = Field(default_factory=list)
    recomendacao_final: str


class PlanoGeralRiscos(BaseModel):
    """
    Schema para plano geral de gestão de riscos
    """
    estrutura_governanca: str
    periodicidade_revisao: str
    criterios_escalacao: List[str] = Field(default_factory=list)
    documentacao_necessaria: List[str] = Field(default_factory=list)


class AnaliseRiscosCompleta(BaseModel):
    """
    Schema para análise completa de riscos de um projeto
    """
    resumo_analise: str
    metodologia_aplicada: str
    riscos_por_solucao: List[AnaliseRiscoSolucao] = Field(default_factory=list)
    analise_comparativa: Optional[AnaliseComparativa] = None
    plano_geral_riscos: Optional[PlanoGeralRiscos] = None


class SolucaoParaAnalise(BaseModel):
    """
    Schema para dados de solução que será analisada
    """
    id_solucao: int
    nome: str
    descricao: Optional[str] = None
    palavras_chave: List[str] = Field(default_factory=list)
    complexidade_estimada: str
    tipo: str
    analise_riscos_existente: List[Dict[str, Any]] = Field(default_factory=list)
    data_criacao: Optional[datetime] = None


class RespostaAnaliseRiscos(BaseModel):
    """
    Schema para resposta da análise de riscos inicial
    """
    projeto: Dict[str, Any]
    solucoes: List[SolucaoParaAnalise] = Field(default_factory=list)
    total_solucoes: int
    status: str
    timestamp: datetime
    erro: Optional[str] = None
    mensagem: Optional[str] = None