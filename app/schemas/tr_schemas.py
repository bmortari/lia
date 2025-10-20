from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncAttrs
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator, computed_field, ValidationInfo


# ==================== Enums ====================

class TipoContratacao(str, Enum):
    compras = "compras"
    servicos = "servicos"


class ModalidadeLicitacao(str, Enum):
    aquisicao_direta = "aquisicao_direta"
    registro_precos = "registro_precos"


class CriterioAvaliacao(str, Enum):
    instrumento_medicao_resultado = "instrumento_medicao_resultado"
    outro_instrumento = "outro_instrumento"
    disposto_item = "disposto_item"


class CriterioJulgamento(str, Enum):
    item = "item"
    grupo = "grupo"


class FormaPagamento(str, Enum):
    ordem_bancaria_siafi = "Ordem Bancária/SIAFI"
    outra = "outra forma"


class FormaSelecao(str, Enum):
    pregao_eletronico = "Pregão Eletrônico"
    pregao_presencial = "Pregão Presencial"
    concorrencia = "Concorrência"
    tomada_precos = "Tomada de Preços"
    dispensa = "Dispensa"
    inexigibilidade = "Inexigibilidade"


# ==================== Schemas Aninhados ====================

class SistemaRegistroPrecos(BaseModel):
    """Schema para Sistema de Registro de Preços"""
    model_config = ConfigDict(from_attributes=True)
    adota_srp: bool = Field(..., description="Se adota Sistema de Registro de Preços")
    tipo_srp: Optional[str] = Field(None, description="Justificativa do tipo de SRP")
    quantidade_maxima: Optional[bool] = Field(None, description="Se há quantidade máxima")
    quantidade_minima_cotacao: Optional[str] = Field(None, description="Quantidade mínima para cotação")
    permite_precos_diferentes: Optional[bool] = Field(None, description="Se permite preços diferentes")
    justificativa_precos_diferentes: Optional[str] = None
    permite_proposta_inferior: Optional[bool] = Field(None, description="Se permite proposta inferior ao máximo")
    criterio_julgamento: Optional[CriterioJulgamento] = None
    registro_limitado: Optional[bool] = Field(None, description="Se o registro é limitado")
    criterio_reajuste: Optional[str] = Field(None, description="IPCA, INCC ou outro índice")
    vigencia_ata: Optional[str] = Field(None, description="Vigência da ata de registro")


class RequisitosContratacao(BaseModel):
    """Schema para Requisitos da Contratação"""
    model_config = ConfigDict(from_attributes=True)
    sustentabilidade: Optional[str] = Field(None, description="Requisitos de sustentabilidade")
    indicacao_marcas: Optional[str] = Field(None, description="Indicação de marcas/modelos")
    vedacao_marca_produto: Optional[str] = Field(None, description="Vedações de marca/produto")
    exige_amostra: bool = Field(False, description="Se exige amostra")
    exige_carta_solidariedade: bool = Field(False, description="Se exige carta de solidariedade")
    garantia_produto_servico: Optional[str] = Field(None, description="Garantia do produto/serviço")
    exige_vistoria: bool = Field(False, description="Se exige vistoria (para serviços)")


class ModeloExecucao(BaseModel):
    """Schema para Modelo de Execução"""
    model_config = ConfigDict(from_attributes=True)
    condicoes_execucao: Optional[str] = Field(None, description="Condições para a execução do serviço")
    informacoes_relevantes: Optional[str] = Field(None, description="Características relevantes para o dimensionamento da proposta")
    materiais_disponibilizados: Optional[str] = Field(None, description="Materiais que devem ser fornecidos para a execução do serviço")
    condicoes_entrega: Optional[str] = Field(None, description="Condições de entrega detalhadas")
    garantia_manutencao: Optional[str] = Field(None, description="Garantia e assistência técnica")
    materiais_fornecidos: Optional[str] = Field(None, description="Materiais fornecidos")
    informacoes_proposta: Optional[str] = Field(None, description="Informações para proposta")


class GestaoContrato(BaseModel):
    """Schema para Gestão do Contrato"""
    model_config = ConfigDict(from_attributes=True)
    modelo_gestao: Optional[str] = Field(None, description="Modelo de gestão e fiscalização")
    papeis_responsabilidades: Optional[str] = Field(None, description="Papéis do gestor e fiscal")

class Avaliacao(BaseModel):
    """Sub-schema para o campo avaliacao"""
    criterio: Optional[CriterioAvaliacao] = Field(None, description="IMR, outro instrumento ou o disposto no item")
    anexo: Optional[str] = Field(None, description="Nome e número do anexo")
    instrumento: Optional[str] = Field(None, description="Descrição do instrumento a ser utilizado para avaliação")
    descricao_item: Optional[str] = Field(None, description="Descrição do item")


