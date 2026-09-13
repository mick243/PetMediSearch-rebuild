#!/bin/sh
# DB 백업.
#
# 지금까지 백업이 하나도 없었습니다. 디스크가 날아가거나 실수로 지우면
# 회원·글·후기가 전부 사라지고 되돌릴 방법이 없습니다.
#
# 쓰는 법 (docker compose 로 띄운 경우, 레포 루트에서):
#   sh server/scripts/backup.sh
#
# 매일 새벽 4시에 돌리려면 crontab -e 에 아래 한 줄:
#   0 4 * * * cd /path/to/PetMediSearch-rebuild && sh server/scripts/backup.sh >> /var/log/pms-backup.log 2>&1
#
# 주의: 이 파일이 만드는 백업은 **같은 서버 안**에 있습니다. 서버가 통째로
# 사라지는 경우까지 대비하려면 만들어진 파일을 다른 곳(S3 등)으로 옮겨야 합니다.

set -eu

# ── 설정 ────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-./backups}"
# 며칠치를 남길지. 넘은 것은 지웁니다.
KEEP_DAYS="${KEEP_DAYS:-14}"
# compose 의 DB 서비스 이름
DB_SERVICE="${DB_SERVICE:-db}"

# server/.env 에서 접속 정보를 읽습니다.
ENV_FILE="${ENV_FILE:-./server/.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "환경 파일이 없습니다: $ENV_FILE" >&2
  exit 1
fi

# 주석과 빈 줄을 걸러 읽습니다.
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "DB_PASSWORD 를 읽지 못했습니다." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/petmedisearch-$STAMP.sql.gz"

echo "백업 시작: $OUT"

# --single-transaction: 표를 잠그지 않고 일관된 시점을 뜹니다 (InnoDB).
#                       백업 도는 동안에도 서비스가 계속 돌아갑니다.
# --routines --events:  저장 프로시저와 이벤트도 함께 (지금은 없지만 생기면 자동 포함)
# --default-character-set=utf8mb4: 빼면 한글이 깨집니다.
#
# 비밀번호는 인자가 아니라 환경변수로 넘깁니다. 인자로 주면 같은 서버의 다른
# 사용자가 ps 로 볼 수 있습니다.
if ! MYSQL_PWD="$DB_PASSWORD" docker compose exec -T \
      -e MYSQL_PWD="$DB_PASSWORD" "$DB_SERVICE" \
      mysqldump \
        --single-transaction \
        --routines --events \
        --default-character-set=utf8mb4 \
        -u"$DB_USER" "$DB_NAME" \
    | gzip > "$OUT"; then
  echo "백업 실패" >&2
  # 반쯤 쓰다 만 파일은 지웁니다. 남겨 두면 나중에 멀쩡한 백업으로 착각합니다.
  rm -f "$OUT"
  exit 1
fi

# 파일이 너무 작으면 덤프가 제대로 안 된 것입니다 (빈 파일도 gzip 하면 20바이트쯤 됩니다).
SIZE=$(wc -c < "$OUT")
if [ "$SIZE" -lt 1024 ]; then
  echo "백업 파일이 너무 작습니다 (${SIZE}바이트). 실패로 봅니다." >&2
  rm -f "$OUT"
  exit 1
fi

echo "백업 완료: $OUT (${SIZE}바이트)"

# 오래된 것 정리
find "$BACKUP_DIR" -name 'petmedisearch-*.sql.gz' -type f -mtime "+$KEEP_DAYS" -print -delete

echo "남은 백업:"
ls -1 "$BACKUP_DIR" | tail -5

# 되돌리는 법:
#   gunzip -c backups/petmedisearch-YYYYmmdd-HHMMSS.sql.gz \
#     | docker compose exec -T db mysql --default-character-set=utf8mb4 -uroot -p<암호> petmedisearch
