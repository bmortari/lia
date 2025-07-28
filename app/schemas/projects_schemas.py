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

class ProjetoRead(ProjetoBase):
    id_projeto: int
    user_created: str
    dt_created: datetime

    class Config:
        from_attributes = True  # Pydantic V2
        # orm_mode = True  # Pydantic V1