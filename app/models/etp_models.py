from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, JSON, Boolean, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ETP(Base):
    __tablename__ = "etp"
    __table_args__ = {"schema": "core"}  # <-- adicione schema se for necessário

    id = Column("id_etp", Integer, primary_key=True, index=True)
    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)

    projeto = relationship("Projeto", back_populates="etps")
    user_created = Column("usuario_criacao", String(255), nullable=False)
    data_created = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    # campos existentes
    unidade_demandante = Column("unidade_demandante", String)
    objeto_contratado = Column("objeto_contratacao", String)
    sist_reg_preco = Column("sist_reg_preco", Boolean)

    necessidade_contratacao = Column("justificativa", String)
    alinhamento_estrategico = Column(ARRAY(String))

    info_contratacao = Column("info_contratacao", String)

    previsto_pca = Column("previsto_pca", Boolean, nullable=False)
    item = Column("item_pca", Integer, nullable=False)

    req_contratacao = Column(ARRAY(String))
    lev_mercado = Column(JSON, nullable=False)
    solucao = Column("solucao", String)
    quantidade_estimada = Column(JSON, nullable=False)
    just_nao_parc = Column("just_nao_parc", String)
    valor_total = Column("valor_total", String)
    demonst_resultados = Column(JSON, nullable=False)
    serv_continuo = Column("serv_continuo", Boolean, nullable=False)
    justif_serv_continuo = Column("justif_serv_continuo", String)
    providencias = Column(JSON, nullable=False)
    impac_ambientais = Column("impac_ambientais", String)
    alinhamento_pls = Column(ARRAY(String))

    posic_conclusivo = Column("posic_conclusivo", Boolean, nullable=False)
    justif_posic_conclusivo = Column("justif_posic_conclusivo", String)

    equipe_de_planejamento = Column("equipe_de_planejamento", String)  # <-- adicionado
    
    status = Column(Boolean, default=True)

# ← Importar no fim para evitar problema de referência circular
from app.models.projects_models import Projeto
