# app/models/solucao_models.py

from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class SolucaoIdentificada(Base):
    __tablename__ = "solucao_identificada"
    __table_args__ = {"schema": "core"}

    id_solucao = Column(Integer, primary_key=True, index=True)
    id_dfd = Column(Integer, ForeignKey("core.dfd.id_dfd", ondelete="CASCADE"), nullable=False)

    # --- CORREÇÃO AQUI ---
    # O 'back_populates' deve corresponder ao nome do atributo no modelo DFD, que é 'solucoes'.
    dfd = relationship("DFD", back_populates="solucoes")

    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    palavras_chave = Column(JSON, nullable=True)
    complexidade_estimada = Column(String, nullable=True)
    tipo = Column(String, nullable=True)
    analise_riscos = Column(JSON, nullable=True)

# --- CORREÇÃO AQUI ---
# Importar o modelo DFD no final do arquivo. O import de Projeto não era necessário aqui.
from app.models.dfd_models import DFD