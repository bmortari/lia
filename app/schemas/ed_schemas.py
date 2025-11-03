from typing import List, Literal
from pydantic import BaseModel, ConfigDict, Field

class Secao(BaseModel):
    subsecoes: List[str]


class EDCreate(BaseModel):
    """Requisição para geração do documento do Edital"""
    modalidade_edital: Literal["concorrencia", "pregao_eletronico"] = Field(..., description="Modalidade do edital: Concorrência ou Pregão eletrônico")
    local_certame: str = Field(...) 
    data_certame: str = Field(...)
    horario_certame: str = Field(...)
    telefone: str = Field(..., description="Telefone para contato sobre informações do certame")
    partipacao_exclusiva_mei: bool = Field(..., description="Define se apenas MEI pode participar da licitação ou pregão")
    modo_disputa: Literal["aberto", "fechado", "aberto_e_fechado"] = Field(..., description="Modo de disputa do pregão/licitação")
    intervalo_minimo_lances: str = Field(..., description="Intervalo mínimo de valor entre lances (porcentagem ou valor em reais)")
    email_contato: str = Field(...)
    enderecos_site_consulta_edital: List[str] = Field(..., description="Endereços em que o edital pode ser consultado")

class EDBase(BaseModel):
    """Edital a ser armazenado no db"""
    objeto: Secao
    local_data_horario: Secao
    participacao_licitacao: Secao
    apresentacao_proposta_documentos: Secao
    abertura_sessao: Secao
    fase_julgamento: Secao
    fase_habilitacao: Secao
    encaminhamento_proposta_vencedora: Secao
    recursos: Secao
    termo_contrato: Secao
    reabertura_sessao: Secao
    adjudicacao_homologacao: Secao
    infracoes_administrativas_sancoes: Secao

class EDRead(EDBase):
    """Schema de leitura para recebimento dos dados do Edital da IA"""
    model_config = ConfigDict(from_attributes=True)