class CriteriosPagamento(BaseModel):
    """Schema para Critérios de Pagamento"""
    model_config = ConfigDict(from_attributes=True)
    recebimento_objeto: Optional[str] = Field(None, description="Recebimento provisório e definitivo")
    liquidacao: Optional[str] = Field(None, description="Processo de liquidação")
    avaliacao: Optional[Avaliacao] = Field(None, description="Instrumento a ser utilizado para avaliação da exeecução do objeto")
    prazo_pagamento: Optional[str] = Field(None, description="Prazo para pagamento")
    prazo_provisorio_recebimento: Optional[str] = Field(None, description="Prazo provisorio para recebimento do objeto do contrato")
    prazo_definitivo_recebimento: Optional[str] = Field(None, description="Prazo definitivo para recebimento do objeto do contrato")
    forma_pagamento: Optional[str] = Field(None, description="Forma de pagamento")
    antecipacao_pagamento: bool = Field(False, description="Se permite antecipação")
    cessao_credito: Optional[str] = Field(None, description="Regras sobre cessão de crédito")

class ExigenciasHabilitacao(BaseModel):
    """Schema para Exigências de Habilitação"""
    model_config = ConfigDict(from_attributes=True)
    juridica: List[str] = Field(default_factory=list, description="Documentos de habilitação jurídica")
    fiscal_trabalhista: List[str] = Field(default_factory=list, description="Documentos fiscais e trabalhistas")
    economico_financeira: List[str] = Field(default_factory=list, description="Documentos econômico-financeiros")
    tecnica: List[str] = Field(default_factory=list, description="Documentos de qualificação técnica")


class SelecaoFornecedor(BaseModel):
    """Schema para Seleção do Fornecedor"""
    model_config = ConfigDict(from_attributes=True)
    forma_selecao: Optional[str] = Field(None, description="Modalidade de licitação")
    criterio_julgamento: Optional[str] = Field(None, description="Critério de julgamento")
    exigencias_habilitacao: Optional[ExigenciasHabilitacao] = None


class EstimativaValor(BaseModel):
    """Schema para Estimativa de Valor"""
    model_config = ConfigDict(from_attributes=True)
    valor_total: Optional[Decimal] = Field(None, decimal_places=2, description="Valor total estimado")
    valor_unitario: Optional[Decimal] = Field(None, decimal_places=2, description="Valor unitário (para item único)")
    metodologia_pesquisa: Optional[str] = Field(None, description="Metodologia de pesquisa de preços")


class AdequacaoOrcamentaria(BaseModel):
    """Schema para Adequação Orçamentária"""
    model_config = ConfigDict(from_attributes=True)
    fonte_recursos: Optional[str] = Field(None, description="Fonte de recursos")
    classificacao_orcamentaria: Optional[str] = Field(None, description="Classificação orçamentária")
    previsao_pca: Optional[bool] = Field(None, description="Previsão no PCA")
    codigo_pca: Optional[str] = Field(None, description="Código da contratação no PCA")


# ==================== Schemas de Item ====================

class TRItemBase(BaseModel):
    """Schema base para item do TR"""
    model_config = ConfigDict(from_attributes=True)
    descricao: str = Field(..., description="Descrição detalhada do item")
    especificacoes_tecnicas: Optional[List[str]] = Field(None, description="Lista de especificações técnicas")
    quantidade: Decimal = Field(..., decimal_places=3, gt=0, description="Quantidade do item")
    valor_unitario: Optional[Decimal] = Field(None, decimal_places=2, description="Valor unitário")
    valor_total: Optional[Decimal] = Field(None, decimal_places=2, description="Valor total")
    unidade_medida: str = Field(..., description="Unidade de medida")
    codigo_catmat_catser: Optional[str] = Field(None, description="Código CATMAT/CATSER")
    finalidade: Optional[str] = Field(None, description="Finalidade/uso do item")


# class TRItemCreate(TRItemBase):
#     """Schema para criação de item do TR"""
#     pass


class TRItemUpdate(BaseModel):
    """Schema para atualização de um item do TR. Todos os campos são opcionais."""
    model_config = ConfigDict(from_attributes=True)
    descricao: Optional[str] = None
    especificacoes_tecnicas: Optional[List[str]] = None
    quantidade: Optional[Decimal] = None
    valor_unitario: Optional[Decimal] = None
    valor_total: Optional[Decimal] = None
    unidade_medida: Optional[str] = None
    codigo_catmat_catser: Optional[str] = None
    finalidade: Optional[str] = None


# class TRItemResponse(TRItemBase):
#     """Schema de resposta para item do TR"""
#     model_config = ConfigDict(from_attributes=True)
    
#     id: int
#     id_tr: int
    
#     @computed_field
#     @property
#     def valor_total_calculado(self) -> Decimal:
#         """Calcula o valor total do item"""
#         if self.valor_unitario and self.quantidade:
#             return Decimal(str(self.quantidade)) * Decimal(str(self.valor_unitario))
#         return Decimal('0.00')


# ==================== Schemas do TR ====================

