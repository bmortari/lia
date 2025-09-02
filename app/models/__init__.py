# app/models/__init__.py
"""
Importação centralizada de todos os modelos para resolver dependências do SQLAlchemy.

IMPORTANTE: Este arquivo deve ser importado antes de qualquer operação com o banco de dados
para garantir que todas as classes sejam registradas no SQLAlchemy registry.
"""

# Importar o Base primeiro
from app.database import Base

# Importar o modelo principal
from app.models.projects_models import Projeto

# Importar todos os artefatos
from app.models.dfd_models import DFD
from app.models.etp_models import ETP
from app.models.pdp_models import PDP
from app.models.pgr_models import PGR
from app.models.tr_models import TR
from app.models.solucao_models import SolucaoIdentificada

# Lista de todas as classes de modelo (útil para debugging)
__all__ = [
    "Base",
    "Projeto", 
    "DFD",
    "ETP", 
    "PDP",
    "PGR",
    "TR",
    "SolucaoIdentificada"
]

# Verificação opcional - garante que todas as classes foram registradas
def verificar_modelos():
    """
    Função utilitária para verificar se todos os modelos foram registrados corretamente.
    """
    modelos_registrados = [mapper.class_.__name__ for mapper in Base.registry.mappers]
    print("Modelos SQLAlchemy registrados:", modelos_registrados)
    return modelos_registrados

# Exemplo de uso no main.py ou onde o SQLAlchemy é configurado:
"""
# main.py ou database.py
import app.models  # Isso importa todos os modelos automaticamente

# Depois pode usar create_all() normalmente
# await Base.metadata.create_all(bind=engine)
"""