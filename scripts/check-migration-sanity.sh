#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Missing migrations directory: $MIGRATIONS_DIR"
  exit 1
fi

missing_begin=0
missing_commit=0

search_tool="rg"
if ! command -v rg >/dev/null 2>&1; then
  search_tool="grep"
fi

while IFS= read -r file; do
  if [[ "$search_tool" == "rg" ]]; then
    has_begin_cmd=(rg -q "^begin;" "$file")
    has_commit_cmd=(rg -q "^commit;" "$file")
  else
    has_begin_cmd=(grep -q "^begin;" "$file")
    has_commit_cmd=(grep -q "^commit;" "$file")
  fi

  if ! "${has_begin_cmd[@]}"; then
    echo "Migration missing begin statement: $file"
    missing_begin=1
  fi
  if ! "${has_commit_cmd[@]}"; then
    echo "Migration missing commit statement: $file"
    missing_commit=1
  fi
done < <(ls "$MIGRATIONS_DIR"/*.sql)

if [[ "$missing_begin" -ne 0 || "$missing_commit" -ne 0 ]]; then
  exit 1
fi

echo "Migration sanity checks passed."
