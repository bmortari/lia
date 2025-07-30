from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class PGR(Base):
    """
    Plano de Gerenciamento de Riscos (PGR)
    Relacionamento EXCLUSIVO com Projeto - Artefato independente
    """
    __tablename__ = "pgr"
    __table_args__ = {"schema": "core"}

    id_pgr = Column(Integer, primary_key=True, index=True)

    # RELACIONAMENTO EXCLUSIVO COM PROJETO
    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)
    projeto = relationship("Projeto", back_populates="pgrs")

    # --- NOVA RELAÇÃO DIRETA COM SOLUÇÃO ---
    # Opcional, pode ser nulo se um PGR não tiver uma solução diretamente ligada
    id_solucao = Column(Integer, ForeignKey("core.solucao_identificada.id_solucao"), nullable=True) 
    solucao = relationship("SolucaoIdentificada", back_populates="pgrs_associados")

    # Campos de auditoria
    usuario_criacao = Column("usuario", String(255), nullable=False)
    data_criacao = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    # Campos de dados específicos do PGR
    objeto = Column(Text, nullable=True, comment="Objeto do contrato extraído do DFD")
    risco = Column(JSON, nullable=True, comment="JSON contendo a análise de riscos detalhada")

# Sem imports circulares - SQLAlchemy resolve as referências por string