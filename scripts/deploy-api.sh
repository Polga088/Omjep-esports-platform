#!/usr/bin/env bash

set -Eeuo pipefail

APP_NAME="omjep-api"
PROJECT_DIR="/root/Omjep-esports-platform"
DATABASE_SCHEMA_PATH="packages/database/prisma/schema.prisma"
CURRENT_HEAD=""
ROLLED_BACK="false"

print_step() {
  echo
  echo "==> $1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

resolve_database_url() {
  local pm2_env_json
  pm2_env_json="$(pm2 jlist 2>/dev/null || true)"
  if [[ -n "$pm2_env_json" ]]; then
    local from_pm2
    from_pm2="$(printf '%s' "$pm2_env_json" | node -e '
      let input = ""
      process.stdin.on("data", c => (input += c))
      process.stdin.on("end", () => {
        try {
          const apps = JSON.parse(input)
          const app = apps.find(a => a?.name === "omjep-api")
          const value = app?.pm2_env?.DATABASE_URL || app?.pm2_env?.env?.DATABASE_URL || ""
          process.stdout.write(value)
        } catch {
          process.stdout.write("")
        }
      })
    ')"
    if [[ -n "$from_pm2" ]]; then
      echo "$from_pm2"
      return 0
    fi
  fi

  if [[ -n "${DATABASE_URL:-}" ]]; then
    echo "$DATABASE_URL"
    return 0
  fi

  local env_file="$PROJECT_DIR/apps/api/.env"
  if [[ -f "$env_file" ]]; then
    local from_env
    from_env="$(rg '^DATABASE_URL=' "$env_file" -N -m 1 | sed 's/^DATABASE_URL=//')"
    if [[ -n "$from_env" ]]; then
      echo "$from_env"
      return 0
    fi
  fi

  echo ""
}

run_deploy_steps() {
  print_step "Updating git repository"
  git fetch --all --prune
  git pull --ff-only

  print_step "Installing dependencies"
  pnpm install --frozen-lockfile

  print_step "Building database package"
  pnpm --filter @omjep/database build

  print_step "Building API package"
  pnpm --filter @omjep/api build

  local db_url
  db_url="$(resolve_database_url)"

  if [[ -n "$db_url" && -f "$DATABASE_SCHEMA_PATH" ]]; then
    print_step "Running prisma db push"
    DATABASE_URL="$db_url" pnpm --filter @omjep/database exec prisma db push
  else
    print_step "Skipping prisma db push (DATABASE_URL or schema missing)"
  fi

  print_step "Reloading PM2 process"
  pm2 reload "$APP_NAME" --update-env
  pm2 save

  print_step "PM2 status"
  pm2 status "$APP_NAME"
}

rollback_on_failure() {
  local exit_code="$1"
  if [[ "$ROLLED_BACK" == "true" ]]; then
    exit "$exit_code"
  fi

  echo
  echo "Deployment failed with code $exit_code. Starting rollback..."
  ROLLED_BACK="true"

  if [[ -n "$CURRENT_HEAD" ]]; then
    git reset --hard "$CURRENT_HEAD"
    pnpm --filter @omjep/database build || true
    pnpm --filter @omjep/api build || true
    pm2 reload "$APP_NAME" --update-env || true
    pm2 save || true
    pm2 status "$APP_NAME" || true
    echo "Rollback complete: restored to $CURRENT_HEAD"
  else
    echo "Rollback skipped: could not determine previous HEAD."
  fi

  exit "$exit_code"
}

main() {
  require_command git
  require_command pnpm
  require_command pm2
  require_command node
  require_command rg

  if [[ ! -d "$PROJECT_DIR" ]]; then
    echo "Project directory not found: $PROJECT_DIR" >&2
    exit 1
  fi

  cd "$PROJECT_DIR"
  CURRENT_HEAD="$(git rev-parse HEAD)"

  trap 'rollback_on_failure $?' ERR

  run_deploy_steps

  trap - ERR
  echo
  echo "Deployment finished successfully."
}

main "$@"
