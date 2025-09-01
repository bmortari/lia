from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator, computed_field


# ==================== TR Item Schemas ====================

class TRItemBase(BaseModel):
    """Schema base para item do TR"""
    descricao: str = Field(..., description="Descrição do bem/serviço")
    cod_catmat: Optional[str] = Field(None, description="Código do catálogo de materiais sustentáveis")
    unidade_medida: str = Field(..., description="Unidade de medida (unidade, metro, etc)")
    quantidade: int = Field(..., gt=0, description="Quantidade do item")
    valor_unitario: Decimal = Field(..., decimal_places=2, description="Valor unitário do item")
    finalidade: str = Field(..., description="Finalidade específica do item")


class TRItemCreate(TRItemBase):
    """Schema para criação de item do TR"""
    pass


class TRItemUpdate(BaseModel):
    """Schema para atualização de item do TR"""
    descricao: Optional[str] = None
    cod_catmat: Optional[str] = None
    unidade_medida: Optional[str] = None
    quantidade: Optional[int] = Field(None, gt=0)
    valor_unitario: Optional[Decimal] = Field(None, decimal_places=2)
    finalidade: Optional[str] = None


class TRItemResponse(TRItemBase):
    """Schema de resposta para item do TR"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    id_tr: int
    valor_total: Decimal = Field(..., description="Valor total calculado (quantidade x valor_unitario)")
    
    @computed_field
    @property
    def valor_total_calculado(self) -> Decimal:
        """Calcula o valor total do item"""
        return self.quantidade * self.valor_unitario


# ==================== TR Schemas ====================

class TRBase(BaseModel):
    """Schema base para TR"""
    # Informações básicas
    orgao_contratante: Optional[str] = None
    numero_processo: Optional[str] = None
    
    # Tipo de contratação
    aquisicao_ou_formacao: Optional[str] = Field(
        None, 
        description="Aquisição ou formação de registro de preços"
    )
    tipo_contratacao: Optional[str] = Field(
        None, 
        description="Tipo: objeto ou serviço"
    )
    objeto_contratacao: Optional[str] = Field(
        None, 
        description="Itens ou serviços a serem contratados"
    )
    modalidade_contratacao: str = Field(
        ..., 
        description="Modalidade da contratação"
    )
    
    # Informações legais e contratuais
    fundamentacao_legal: Optional[str] = None
    prazo_vigencia_contrato: Optional[str] = None
    obrigacoes_contratante: Optional[List[str]] = None
    obrigacoes_contratada: Optional[List[str]] = None
    
    # Flags booleanas
    admite_subcontratacao: bool = Field(False, description="Permite subcontratação")
    exige_garantia_contratual: bool = Field(False, description="Exige garantia contratual")
    
    # Local e prazo de entrega
    local_entrega_prestacao: Optional[str] = None
    prazo_entrega_prestacao: Optional[date] = None
    
    # Condições e sanções
    condicoes_pagamento: Optional[str] = None
    sancoes_administrativas: Optional[str] = None
    
    # Responsável
    responsavel: Optional[str] = None
    cargo_responsavel: Optional[str] = None
    
    arquivo_docx_ref: Optional[str] = Field(None, description="Referência ao arquivo DOCX gerado")
    
    # @field_validator('modalidade_contratacao')
    # @classmethod
    # def validate_modalidade(cls, v: str) -> str:
    #     """Valida modalidade de contratação"""
    #     modalidades_validas = [
    #         'pregao_eletronico', 
    #         'pregao_presencial',
    #         'concorrencia',
    #         'tomada_precos',
    #         'convite',
    #         'dispensa',
    #         'inexigibilidade'
    #     ]
    #     if v and v.lower() not in modalidades_validas:
    #         # Permite valores customizados mas emite warning
    #         pass
    #     return v


class AquisicaoOuFormacao(str, Enum):
    aquisicao = "Aquisição"
    formacao = "Formação de registro de preços"

class TipoContratacao(str, Enum):
    objeto = "Objeto"
    servico = "Serviço"


class TRCreate(TRBase):
    """Schema para criação de TR"""
    aquisicao_ou_formacao: AquisicaoOuFormacao = Field(..., description="Aquisição ou formação de registro de preços")
    tipo_contratacao: TipoContratacao = Field(..., description="Contratação de objeto ou serviço")


class TRUpdate(BaseModel):
    """Schema para atualização de TR"""
    orgao_contratante: Optional[str] = None
    numero_processo: Optional[str] = None
    aquisicao_ou_formacao: Optional[str] = None
    tipo_contratacao: Optional[str] = None
    objeto_contratacao: Optional[str] = None
    modalidade_contratacao: Optional[str] = None
    fundamentacao_legal: Optional[str] = None
    prazo_vigencia_contrato: Optional[str] = None
    obrigacoes_contratante: Optional[List[str]] = None
    obrigacoes_contratada: Optional[List[str]] = None
    admite_subcontratacao: Optional[bool] = None
    exige_garantia_contratual: Optional[bool] = None
    local_entrega_prestacao: Optional[str] = None
    prazo_entrega_prestacao: Optional[date] = None
    condicoes_pagamento: Optional[str] = None
    sancoes_administrativas: Optional[str] = None
    responsavel: Optional[str] = None
    cargo_responsavel: Optional[str] = None
    arquivo_docx_ref: Optional[str] = None


class TRResponse(TRBase):
    """Schema de resposta para TR"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    id_projeto: int
    user_created: str
    data_created: datetime
    
    # Lista de itens quando necessário
    itens: Optional[List[TRItemResponse]] = Field(
        default_factory=list,
        description="Lista de itens do TR"
    )


class TRWithItemsResponse(TRResponse):
    """Schema de resposta para TR com itens incluídos"""
    itens: List[TRItemResponse] = Field(
        default_factory=list,
        description="Lista completa de itens do TR"
    )
    
    @computed_field
    @property
    def valor_total_tr(self) -> Decimal:
        """Calcula o valor total do TR somando todos os itens"""
        if not self.itens:
            return Decimal('0.00')
        return sum(item.valor_total_calculado for item in self.itens)
    
    @computed_field
    @property
    def quantidade_itens(self) -> int:
        """Retorna a quantidade total de itens no TR"""
        return len(self.itens) if self.itens else 0


class TRSummary(BaseModel):
    """Schema resumido para listagem de TRs"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    id_projeto: int
    numero_processo: Optional[str] = None
    objeto_contratacao: Optional[str] = None
    modalidade_contratacao: str
    responsavel: Optional[str] = None
    data_created: datetime
    quantidade_itens: Optional[int] = 0
    valor_total: Optional[Decimal] = Decimal('0.00')


# ==================== Schemas para Filtros e Paginação ====================

class TRFilter(BaseModel):
    """Schema para filtros de busca de TR"""
    id_projeto: Optional[int] = None
    modalidade_contratacao: Optional[str] = None
    orgao_contratante: Optional[str] = None
    numero_processo: Optional[str] = None
    responsavel: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    admite_subcontratacao: Optional[bool] = None
    exige_garantia_contratual: Optional[bool] = None


class PaginatedTRResponse(BaseModel):
    """Schema para resposta paginada de TRs"""
    total: int
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1, le=100)
    pages: int
    items: List[TRSummary]