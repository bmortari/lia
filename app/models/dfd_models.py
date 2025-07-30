from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, JSON, Boolean, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DFD(Base):
    """
    Documento de Formalização de Demanda (DFD)
    Relacionamento EXCLUSIVO com Projeto - Artefato independente
    """
    __tablename__ = "dfd"
    __table_args__ = {"schema": "core"}

    id = Column("id_dfd", Integer, primary_key=True, index=True)
    
    # RELACIONAMENTO EXCLUSIVO COM PROJETO
    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)
    projeto = relationship("Projeto", back_populates="dfds")

    # Campos de auditoria
    user_created = Column("usuario_criacao", String(255), nullable=False)
    data_created = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    # Campos de dados específicos do DFD
    previsto_pca = Column("previsto_pca", Boolean, nullable=False)
    item = Column("item_pca", Integer, nullable=False)
    
    unidade_demandante = Column("unidade_demandante", String)
    objeto_contratado = Column("objeto_contratacao", String)
    justificativa_contratacao = Column("justificativa", String)
    quantidade_contratada = Column("quantidade", JSON)
    previsao_data_bem_servico = Column("previsao_da_entrega", DateTime(timezone=True), server_default=func.now())
    alinhamento_estrategico = Column(ARRAY(String))
    equipe_de_planejamento = Column("equipe_de_planejamento", String)
    
    status = Column(Boolean, default=True)

# Sem imports circulares - SQLAlchemy resolve as referências por string