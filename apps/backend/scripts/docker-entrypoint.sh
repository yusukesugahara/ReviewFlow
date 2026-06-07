#!/bin/sh
set -eu

if [ "${SEED_DEMO_ON_START:-}" = "true" ] || [ "${SEED_DEMO_ON_START:-}" = "1" ]; then
  echo "SEED_DEMO_ON_START is enabled. Running demo seed..."
  node apps/backend/dist/scripts/seed-demo.js
fi

exec "$@"