class TRBase(BaseModel):
    """Schema base para TR"""
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            Decimal: lambda v: round(float(v), 2)
        }
    )
    id: int
    id_projeto: int
    user_created: str
    data_created: datetime

    # Informações básicas
    orgao_contratante: Optional[str] = None
    tipo_contratacao: Optional[TipoContratacao] = None
    objeto_contratacao: Optional[str] = None
    modalidade_licitacao: Optional[ModalidadeLicitacao] = None
    fundamentacao_legal: Optional[str] = None

    # Solução
    descricao_solucao: Optional[str] = None
    
    # Vigência e prazos
    prazo_vigencia_contrato: Optional[str] = None
    prazo_entrega_prestacao: Optional[str] = None
    local_entrega_prestacao: Optional[str] = None
    
    # Obrigações
    obrigacoes_contratante: Optional[List[str]] = None
    obrigacoes_contratada: Optional[List[str]] = None
    
    # Flags
    admite_subcontratacao: bool = False
    exige_garantia_contratual: bool = False
    
    # Pagamento e sanções
    condicoes_pagamento: Optional[str] = None
    sancoes_administrativas: Optional[str] = None
    
    # Responsável
    responsavel: Optional[str] = None
    cargo_responsavel: Optional[str] = None
    
    # Seções estruturadas
    sistema_registro_precos: Optional[SistemaRegistroPrecos] = None
    requisitos_contratacao: Optional[RequisitosContratacao] = None
    modelo_execucao: Optional[ModeloExecucao] = None
    gestao_contrato: Optional[GestaoContrato] = None
    criterios_pagamento: Optional[CriteriosPagamento] = None
    selecao_fornecedor: Optional[SelecaoFornecedor] = None
    estimativa_valor: Optional[EstimativaValor] = None
    adequacao_orcamentaria: Optional[AdequacaoOrcamentaria] = None

    itens: Optional[List[TRItemBase]] = Field(None, description="Lista de itens do TR")



class TRCreate(BaseModel):
    """Dados que necessitam ser enviados para a geração dos dados do TR"""
    orgao_contratante: str = Field(..., description="Órgão contratante")
    prompt: Optional[str] = Field(None, description="Prompt/solicitação do usuário")
    modalidade_licitacao: str = Field(..., description="Termo de referência referente à aquisição ou formação de registro de preços")
    tipo_contratacao: str = Field(..., description="Indica se a contratação é de uma compra ou serviço")
    #itens: List[TRItemCreate] = Field(..., min_items=1, description="Lista de itens do TR")
    
    # @field_validator('sistema_registro_precos')
    # @classmethod
    # def validate_srp(cls, v: Optional[SistemaRegistroPrecos], info: ValidationInfo) -> Optional[SistemaRegistroPrecos]:
    #     """Valida Sistema de Registro de Preços"""
    #     if info.data.get('modalidade_licitacao') == ModalidadeLicitacao.registro_precos and not v:
    #         raise ValueError("Sistema de Registro de Preços é obrigatório quando modalidade é 'registro_precos'")
    #     return v
    
class TRRead(TRBase):
    """Schema de leitura para recebimento de dados do TR da IA"""
    model_config = ConfigDict(from_attributes=True)
    
    @field_validator('itens')
    @classmethod
    def validate_itens(cls, v: Optional[List[TRItemBase]]) -> Optional[List[TRItemBase]]:
        """Valida a lista de itens"""
        if v is not None and len(v) == 0:
            return None
        return v

class TRUpdate(BaseModel):
    """Schema para atualização de TR"""
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            Decimal: lambda v: round(float(v))
        }
    )

    # Informações básicas que podem ser alteradas
    orgao_contratante: Optional[str] = None
    tipo_contratacao: Optional[TipoContratacao] = None
    objeto_contratacao: Optional[str] = None
    modalidade_licitacao: Optional[ModalidadeLicitacao] = None
    fundamentacao_legal: Optional[str] = None

    descricao_solucao: Optional[str] = None
    
    # Adicione todos os outros campos que o usuário pode editar, sempre como Opcionais
    prazo_vigencia_contrato: Optional[str] = None
    prazo_entrega_prestacao: Optional[str] = None
    local_entrega_prestacao: Optional[str] = None

    obrigacoes_contratante: Optional[List[str]] = None
    obrigacoes_contratada: Optional[List[str]] = None

    admite_subcontratacao: Optional[bool] = None
    exige_garantia_contratual: Optional[bool] = None

    condicoes_pagamento: Optional[str] = None
    sancoes_administrativas: Optional[str] = None

    responsavel: Optional[str] = None
    cargo_responsavel: Optional[str] = None

    # Seções estruturadas (assumindo que podem ser atualizadas)
    sistema_registro_precos: Optional[SistemaRegistroPrecos] = None
    requisitos_contratacao: Optional[RequisitosContratacao] = None
    modelo_execucao: Optional[ModeloExecucao] = None
    gestao_contrato: Optional[GestaoContrato] = None
    criterios_pagamento: Optional[CriteriosPagamento] = None
    selecao_fornecedor: Optional[SelecaoFornecedor] = None
    estimativa_valor: Optional[EstimativaValor] = None
    adequacao_orcamentaria: Optional[AdequacaoOrcamentaria] = None

    # Lista de itens
    itens: Optional[List[TRItemUpdate]] = None

