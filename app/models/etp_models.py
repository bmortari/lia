from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, JSON, Boolean, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ETP(Base):
    """
    Estudo Técnico Preliminar (ETP)
    Relacionamento EXCLUSIVO com Projeto - Artefato independente
    """
    __tablename__ = "etp"
    __table_args__ = {"schema": "core"}

    id = Column("id_etp", Integer, primary_key=True, index=True)
    
    # RELACIONAMENTO EXCLUSIVO COM PROJETO
    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)
    projeto = relationship("Projeto", back_populates="etps")
    
    # Campos de auditoria
    user_created = Column("usuario_criacao", String(255), nullable=False)
    data_created = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    # Campos de dados específicos do ETP
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
    equipe_de_planejamento = Column("equipe_de_planejamento", String)
    
    status = Column(Boolean, default=True)

    def to_dict(self):
        """Convert the ETP instance to a dictionary."""
        return {
            'id': self.id,
            'id_projeto': self.id_projeto,
            'user_created': self.user_created,
            'data_created': self.data_created.isoformat() if self.data_created else None,
            'unidade_demandante': self.unidade_demandante,
            'objeto_contratado': self.objeto_contratado,
            'sist_reg_preco': self.sist_reg_preco,
            'necessidade_contratacao': self.necessidade_contratacao,
            'alinhamento_estrategico': self.alinhamento_estrategico,
            'info_contratacao': self.info_contratacao,
            'previsto_pca': self.previsto_pca,
            'item': self.item,
            'req_contratacao': self.req_contratacao,
            'lev_mercado': self.lev_mercado,
            'solucao': self.solucao,
            'quantidade_estimada': self.quantidade_estimada,
            'just_nao_parc': self.just_nao_parc,
            'valor_total': self.valor_total,
            'demonst_resultados': self.demonst_resultados,
            'serv_continuo': self.serv_continuo,
            'justif_serv_continuo': self.justif_serv_continuo,
            'providencias': self.providencias,
            'impac_ambientais': self.impac_ambientais,
            'alinhamento_pls': self.alinhamento_pls,
            'posic_conclusivo': self.posic_conclusivo,
            'justif_posic_conclusivo': self.justif_posic_conclusivo,
            'equipe_de_planejamento': self.equipe_de_planejamento,
            'status': self.status
        }

# Sem imports circulares - SQLAlchemy resolve as referências por string