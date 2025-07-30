from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SolucaoIdentificada(Base):
    """
    Solução Identificada
    Relacionamento EXCLUSIVO com Projeto - Artefato independente
    """
    __tablename__ = "solucao_identificada"
    __table_args__ = {"schema": "core"}

    id_solucao = Column(Integer, primary_key=True, index=True)
    
    # RELACIONAMENTO EXCLUSIVO COM PROJETO
    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)
    projeto = relationship("Projeto", back_populates="solucoes")
    
    pgrs_associados = relationship("PGR", back_populates="solucao")

    # Campos de auditoria
    usuario_criacao = Column("usuario_criacao", String(255), nullable=False)
    data_criacao = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    # Campos de dados específicos da Solução
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    palavras_chave = Column(JSON, nullable=True)
    complexidade_estimada = Column(String, nullable=True)
    tipo = Column(String, nullable=True)
    analise_riscos = Column(JSON, nullable=True)

# Sem imports circulares - SQLAlchemy resolve as referências por string