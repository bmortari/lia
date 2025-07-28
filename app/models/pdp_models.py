from sqlalchemy import Column, Integer, String, Date, JSON, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class PDP(Base):
    __tablename__ = "pdp"
    __table_args__ = {"schema": "core"}

    id = Column("id_pdp", Integer, primary_key=True, index=True)
    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)

    # relacionamento com Projeto
    projeto = relationship("Projeto", back_populates="pdps")
    
    user_created = Column("usuario_criacao", String(255), nullable=False)
    data_created = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    # campos conforme seu schema Pydantic
    orgao_contratante = Column(String, nullable=False)
    processo_pregao = Column(String, nullable=False)
    empresa_adjudicada = Column(String, nullable=False)
    cnpj_empresa = Column(String, nullable=False)
    objeto = Column(String, nullable=False)
    data_vigencia_inicio = Column(Date, nullable=False)
    data_vigencia_fim = Column(Date, nullable=True)
    tipo_fonte = Column(String, nullable=False)

    # armazena a lista de itens como JSON
    tabela_itens = Column(JSON, nullable=False)
    
    status = Column(Boolean, default=True)
    
    
from app.models.projects_models import Projeto
