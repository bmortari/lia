from sqlalchemy import Column, Date, Integer, ForeignKey, Numeric, String, DateTime, JSON, Boolean, ARRAY, Text
from sqlalchemy.orm import relationship, column_property
from sqlalchemy.sql import func
from app.database import Base

# class TR(Base):
#     """
#     Termo de Referência (TR)
#     Relacionamento EXCLUSIVO com Projeto - Artefato independente
#     """
#     __tablename__ = "tr"
#     __table_args__ = {"schema": "core"}

#     id = Column("id_tr", Integer, primary_key=True, index=True)
    
#     # RELACIONAMENTO EXCLUSIVO COM PROJETO
#     id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)
#     projeto = relationship("Projeto", back_populates="trs")

#     # Campos de auditoria
#     user_created = Column("usuario_criacao", String(255), nullable=False)
#     data_created = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

#     # Campos de dados específicos do TR
#     tipo_contratacao = Column("tipo_contratacao", String) # objeto ou serviço
#     objeto_contratacao = Column("objeto_contratacao", String) # o que vai ser contratado
#     #justificativa_necessidade = Column("justificativa_necessidade", String) # finalidade
#     # tabela_itens = Column(JSON, nullable=False) // criar tabela TRItem
#     detalhes_solucao = Column("detalhes_solucao", JSON)
#     srp = Column("srp", JSON)
#     prazos = Column("prazos", JSON)
#     requisitos_contratacao = Column("requisitos_contratacao", JSON)
#     modelo_execucao = Column("modelo_execucao", JSON)
#     estimativa_valor = Column("estimativa_valor", JSON)
#     criterios_pagamento = Column("criterios_pagamento", JSON)
#     criterios_selecao = Column("criterios_selecao", JSON)
#     equipe_planejamento = Column("equipe_planejamento", String)
    
    # status = Column(Boolean, default=True)

class TR(Base):
    __tablename__ = "tr"
    __table_args__ = {"schema": "core"}

    id = Column("id_tr", Integer, primary_key=True, index=True)

    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)
    projeto = relationship("Projeto", back_populates="trs")

    user_created = Column("usuario_criacao", String(255), nullable=False)
    data_created = Column("data_criacao", DateTime(timezone=True), server_default=func.now())

    orgao_contratante = Column(String)
    numero_processo = Column(String)

    aquisicao_ou_formacao = Column(String) #  aquisição ou formação de registro de preços
    tipo_contratacao  = Column("tipo_contratacao", String) # objeto ou serviço
    objeto_contratacao = Column("objeto_contracao", String) # itens ou serviços a serem contratados #ok
    modalidade_contratacao = Column(String, nullable=False) 

    fundamentacao_legal = Column(Text, nullable=True)

    prazo_vigencia_contrato = Column(String, nullable=True)
    obrigacoes_contratante = Column(ARRAY(String),  nullable=True)
    obrigacoes_contratada = Column(ARRAY(String), nullable=True)

    admite_subcontratacao = Column(Boolean, nullable=False)
    exige_garantia_contratual = Column(Boolean, nullable=False)

    # TR pode ser apenas para registro de preços, portanto nullable
    local_entrega_prestacao = Column(String, nullable=True) 
    prazo_entrega_prestacao = Column(Date, nullable=True)

    condicoes_pagamento = Column(Text, nullable=True)
    sancoes_administrativas = Column(Text, nullable=True)

    responsavel = Column(String)
    cargo_responsavel = Column(String)

    arquivo_docx_ref = Column("arquivo_docx_ref", String, nullable=True)

class TRItem(Base):
    __tablename__ = "tr_item"
    __table_args__ = {"schema": "core"}

    id = Column("id_item", Integer, primary_key=True, index=True)

    # FK para o TR
    id_tr = Column(Integer, ForeignKey("core.tr.id_tr", ondelete="CASCADE"), nullable=False)
    tr = relationship("TR", back_populates="itens")

    # Campos específicos do item
    descricao = Column(String, nullable=False)        # descrição do bem/serviço
    cod_catmat = Column(String, nullable=True)        # catalogo de materiais sustentaveis
    unidade_medida = Column(String, nullable=False)   # unidade, metro, etc
    quantidade = Column(Integer, nullable=False)
    valor_unitario = Column(Numeric(14, 2))
    valor_total = column_property(quantidade * valor_unitario)
    
    finalidade = Column(Text, nullable=False)         # finalidade específica do item


