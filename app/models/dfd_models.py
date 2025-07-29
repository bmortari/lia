# app/models/dfd_models.py

from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, JSON, Boolean, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DFD(Base):
    __tablename__ = "dfd"
    __table_args__ = {"schema": "core"}

    id = Column("id_dfd", Integer, primary_key=True, index=True)
    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)

    projeto = relationship("Projeto", back_populates="dfds")

    # --- CORREÇÃO AQUI ---
    # O 'back_populates' deve corresponder ao nome do atributo no modelo SolucaoIdentificada, que é 'dfd'.
    solucoes = relationship("SolucaoIdentificada", back_populates="dfd", cascade="all, delete-orphan")

    user_created = Column("usuario_criacao", String(255), nullable=False)
    data_created = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    # novos campos
    previsto_pca = Column("previsto_pca", Boolean, nullable=False)
    item = Column("item_pca", Integer, nullable=False)

    # campos existentes
    unidade_demandante = Column("unidade_demandante", String)
    objeto_contratado = Column("objeto_contratacao", String)
    justificativa_contratacao = Column("justificativa", String)
    quantidade_contratada = Column("quantidade", JSON)
    previsao_data_bem_servico = Column("previsao_da_entrega", DateTime(timezone=True), server_default=func.now())
    alinhamento_estrategico = Column(ARRAY(String))
    equipe_de_planejamento = Column("equipe_de_planejamento", String)
    
    status = Column(Boolean, default=True)

# --- CORREÇÃO AQUI ---
# Importar os modelos relacionados no final para evitar erros de referência circular.
from app.models.projects_models import Projeto
from app.models.solucao_models import SolucaoIdentificada