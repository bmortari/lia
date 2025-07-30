from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal

class ItemPDP(BaseModel):
    """Schema para itens da tabela PDP"""
    item: int = Field(..., description="Número do item")
    descricao: str = Field(..., description="Descrição detalhada do item/serviço")
    unidade: str = Field(..., description="Unidade de medida")
    quantidade: float = Field(..., description="Quantidade do item")
    valor_unitario: float = Field(..., description="Valor unitário")
    valor_total: float = Field(..., description="Valor total (quantidade × valor unitário)")
    especificacao_tecnica: Optional[str] = Field(None, description="Especificações técnicas")
    marca_referencia: Optional[str] = Field(None, description="Marca ou referência")
    prazo_entrega: Optional[str] = Field(None, description="Prazo de entrega")
    observacoes: Optional[str] = Field(None, description="Observações do item")

    @validator('valor_total')
    def validate_valor_total(cls, v, values):
        """Valida se valor_total = quantidade × valor_unitario"""
        if 'quantidade' in values and 'valor_unitario' in values:
            expected = values['quantidade'] * values['valor_unitario']
            if abs(v - expected) > 0.01:  # Tolerância de 1 centavo
                return expected
        return v

class PpModel(BaseModel):
    """Schema principal para resposta da IA - representa um PDP"""
    orgao_contratante: str = Field(..., description="Nome do órgão contratante")
    processo_pregao: str = Field(..., description="Número/identificação do processo")
    empresa_adjudicada: str = Field(..., description="Nome da empresa vencedora")
    cnpj_empresa: str = Field(..., description="CNPJ da empresa")
    objeto: str = Field(..., description="Descrição do objeto da contratação")
    data_vigencia_inicio: str = Field(..., description="Data de início da vigência (YYYY-MM-DD)")
    tipo_fonte: str = Field(..., description="Tipo da fonte de dados")
    tabela_itens: List[ItemPDP] = Field(..., description="Lista de itens do PDP")

    @validator('data_vigencia_inicio')
    def validate_date_format(cls, v):
        """Valida formato da data e garante que seja string no formato correto"""
        if isinstance(v, date):
            return v.strftime('%Y-%m-%d')
        elif isinstance(v, str):
            try:
                # Tenta parsear para validar
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                # Se não conseguir parsear, retorna data atual
                return date.today().strftime('%Y-%m-%d')
        else:
            return date.today().strftime('%Y-%m-%d')

    @validator('cnpj_empresa')
    def validate_cnpj(cls, v):
        """Valida formato básico do CNPJ"""
        if v and v != "A definir":
            # Remove formatação
            cnpj_nums = ''.join(filter(str.isdigit, v))
            if len(cnpj_nums) == 14:
                # Formata CNPJ
                return f"{cnpj_nums[:2]}.{cnpj_nums[2:5]}.{cnpj_nums[5:8]}/{cnpj_nums[8:12]}-{cnpj_nums[12:14]}"
        return v

    def to_pdp_data(self):
        """Converte para formato compatível com modelo PDP"""
        from datetime import datetime, date
        
        # Converte data string para objeto date
        try:
            data_obj = datetime.strptime(self.data_vigencia_inicio, '%Y-%m-%d').date()
        except:
            data_obj = date.today()
        
        return {
            'orgao_contratante': self.orgao_contratante,
            'processo_pregao': self.processo_pregao,
            'empresa_adjudicada': self.empresa_adjudicada,
            'cnpj_empresa': self.cnpj_empresa,
            'objeto': self.objeto,
            'data_vigencia_inicio': data_obj,  # Objeto date
            'tipo_fonte': self.tipo_fonte,
            'tabela_itens': [item.dict() for item in self.tabela_itens]
        }

class PDPCreate(BaseModel):
    """Schema para criação de PDP via API"""
    palavras_chave: List[str] = Field(default_factory=list, description="Palavras-chave para busca")
    descricao: str = Field(..., description="Descrição do objeto da contratação")
    ufs: Optional[List[str]] = Field(default_factory=list, description="UFs para filtrar busca")
    esferas: Optional[List[str]] = Field(default_factory=list, description="Esferas para filtrar busca")
    modalidades: Optional[List[str]] = Field(default_factory=list, description="Modalidades para filtrar busca")

