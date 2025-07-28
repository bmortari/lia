from sqlalchemy import Column, Integer, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class TipoProjetoEnum(str, enum.Enum):
    TI = "TI"
    OBRAS = "OBRAS"
    SERVICOS = "SERVIÇOS"
    BENS = "BENS"
    LOCACOES = "LOCAÇÕES"
    CAPACITACAO = "CAPACITAÇÃO"
    OUTROS = "OUTROS"

class Projeto(Base):
    __tablename__ = "projeto"
    __table_args__ = {"schema": "core"}

    id_projeto = Column(Integer, primary_key=True, index=True)
    nome = Column(Text, nullable=True)
    descricao = Column(Text, nullable=True)
    tipo = Column(Text, nullable=True)
    user_created = Column(Text, nullable=True)
    dt_created = Column(DateTime(timezone=True), server_default=func.now())
    dfds = relationship("app.models.dfd_models.DFD", back_populates="projeto", cascade="all, delete-orphan")
    pdps = relationship("app.models.pdp_models.PDP", back_populates="projeto", cascade="all, delete-orphan")