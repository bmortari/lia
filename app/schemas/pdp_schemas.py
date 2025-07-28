from pydantic import BaseModel, Field
from typing import Optional, List


class ItemModel(BaseModel):
    item: str = Field(description="O número de identificação do item na tabela (ex: '01', '19A').")
    descricao_item: str = Field(description="A descrição completa do produto ou serviço, conforme a coluna 'Descrição'.")
    marca_modelo: str = Field(description="A marca e o modelo específicos do item. Pode estar na descrição ou em uma coluna 'Marca'.")
    unidade_medida: str = Field(description="A unidade de fornecimento do item (ex: 'Und', 'UN', 'PA', 'CX').")
    quantidade: int = Field(description="A quantidade total do item, presente na coluna 'Qtde' ou similar.")
    valor_unitario: float = Field(description="O preço por unidade do item, conforme a coluna 'Preço Unitário (R$)'.")

# Agora, definimos a estrutura principal do documento, que contém uma lista de 'ItemModel'
class PpModel(BaseModel):
    orgao_contratante: str = Field(description="Nome do órgão público que está realizando a compra (Contratante ou Órgão Gerenciador).")
    processo_pregao: str = Field(description="Concatenação dos números do 'Processo Administrativo' e do 'Pregão'. Formato: 'Proc. [Número] / Pregão [Número]'.")
    empresa_adjudicada: str = Field(description="Nome da empresa fornecedora/contratada.")
    cnpj_empresa: str = Field(description="CNPJ da empresa fornecedora no formato 'XX.XXX.XXX/XXXX-XX'.")
    objeto: str = Field(description="Resumo do propósito geral da contratação, localizado na seção 'DO OBJETO'.")
    data_vigencia_inicio: str = Field(description="Data de início da validade do contrato ou da ata. Formato AAAA-MM-DD.")
    data_vigencia_fim: Optional[str] = Field(default=None, description="Data de término da vigência. Nulo se não for possível determinar. Formato AAAA-MM-DD.")
    tipo_fonte: str = Field(description="Tipo de documento. 'ARP' se for Ata de Registro de Preços, ou outro como 'Contrato', 'Edital'.")
    tabela_itens: List[ItemModel] = Field(description="Uma lista contendo todos os itens detalhados da tabela de produtos/serviços.")
    
    
class PDPCreate(BaseModel):
    palavras_chave: List[str] = Field(..., alias="palavras-chave")
    descricao: str
    ufs: List[str]
    esferas: List[str]
    modalidades: List[str]

    class Config:
        validate_by_name = True
        populate_by_name = True
        


class TabelaItem(BaseModel):
    item: str
    descricao_item: str
    marca_modelo: str
    unidade_medida: str
    quantidade: int
    valor_unitario: float

class PDPRead(BaseModel):
    orgao_contratante: str
    processo_pregao: str
    empresa_adjudicada: str
    cnpj_empresa: str
    objeto: str
    data_vigencia_inicio: str
    data_vigencia_fim: Optional[str]
    tipo_fonte: str
    tabela_itens: List[TabelaItem]
