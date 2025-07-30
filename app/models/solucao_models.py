# app/models/solucao_models.py

from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SolucaoIdentificada(Base):
    __tablename__ = "solucao_identificada"
    __table_args__ = {"schema": "core"}

    id_solucao = Column(Integer, primary_key=True, index=True)
    
    # CORREÇÃO: Relacionamento com PDP adicionado
    id_pdp = Column(Integer, ForeignKey("core.pdp.id_pdp", ondelete="CASCADE"), nullable=False)
    
    # Relacionamento com PDP
    pdp = relationship("PDP", back_populates="solucoes")
    
    # CORREÇÃO: Campos de auditoria adicionados
    usuario_criacao = Column("usuario_criacao", String(255), nullable=False)
    data_criacao = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    # Campos existentes
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    palavras_chave = Column(JSON, nullable=True)
    complexidade_estimada = Column(String, nullable=True)
    tipo = Column(String, nullable=True)
    analise_riscos = Column(JSON, nullable=True)