class PDPRead(BaseModel):
    """Schema para leitura de PDP"""
    id: int
    id_projeto: int
    orgao_contratante: str
    processo_pregao: str
    empresa_adjudicada: str
    cnpj_empresa: str
    objeto: str
    data_vigencia_inicio: date
    tipo_fonte: str
    tabela_itens: List[Dict[str, Any]]  # JSON field
    user_created: str
    # CORREÇÃO: Usar data_created em vez de created_at para ser consistente com o modelo
    data_created: datetime

    class Config:
        from_attributes = True
    
    @classmethod
    def from_pdp_model(cls, pdp_model):
        """Cria PDPRead a partir do modelo PDP"""
        return cls(
            id=pdp_model.id,
            id_projeto=pdp_model.id_projeto,
            orgao_contratante=pdp_model.orgao_contratante,
            processo_pregao=pdp_model.processo_pregao,
            empresa_adjudicada=pdp_model.empresa_adjudicada,
            cnpj_empresa=pdp_model.cnpj_empresa,
            objeto=pdp_model.objeto,
            data_vigencia_inicio=pdp_model.data_vigencia_inicio,
            tipo_fonte=pdp_model.tipo_fonte,
            tabela_itens=pdp_model.tabela_itens,
            user_created=pdp_model.user_created,
            data_created=pdp_model.data_created  # Campo correto no modelo
        )

class PDPUpdate(BaseModel):
    """Schema para atualização de PDP"""
    orgao_contratante: Optional[str] = None
    processo_pregao: Optional[str] = None
    empresa_adjudicada: Optional[str] = None
    cnpj_empresa: Optional[str] = None
    objeto: Optional[str] = None
    data_vigencia_inicio: Optional[date] = None
    tipo_fonte: Optional[str] = None
    tabela_itens: Optional[List[Dict[str, Any]]] = None

class PDPSummary(BaseModel):
    """Schema para resumo de PDP"""
    id: int
    objeto: str
    orgao_contratante: str
    valor_total: float
    quantidade_itens: int
    data_vigencia_inicio: date
    data_created: datetime

    @validator('valor_total', pre=True)
    def calculate_valor_total(cls, v, values):
        """Calcula valor total dos itens"""
        if 'tabela_itens' in values and isinstance(values['tabela_itens'], list):
            total = 0
            for item in values['tabela_itens']:
                if isinstance(item, dict) and 'valor_total' in item:
                    try:
                        total += float(item['valor_total'])
                    except (ValueError, TypeError):
                        continue
            return total
        return v or 0

# Schemas para análise inicial (usado na página de criação)
class RiscoAnalise(BaseModel):
    """Schema para análise de riscos"""
    risco: str
    probabilidade: str  # Baixa, Média, Alta
    impacto: str        # Baixo, Médio, Alto
    mitigacao: str

class SolucaoIdentificada(BaseModel):
    """Schema para soluções identificadas pela IA"""
    nome: str
    descricao: str
    palavras_chave: List[str]
    complexidade_estimada: str  # Baixa, Média, Alta
    tipo: str                   # principal, complementar, economica
    analise_riscos: List[RiscoAnalise]

class AnaliseInicial(BaseModel):
    """Schema para análise inicial do projeto"""
    resumo_objeto: str
    categoria_estimada: str
    complexidade: str
    sugestoes_palavras_chave: List[str]
    observacoes: str
    tipos_solucao: List[SolucaoIdentificada]
    alertas: List[str]
    recomendacoes_busca: str
    status_ia: Optional[str] = None  # Para indicar se foi fallback

class ProjetoContext(BaseModel):
    """Schema para contexto do projeto"""
    id: int
    objeto: str
    unidade_demandante: str
    data_criacao: str

class AnaliseProjetoResponse(BaseModel):
    """Schema para resposta da análise completa do projeto"""
    projeto: ProjetoContext
    analise_inicial: AnaliseInicial
    status: str
    timestamp: str
    erro: Optional[str] = None