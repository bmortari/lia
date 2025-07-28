import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Carregar variáveis do .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv não instalado, usando variáveis de ambiente do sistema")

# Adicionar o path para importar seus models
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Importar seus models aqui - AJUSTE ESTE CAMINHO
try:
    from app.models import Base  # Se seus models estão em app/models.py
    target_metadata = Base.metadata
except ImportError:
    # Se ainda não tem models, deixe None por enquanto
    target_metadata = None

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Configurar URL do banco via variável de ambiente
# Alembic precisa de driver síncrono
sync_database_url = os.getenv("DATABASE_URL_SYNC")
if sync_database_url:
    config.set_main_option("sqlalchemy.url", sync_database_url)
else:
    # Fallback: pegar URL assíncrona e converter para síncrona
    async_database_url = os.getenv("DATABASE_URL")
    if async_database_url:
        if "asyncpg" in async_database_url:
            sync_database_url = async_database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        else:
            sync_database_url = async_database_url
        config.set_main_option("sqlalchemy.url", sync_database_url)
    else:
        # Construir URL a partir das variáveis individuais
        user = os.getenv("POSTGRES_USER", "user")
        password = os.getenv("POSTGRES_PASS", "password") 
        host = os.getenv("POSTGRES_HOST", "db")
        port = os.getenv("POSTGRES_PORT", "5432")
        database = os.getenv("POSTGRES_DB", "mydb")
        
        # Usar psycopg2 para Alembic
        sync_database_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"
        config.set_main_option("sqlalchemy.url", sync_database_url)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()