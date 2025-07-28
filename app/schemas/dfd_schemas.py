from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DFDCreate(BaseModel):
    descricao: str
    item: int


class QuantidadeJustifica(BaseModel):
    id_do_item: str
    descricao: str
    quantidade: str

class dfdModel(BaseModel):
    objeto_a_ser_contratado: str
    justificativa: str
    quantidade_justifica_a_ser_contratada: QuantidadeJustifica
    previsao_da_entrega_do_bem_ou_inicio_dos_servicos: str
    alinhamento_estrategico: list[str]
    equipe_de_planejamento: list[str]


class QuantidadeJustificativa(BaseModel):
    id_do_item: Optional[int]
    descricao: Optional[str]
    quantidade: Optional[int]

class DFDRead(BaseModel):
    id: int
    id_projeto: int
    user_created: str
    data_created: datetime
    item: int
    unidade_demandante: str
    # Alterados para corresponder aos nomes dos campos no seu modelo DFD (do banco)
    objeto_contratado: str
    justificativa_contratacao: str
    quantidade_contratada: List[QuantidadeJustificativa] # Ajustado para o nome do campo
    # A data é salva como datetime, então deve ser lida como datetime
    previsao_data_bem_servico: datetime
    alinhamento_estrategico: List[str]
    equipe_de_planejamento: str
    status: bool
    class Config:
        from_attributes = True
        
        
class QuantidadeJustificaTest(BaseModel):
    id_do_item: int
    descricao: Optional[str] = None
    quantidade: Optional[int] = None

class DFDProjectRead(BaseModel):
    id_projeto: int
    user_created: str
    group_created: str # aqui
    data_created: datetime
    item: int
    objeto_contratado: str = Field(alias="objeto_a_ser_contratado")
    justificativa_contratacao: str = Field(alias="justificativa") 
    quantidade_contratada: QuantidadeJustificaTest = Field(alias="quantidade_justifica_a_ser_contratada")
    previsao_data_bem_servico: datetime = Field(alias="previsao_da_entrega_do_bem_ou_inicio_dos_servicos")
    alinhamento_estrategico: List[str]
    equipe_de_planejamento: str

    class Config:
        from_attributes = True
        populate_by_name = True
        
        
        
        
class QuantidadeItem(BaseModel):
    id_do_item: int
    descricao: str
    quantidade: int

class DFDCreator(BaseModel):
    unidade_demandante: str
    objeto_a_ser_contratado: str
    justificativa: str
    quantidade_justifica_a_ser_contratada: List[QuantidadeItem]
    previsao_da_entrega_do_bem_ou_inicio_dos_servicos: str
    alinhamento_estrategico: List[str]
    equipe_de_planejamento: str
    item: int
    
    
    
class DFDUpdate(BaseModel):
    item: Optional[int]
    unidade_demandante: Optional[str]
    objeto_a_ser_contratado: Optional[str]
    justificativa: Optional[str]
    quantidade_justifica_a_ser_contratada: Optional[List[QuantidadeItem]]
    previsao_da_entrega_do_bem_ou_inicio_dos_servicos: Optional[str]  # "DD/MM/YYYY"
    alinhamento_estrategico: Optional[List[str]]
    equipe_de_planejamento: Optional[str]

    class Config:
        validate_by_name = True
        