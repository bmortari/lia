#!/bin/bash
set -e

echo "⏳ Aguardando o banco de dados ficar disponível..."

until pg_isready -h db -p 5432 -U lia_admin; do
  sleep 1
done

echo "✅ Banco de dados está pronto. Executando seed..."

psql -h db -U lia_admin -d lia_db -f /seed/seed.sql

echo "✅ Seed finalizado com sucesso."
