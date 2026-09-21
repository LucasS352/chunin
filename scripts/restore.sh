#!/bin/sh
# scripts/restore.sh
# Restaura um backup do banco PostgreSQL do Tutu — Caminho Chūnin
# Uso: sh scripts/restore.sh ./backups/tutu_backup_20261001_120000.sql

CONTAINER="tutu_db"
DB_USER="tutu"
DB_NAME="tutu_db"
FILE="$1"

if [ -z "$FILE" ]; then
  echo "❌ Informe o arquivo de backup como argumento."
  echo "   Uso: sh scripts/restore.sh ./backups/tutu_backup_XXXXXXXX.sql"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "❌ Arquivo não encontrado: $FILE"
  exit 1
fi

echo "⚠️  ATENÇÃO: Isso vai SOBRESCREVER todos os dados do banco '$DB_NAME'."
printf "   Confirma? (s/N) "
read CONFIRM

if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
  echo "Operação cancelada."
  exit 0
fi

echo "🔄 Restaurando banco '$DB_NAME' a partir de: $FILE"
cat "$FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
  echo "✅ Banco restaurado com sucesso."
else
  echo "❌ Erro ao restaurar o banco."
  exit 1
fi
