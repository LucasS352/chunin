#!/bin/sh
# scripts/backup.sh
# Cria um backup do banco PostgreSQL do Tutu — Caminho Chūnin
# Uso: sh scripts/backup.sh

CONTAINER="tutu_db"
DB_USER="tutu"
DB_NAME="tutu_db"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILE="${BACKUP_DIR}/tutu_backup_${DATE}.sql"

mkdir -p "$BACKUP_DIR"

echo "📦 Iniciando backup do banco '$DB_NAME'..."
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup salvo em: $FILE"
else
  echo "❌ Erro ao criar o backup."
  exit 1
fi
