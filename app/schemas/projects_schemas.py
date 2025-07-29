from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class TipoProjetoEnum(str, Enum):
    TI = "TI"
    OBRAS = "OBRAS"
    SERVICOS = "SERVIÇOS"
    BENS = "BENS"
    LOCACOES = "LOCAÇÕES"
    CAPACITACAO = "CAPACITAÇÃO"
    OUTROS = "OUTROS"

class ProjetoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    tipo: TipoProjetoEnum

class ProjetoCreate(ProjetoBase):
    pass

class ProjetoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[TipoProjetoEnum] = None
    # Campos para controle de artefatos existentes
    exist_dfd: Optional[bool] = None
    exist_pdp: Optional[bool] = None
    exist_etp: Optional[bool] = None
    exist_mr: Optional[bool] = None
    exist_tr: Optional[bool] = None
    exist_ed: Optional[bool] = None

class ProjetoRead(ProjetoBase):
    id_projeto: int
    user_created: str
    dt_created: datetime
    # Campos para controle de artefatos existentes
    exist_dfd: bool = False
    exist_pdp: bool = False
    exist_etp: bool = False
    exist_mr: bool = False
    exist_tr: bool = False
    exist_ed: bool = False

    class Config:
        from_attributes = True  # Pydantic V2
        # orm_mode = True  # Pydantic V1