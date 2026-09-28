#!/usr/bin/env bash
# Funciona no Linux e no Git Bash do Windows.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    if command -v py >/dev/null 2>&1; then
      exec py -3 "$ROOT_DIR/run.py" "$@"
    fi
    ;;
esac

if command -v python3 >/dev/null 2>&1; then
  exec python3 "$ROOT_DIR/run.py" "$@"
fi
if command -v python >/dev/null 2>&1; then
  exec python "$ROOT_DIR/run.py" "$@"
fi

echo "Python 3 não encontrado no PATH." >&2
exit 1
