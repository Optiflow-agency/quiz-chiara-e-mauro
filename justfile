# Run `just` to list recipes.
set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

# --- App ---

# Install dependencies
install:
    npm install

# Start the local database (if needed) and the dev server
dev: db-migrate
    echo 'supabase mail pit at http://127.0.0.1:54324/'
    npm run dev

# Production build
build:
    npm run build

# Preview the production build
preview: build
    npm run preview

# --- Quality ---

# Type-check (svelte-check)
check:
    npm run check

# Lint (prettier + eslint)
lint:
    npm run lint

# Format all files
fmt:
    npm run format

# Run unit tests once
test:
    npm test

# Count lines of code and docs by category (gross)
loc:
    ./scripts/loc.sh

# Everything CI should pass
verify: check lint test build

# --- Map ---

# Write the rulebook for the reviewers to docs/rulebook.md
rulebook:
    node scripts/rulebook.ts > docs/rulebook.md
    npx prettier --write docs/rulebook.md

# Write the audit for colleagues (schede, conditions, rules, personas) to docs/ as a PDF; needs Chrome
audit:
    node scripts/audit.ts

# Render the nine persona maps to .samples/ and print each page's fit level
samples:
    node scripts/map-samples.ts

# One PDF for review: each persona's page (who they are, their answers), then their map
review:
    node scripts/map-review.ts

# --- Supabase (local stack, needs Docker) ---

# Start the local Supabase stack (no-op if already running)
db-start:
    npx supabase status >/dev/null 2>&1 || npx supabase start

# Stop the local Supabase stack
db-stop:
    npx supabase stop

# Show local Supabase status and keys
db-status:
    npx supabase status

# Recreate the local database from migrations
db-reset: db-start
    npx supabase db reset

# Create a new migration: just db-migration add_consents
db-migration name:
    npx supabase migration new {{ name }}

# Apply pending migrations to the local database (keeps data)
db-migrate: db-start
    npx supabase migration up

# List migrations (local vs applied)
db-migrations:
    npx supabase migration list --local

# Lint the local database schema
db-lint: db-start
    npx supabase db lint --local

# Show schema changes not yet captured in a migration
db-diff: db-start
    npx supabase db diff --local

# Apply pending migrations to the linked (production) project
db-push-prd:
    npx supabase db push --linked

# Start the local stack unless PUBLIC_SUPABASE_URL (e.g. from `just -E .env.prd`) targets a remote project
_db-start-if-local:
    case "${PUBLIC_SUPABASE_URL:-}" in ""|*127.0.0.1*|*localhost*) just db-start ;; esac

# Sync the admins table with ADMIN_EMAILS from .env (Vercel builds run this too, see vercel.json)
seed-admins: _db-start-if-local
    node --env-file-if-exists=.env scripts/seed-admins.ts

# Remove admins (ADMIN_EMAILS format): just remove-admins "a@x.it b@x.it" [--purge [--yes]]
remove-admins emails *flags: _db-start-if-local
    node --env-file-if-exists=.env scripts/remove-admins.ts "{{ emails }}" {{ flags }}

# --- Vercel ---

# Preview deployment (needs `vercel login`)
deploy:
    vercel

# Production deployment
deploy-prod:
    vercel --prod

# Pull Vercel env vars into .env.local
env-pull:
    vercel env pull .env.local
