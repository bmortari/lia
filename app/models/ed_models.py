from sqlalchemy import JSON, Column, ForeignKey, Integer, String
from app.database import Base
from sqlalchemy.orm import relationship

class ED(Base):
    __tablename__= "edital"
    __table_args__ = {"schema": "core"}

    id = Column("id_edital", Integer, primary_key=True, index=True)

    id_projeto = Column(Integer, ForeignKey("core.projeto.id_projeto", ondelete="CASCADE"), nullable=False)
    projeto = relationship("Projeto", back_populates="projeto")

    user_created = Column("usuario_criacao", String(255), nullable=False)
    data_created = Column("data_criacao")

    objeto = Column(JSON, nullable=True)