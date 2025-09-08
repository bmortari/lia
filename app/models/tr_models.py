from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime, 
    Numeric, ForeignKey, ARRAY, JSON, func
)
from sqlalchemy.orm import relationship, column_property
from app.database import Base

class TR(Base):
    __tablename__ = "tr"
    __table_args__ = {"schema": "core"}

    id = Column("id_tr", Integer, primary_key=True, index=True)
    
    # Relacionamento com Projeto
    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)
    projeto = relationship("Projeto", back_populates="trs")
    
    # Metadados
    user_created = Column("usuario_criacao", String(255), nullable=False)
    data_created = Column("data_criacao", DateTime(timezone=True), server_default=func.now())
    
    # === Informações Básicas ===
    orgao_contratante = Column(String)
    tipo_contratacao = Column(String)  # 'compras' ou 'servicos'
    objeto_contratacao = Column(Text)
    modalidade_licitacao = Column(String)  # 'aquisicao_direta' ou 'registro_precos'
    fundamentacao_legal = Column(Text)
    
    # === Vigência e Prazos ===
    prazo_vigencia_contrato = Column(String)
    prazo_entrega_prestacao = Column(String)
    local_entrega_prestacao = Column(Text)
    
    # === Obrigações ===
    obrigacoes_contratante = Column(ARRAY(String))
    obrigacoes_contratada = Column(ARRAY(String))
    
    # === Flags Booleanas ===
    admite_subcontratacao = Column(Boolean, default=False)
    exige_garantia_contratual = Column(Boolean, default=False)
    
    # === Pagamento e Sanções ===
    condicoes_pagamento = Column(Text)
    sancoes_administrativas = Column(Text)
    
    # === Responsável ===
    responsavel = Column(String)
    cargo_responsavel = Column(String)
    
    # === Sistema de Registro de Preços (armazenado como JSON) ===
    sistema_registro_precos = Column(JSON, nullable=True)
    # Estrutura esperada:
    # {
    #     "adota_srp": bool,
    #     "tipo_srp": str,
    #     "quantidade_maxima": bool,
    #     "quantidade_minima_cotacao": str,
    #     "permite_precos_diferentes": bool,
    #     "justificativa_precos_diferentes": str,
    #     "permite_proposta_inferior": bool,
    #     "criterio_julgamento": "item" | "grupo",
    #     "registro_limitado": bool,
    #     "criterio_reajuste": str,
    #     "vigencia_ata": str
    # }

    descricao_solucao = Column(String)
    
    # === Requisitos da Contratação (armazenado como JSON) ===
    requisitos_contratacao = Column(JSON, nullable=True)
    # Estrutura esperada:
    # {
    #     "sustentabilidade": str,
    #     "indicacao_marcas": str,
    #     "vedacao_marca_produto": str,
    #     "exige_amostra": bool,
    #     "exige_carta_solidariedade": bool,
    #     "garantia_produto_servico": str,
    #     "exige_vistoria": bool
    # }
    
    # === Modelo de Execução (armazenado como JSON) ===
    modelo_execucao = Column(JSON, nullable=True)
    # Estrutura esperada:
    # {
    #     "condicoes_entrega": str,
    #     "garantia_manutencao": str,
    #     "materiais_fornecidos": str,
    #     "informacoes_proposta": str
    # }
    
    # === Gestão do Contrato (armazenado como JSON) ===
    gestao_contrato = Column(JSON, nullable=True)
    # Estrutura esperada:
    # {
    #     "modelo_gestao": str,
    #     "papeis_responsabilidades": str
    # }
    
    # === Critérios de Pagamento (armazenado como JSON) ===
    criterios_pagamento = Column(JSON, nullable=True)
    # Estrutura esperada:
    # {
    #     "recebimento_objeto": str,
    #     "liquidacao": str,
    #     "prazo_pagamento": str,
    #     "forma_pagamento": str,
    #     "antecipacao_pagamento": bool,
    #     "cessao_credito": str
    # }
    
    # === Seleção do Fornecedor (armazenado como JSON) ===
    selecao_fornecedor = Column(JSON, nullable=True)
    # Estrutura esperada:
    # {
    #     "forma_selecao": str,
    #     "criterio_julgamento": str,
    #     "exigencias_habilitacao": {
    #         "juridica": [],
    #         "fiscal_trabalhista": [],
    #         "economico_financeira": [],
    #         "tecnica": []
    #     }
    # }
    
    # === Estimativa de Valor (armazenado como JSON) ===
    estimativa_valor = Column(JSON, nullable=True)
    # Estrutura esperada:
    # {
    #     "valor_total": float,
    #     "valor_unitario": float,
    #     "metodologia_pesquisa": str
    # }
    
    # === Adequação Orçamentária (armazenado como JSON) ===
    adequacao_orcamentaria = Column(JSON, nullable=True)
    # Estrutura esperada:
    # {
    #     "fonte_recursos": str,
    #     "classificacao_orcamentaria": str,
    #     "previsao_pca": bool,
    #     "codigo_pca": str | None
    # }
    
    # Referência ao arquivo gerado
    arquivo_docx_ref = Column(String, nullable=True)
    
    # Relacionamento com itens
    itens = relationship(
        "TRItem",
        back_populates="tr",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class TRItem(Base):
    __tablename__ = "tr_item"
    __table_args__ = {"schema": "core"}

    id = Column("id_item", Integer, primary_key=True, index=True)
    
    # FK para o TR
    id_tr = Column(Integer, ForeignKey("core.tr.id_tr", ondelete="CASCADE"), nullable=False)
    tr = relationship("TR", back_populates="itens")
    
    # === Campos do Item ===
    descricao = Column(Text, nullable=False)
    especificacoes_tecnicas = Column(ARRAY(String), nullable=True)
    quantidade = Column(Numeric(10, 3), nullable=False)
    valor_unitario = Column(Numeric(14, 2), nullable=True)
    valor_total = column_property(quantidade * valor_unitario)
    unidade_medida = Column(String, nullable=False)
    codigo_catmat_catser = Column(String, nullable=True)
    finalidade = Column(Text, nullable=True)