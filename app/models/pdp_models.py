from sqlalchemy import Column, Integer, String, Date, JSON, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class PDP(Base):
    """
    Pesquisa de Dados e Preços (PDP)
    Relacionamento EXCLUSIVO com Projeto - Artefato independente
    """
    __tablename__ = "pdp"
    __table_args__ = {"schema": "core"}

    id = Column("id_pdp", Integer, primary_key=True, index=True)
    
    # RELACIONAMENTO EXCLUSIVO COM PROJETO
    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)
    projeto = relationship("Projeto", back_populates="pdps")
    
    # Campos de auditoria
    user_created = Column("usuario_criacao", String(255), nullable=False)
    data_created = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    # Campos de dados específicos do PDP
    orgao_contratante = Column(String, nullable=False)
    processo_pregao = Column(String, nullable=False)
    empresa_adjudicada = Column(String, nullable=False)
    cnpj_empresa = Column(String, nullable=False)
    objeto = Column(String, nullable=False)
    data_vigencia_inicio = Column(Date, nullable=False)
    data_vigencia_fim = Column(Date, nullable=True)
    tipo_fonte = Column(String, nullable=False)

    tabela_itens = Column(JSON, nullable=False)
    
    status = Column(Boolean, default=True)

# Sem imports circulares - SQLAlchemy resolve as referências por string