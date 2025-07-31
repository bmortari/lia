from sqlalchemy import Column, Integer, Text, DateTime, Boolean
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
    """
    Modelo principal - todos os artefatos se relacionam apenas com Projeto.
    Os artefatos são independentes entre si.
    """
    __tablename__ = "projeto"
    __table_args__ = {"schema": "core"}

    id_projeto = Column(Integer, primary_key=True, index=True)
    nome = Column(Text, nullable=True)
    descricao = Column(Text, nullable=True)
    tipo = Column(Text, nullable=True)
    user_created = Column(Text, nullable=True)
    dt_created = Column(DateTime(timezone=True), server_default=func.now())

    # Colunas booleanas para controle de artefatos existentes
    exist_dfd = Column(Boolean, nullable=False, default=False, comment="Indica se existe DFD vinculado ao projeto")
    exist_solucao = Column(Boolean, nullable=False, default=False, comment="Indica se existe Solução vinculada ao projeto")
    exist_pdp = Column(Boolean, nullable=False, default=False, comment="Indica se existe PDP vinculado ao projeto")
    exist_pgr = Column(Boolean, nullable=False, default=False, comment="Indica se existe PGR vinculado ao projeto")
    exist_etp = Column(Boolean, nullable=False, default=False, comment="Indica se existe ETP vinculado ao projeto")
    exist_tr = Column(Boolean, nullable=False, default=False, comment="Indica se existe TR vinculado ao projeto")
    exist_ed = Column(Boolean, nullable=False, default=False, comment="Indica se existe ED vinculado ao projeto")

    
    
    # RELACIONAMENTOS CENTRALIZADOS
    # Todos os artefatos se relacionam APENAS com Projeto
    # Os artefatos são independentes entre si
    # Usando string references para evitar problemas de importação circular
    
    dfds = relationship("DFD", back_populates="projeto", cascade="all, delete-orphan")
    solucoes = relationship("SolucaoIdentificada", back_populates="projeto", cascade="all, delete-orphan")
    pdps = relationship("PDP", back_populates="projeto", cascade="all, delete-orphan")
    etps = relationship("ETP", back_populates="projeto", cascade="all, delete-orphan")
    pgrs = relationship("PGR", back_populates="projeto", cascade="all, delete-orphan")
    