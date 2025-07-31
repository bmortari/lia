from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
import logging
import os
import re
from pathlib import Path
from typing import Dict, Any

router = APIRouter()
logger = logging.getLogger(__name__)

def parse_sql_commands(sql_content: str) -> list[str]:
    """
    Parse SQL commands from a file content, handling multi-line statements properly.
    """
    # Remove comentários de linha completa (-- no início da linha)
    lines = sql_content.split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        # Pular linhas de comentário completas
        if line.startswith('--') or line.startswith('/*') or not line:
            continue
        # Remover comentários inline (-- no meio da linha)
        if '--' in line:
            line = line.split('--')[0].strip()
        if line:
            cleaned_lines.append(line)
    
    # Juntar todas as linhas e dividir por ponto e vírgula
    cleaned_sql = ' '.join(cleaned_lines)
    
    # Dividir por ponto e vírgula e limpar
    commands = []
    for cmd in cleaned_sql.split(';'):
        cmd = cmd.strip()
        # Filtrar comandos vazios ou muito pequenos
        if cmd and len(cmd) > 5:  # Mínimo de 5 caracteres para ser um comando válido
            commands.append(cmd)
    
    return commands

@router.post("/popular-dados-demo")
async def popular_dados_demo(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Endpoint para popular o banco com dados de demonstração.
    Lê o arquivo seed_example.sql da pasta seed e executa no banco.
    """
    try:
        # Verificar se já existem dados
        result = await db.execute(text("SELECT COUNT(*) as total FROM core.projeto"))
        row = result.fetchone()
        if row and row.total > 0:
            return {
                "message": "Dados demo já existem no banco",
                "projetos_existentes": row.total,
                "status": "ja_populado"
            }

        # Caminho para o arquivo SQL
        current_dir = Path(__file__).parent.parent  # Volta para o diretório app
        sql_file_path = current_dir / "seed" / "seed_example.sql"
        
        # Verificar se arquivo existe
        if not sql_file_path.exists():
            logger.error(f"Arquivo SQL não encontrado: {sql_file_path}")
            raise HTTPException(
                status_code=404,
                detail=f"Arquivo seed_example.sql não encontrado em: {sql_file_path}"
            )

        # Ler o arquivo SQL
        try:
            with open(sql_file_path, 'r', encoding='utf-8') as file:
                demo_sql = file.read()
        except Exception as e:
            logger.error(f"Erro ao ler arquivo SQL: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao ler arquivo SQL: {str(e)}"
            )

        # Verificar se o arquivo não está vazio
        if not demo_sql.strip():
            raise HTTPException(
                status_code=400,
                detail="Arquivo SQL está vazio"
            )

        # Log do conteúdo do arquivo para debug
        logger.info(f"Conteúdo do arquivo SQL (primeiros 500 chars): {demo_sql[:500]}")

        # Parse melhorado dos comandos SQL
        sql_commands = parse_sql_commands(demo_sql)
        
        logger.info(f"Total de comandos SQL encontrados: {len(sql_commands)}")
        
        if not sql_commands:
            logger.warning("Nenhum comando SQL válido encontrado no arquivo")
            logger.warning(f"Conteúdo completo do arquivo:\n{demo_sql}")
            raise HTTPException(
                status_code=400,
                detail="Nenhum comando SQL válido encontrado no arquivo"
            )
        
        executed_commands = 0
        insert_commands = 0
        update_commands = 0
        delete_commands = 0
        
        for i, command in enumerate(sql_commands):
            logger.info(f"Executando comando {i+1}/{len(sql_commands)}: {command[:100]}...")
            
            try:
                # Executar comando SQL
                result = await db.execute(text(command))
                executed_commands += 1
                
                # Contar tipos de comandos
                cmd_upper = command.upper().strip()
                if cmd_upper.startswith('INSERT'):
                    insert_commands += 1
                elif cmd_upper.startswith('UPDATE'):
                    update_commands += 1
                elif cmd_upper.startswith('DELETE'):
                    delete_commands += 1
                    
                logger.info(f"Comando executado com sucesso. Rows affected: {result.rowcount}")
                
            except Exception as cmd_error:
                logger.error(f"Erro ao executar comando SQL {i+1}: {str(cmd_error)}")
                logger.error(f"Comando completo: {command}")
                await db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro ao executar comando SQL {i+1}: {str(cmd_error)}"
                )

        # Commit apenas se todos os comandos foram executados com sucesso
        await db.commit()

        # Verificar quantos registros foram inseridos
        contadores = {}
        tabelas = ['projeto', 'dfd', 'etp', 'pdp', 'solucao_identificada', 'pgr']
        
        for tabela in tabelas:
            try:
                result = await db.execute(text(f"SELECT COUNT(*) as total FROM core.{tabela}"))
                row = result.fetchone()
                contadores[tabela] = row.total if row else 0
            except Exception as e:
                logger.warning(f"Erro ao contar registros da tabela {tabela}: {str(e)}")
                contadores[tabela] = 0

        logger.info(f"Dados demo populados com sucesso: {contadores}")
        logger.info(f"Comandos SQL executados: {executed_commands} (INSERTs: {insert_commands}, UPDATEs: {update_commands}, DELETEs: {delete_commands})")

        return {
            "message": "Dados demo populados com sucesso!",
            "status": "sucesso",
            "dados_inseridos": contadores,
            "total_projetos": contadores.get('projeto', 0),
            "comandos_executados": executed_commands,
            "insert_commands": insert_commands,
            "update_commands": update_commands,
            "delete_commands": delete_commands,
            "arquivo_origem": str(sql_file_path)
        }

    except HTTPException:
        # Re-raise HTTPExceptions sem modificar
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao popular dados demo: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao popular dados demo: {str(e)}"
        )

@router.get("/verificar-arquivo-seed")
async def verificar_arquivo_seed() -> Dict[str, Any]:
    """
    Endpoint para verificar se o arquivo seed existe e está acessível.
    Inclui parsing dos comandos para debug.
    """
    try:
        current_dir = Path(__file__).parent.parent
        sql_file_path = current_dir / "seed" / "seed_example.sql"
        
        # Informações básicas do arquivo
        info = {
            "arquivo_path": str(sql_file_path),
            "arquivo_existe": sql_file_path.exists(),
            "arquivo_legivel": sql_file_path.is_file() if sql_file_path.exists() else False,
            "tamanho_bytes": sql_file_path.stat().st_size if sql_file_path.exists() else 0,
            "current_dir": str(current_dir),
            "working_directory": str(Path.cwd())
        }
        
        # Ler conteúdo e fazer parsing se arquivo existe
        if sql_file_path.exists():
            try:
                with open(sql_file_path, 'r', encoding='utf-8') as file:
                    conteudo_completo = file.read()
                    
                info["conteudo_amostra"] = conteudo_completo[:1000]  # Primeiros 1000 chars
                
                # Parse dos comandos SQL
                sql_commands = parse_sql_commands(conteudo_completo)
                info["total_comandos_sql"] = len(sql_commands)
                info["comandos_preview"] = [cmd[:100] + "..." if len(cmd) > 100 else cmd for cmd in sql_commands[:5]]
                
            except Exception as e:
                info["erro_leitura"] = str(e)
        
        return info
        
    except Exception as e:
        return {
            "erro": str(e),
            "working_directory": str(Path.cwd())
        }

@router.delete("/limpar-dados-demo")
async def limpar_dados_demo(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Endpoint para limpar todos os dados demo do banco.
    Útil para testar o processo de inserção novamente.
    """
    try:
        tabelas = ['pgr', 'solucao_identificada', 'pdp', 'etp', 'dfd', 'projeto']  # Ordem inversa para evitar problemas de FK
        
        contadores_antes = {}
        contadores_depois = {}
        
        # Contar registros antes
        for tabela in reversed(tabelas):  # Reverter para contar na ordem normal
            try:
                result = await db.execute(text(f"SELECT COUNT(*) as total FROM core.{tabela}"))
                row = result.fetchone()
                contadores_antes[tabela] = row.total if row else 0
            except Exception as e:
                contadores_antes[tabela] = 0
        
        # Deletar em ordem correta (considerando FKs)
        for tabela in tabelas:
            try:
                result = await db.execute(text(f"DELETE FROM core.{tabela}"))
                logger.info(f"Deletados {result.rowcount} registros da tabela {tabela}")
            except Exception as e:
                logger.warning(f"Erro ao deletar dados da tabela {tabela}: {str(e)}")
        
        await db.commit()
        
        # Contar registros depois
        for tabela in reversed(tabelas):
            try:
                result = await db.execute(text(f"SELECT COUNT(*) as total FROM core.{tabela}"))
                row = result.fetchone()
                contadores_depois[tabela] = row.total if row else 0
            except Exception as e:
                contadores_depois[tabela] = 0
        
        return {
            "message": "Dados demo limpos com sucesso!",
            "status": "sucesso",
            "contadores_antes": contadores_antes,
            "contadores_depois": contadores_depois
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao limpar dados demo: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao limpar dados demo: {str(e)}"
        )