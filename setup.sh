#!/usr/bin/env bash
# Kukke Yatra — end-to-end Supabase setup.
#
# Reads project ref + RapidAPI keys + EXPENSE_PIN from ./.env, prompts for the
# service-role key (never echoed, never written), then:
#   1. installs the Supabase CLI (if missing)
#   2. links the project
#   3. pushes the migration
#   4. sets edge function secrets
#   5. deploys the three functions
#   6. seeds the PIN hash via the seed-pin function
#
# Re-run safely: every step is idempotent.

set -euo pipefail

cd "$(dirname "$0")"

# ---------- pretty output ----------
red()    { printf '\033[31m%s\033[0m\n' "$*" >&2; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }
step()   { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
die()    { red "Error: $*"; exit 1; }

# ---------- 0. load .env ----------
step "Loading .env"
[[ -f .env ]] || die ".env not found. Copy .env.example and fill it in."

# shellcheck disable=SC1091
set -a; source .env; set +a

[[ -n "${VITE_SUPABASE_URL:-}" ]]      || die "VITE_SUPABASE_URL missing from .env"
[[ -n "${VITE_SUPABASE_ANON_KEY:-}" ]] || die "VITE_SUPABASE_ANON_KEY missing from .env"
[[ -n "${EXPENSE_PIN:-}" ]]            || die "EXPENSE_PIN missing from .env"
[[ "$EXPENSE_PIN" =~ ^[0-9]{4}$ ]]     || die "EXPENSE_PIN must be exactly 4 digits"

# Derive project ref from URL: https://<ref>.supabase.co
PROJECT_REF="$(echo "$VITE_SUPABASE_URL" | sed -E 's#https?://([^.]+)\.supabase\.co.*#\1#')"
[[ -n "$PROJECT_REF" && "$PROJECT_REF" != "$VITE_SUPABASE_URL" ]] \
  || die "Could not parse project ref from VITE_SUPABASE_URL ($VITE_SUPABASE_URL)"
green "Project ref: $PROJECT_REF"

# Collect numbered RapidAPI keys from the environment.
declare -a RAPID_PAIRS=()
for i in $(seq 1 31); do
  key_var="RAPIDAPI_KEY_$i"
  nick_var="RAPIDAPI_NICK_$i"
  key_val="${!key_var:-}"
  [[ -z "$key_val" ]] && continue
  nick_val="${!nick_var:-key$i}"
  RAPID_PAIRS+=("$i:$nick_val")
done

# Back-compat fallback: legacy single RAPIDAPI_KEY.
if [[ ${#RAPID_PAIRS[@]} -eq 0 && -n "${RAPIDAPI_KEY:-}" ]]; then
  yellow "Using legacy RAPIDAPI_KEY (consider switching to RAPIDAPI_KEY_1)."
  RAPID_PAIRS+=("legacy:primary")
fi

[[ ${#RAPID_PAIRS[@]} -gt 0 ]] || die "No RapidAPI keys in .env (set RAPIDAPI_KEY_1 etc.)"
green "RapidAPI keys to upload: ${#RAPID_PAIRS[@]}"
for p in "${RAPID_PAIRS[@]}"; do echo "    • $p"; done

# ---------- 1. Supabase CLI ----------
step "Checking Supabase CLI"
if ! command -v supabase >/dev/null 2>&1; then
  yellow "supabase CLI not found."
  if command -v brew >/dev/null 2>&1; then
    bold "Installing via Homebrew…"
    brew install supabase/tap/supabase
  else
    die "Install the Supabase CLI manually: https://supabase.com/docs/guides/cli"
  fi
fi
green "supabase $(supabase --version 2>&1 | head -1)"

# ---------- 2. login ----------
step "Verifying supabase login (personal access token)"
echo "The Supabase CLI authenticates with a personal access token (starts with 'sbp_')."
echo "This is DIFFERENT from the service_role JWT (asked for separately below)."
echo "Generate one at: https://supabase.com/dashboard/account/tokens"
echo

# Some 2.x CLI versions look up SUPABASE_ACCESS_TOKEN from the env when
# performing Management-API calls (secrets, deploy). If the user already has
# one exported, we honor it; otherwise we prompt and export it for the rest of
# the script's lifetime so every subcommand sees a consistent value.
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  if [[ "$SUPABASE_ACCESS_TOKEN" != sbp_* ]]; then
    die "SUPABASE_ACCESS_TOKEN is set but doesn't start with 'sbp_'. Unset it or replace it with a personal access token."
  fi
  green "Using SUPABASE_ACCESS_TOKEN from environment."
elif supabase projects list >/dev/null 2>&1; then
  green "Already logged in (CLI keychain)."
  yellow "Note: if 'supabase secrets set' later fails with 'Invalid access token format', run:"
  echo "      export SUPABASE_ACCESS_TOKEN=sbp_… && ./setup.sh"
  echo "      (some CLI versions need the PAT in env, not just the keychain)"
else
  yellow "Not logged in."
  printf 'Paste your sbp_… personal access token: '
  IFS= read -rs SUPABASE_PAT
  echo
  [[ -n "$SUPABASE_PAT" ]] || die "PAT required."
  if [[ "$SUPABASE_PAT" == ey* ]]; then
    die "That looks like a JWT (anon or service_role key), not a personal access token. PATs start with 'sbp_'. See https://supabase.com/dashboard/account/tokens"
  fi
  if [[ "$SUPABASE_PAT" != sbp_* ]]; then
    die "Personal access tokens must start with 'sbp_'. Got something else — generate one at https://supabase.com/dashboard/account/tokens"
  fi
  supabase login --token "$SUPABASE_PAT" || die "supabase login failed."
  export SUPABASE_ACCESS_TOKEN="$SUPABASE_PAT"
  unset SUPABASE_PAT
  green "Logged in."
fi

# ---------- 3. link ----------
step "Linking project ($PROJECT_REF)"
if [[ -f supabase/.temp/project-ref ]] && grep -q "$PROJECT_REF" supabase/.temp/project-ref 2>/dev/null; then
  green "Already linked."
else
  supabase link --project-ref "$PROJECT_REF"
fi

# ---------- 4. service-role key ----------
step "Service-role key (DIFFERENT from the PAT above)"
echo "Get it from Supabase Dashboard → Project Settings → API → 'service_role'."
echo "Starts with 'eyJ' (it's a JWT). Used only to invoke the one-shot seed-pin function."
echo "Not written to disk."
printf 'service_role key: '
# -s = silent, -r = raw
IFS= read -rs SERVICE_ROLE_KEY
echo
[[ -n "$SERVICE_ROLE_KEY" ]] || die "service_role key required."
if [[ "$SERVICE_ROLE_KEY" == sbp_* ]]; then
  die "That's a personal access token (PAT). We need the service_role JWT here — Project Settings → API → service_role."
fi
[[ "$SERVICE_ROLE_KEY" =~ ^ey[A-Za-z0-9._-]+$ ]] \
  || yellow "Note: that doesn't look like a JWT (should start with 'eyJ') — continuing anyway."

# ---------- 5. run migration ----------
step "Running database migration (supabase db push)"
supabase db push

# ---------- 6. set function secrets ----------
step "Setting edge function secrets"
SECRET_ARGS=()
for p in "${RAPID_PAIRS[@]}"; do
  i="${p%%:*}"
  nick="${p#*:}"
  if [[ "$i" == "legacy" ]]; then
    SECRET_ARGS+=("RAPIDAPI_KEY_1=$RAPIDAPI_KEY" "RAPIDAPI_NICK_1=$nick")
  else
    key_var="RAPIDAPI_KEY_$i"
    SECRET_ARGS+=("RAPIDAPI_KEY_$i=${!key_var}" "RAPIDAPI_NICK_$i=$nick")
  fi
done
SECRET_ARGS+=("EXPENSE_PIN=$EXPENSE_PIN")
supabase secrets set "${SECRET_ARGS[@]}"

# ---------- 7. deploy functions ----------
step "Deploying edge functions"
for fn in pnr-status expense-write seed-pin attachments; do
  bold "  ↳ $fn"
  supabase functions deploy "$fn"
done

# ---------- 8. seed the PIN ----------
step "Seeding PIN hash via seed-pin"
SEED_URL="https://${PROJECT_REF}.supabase.co/functions/v1/seed-pin"
SEED_BODY='{}'

# Default: don't overwrite if already seeded. Pass --force-pin to overwrite.
if [[ "${1:-}" == "--force-pin" ]]; then
  yellow "Forcing PIN overwrite (--force-pin)."
  SEED_BODY='{"force":true}'
fi

HTTP_FILE="$(mktemp)"
HTTP_CODE="$(curl -sS -o "$HTTP_FILE" -w '%{http_code}' \
  -X POST "$SEED_URL" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "$SEED_BODY")"

if [[ "$HTTP_CODE" == "200" ]]; then
  green "seed-pin: $(cat "$HTTP_FILE")"
else
  red "seed-pin HTTP $HTTP_CODE"
  red "$(cat "$HTTP_FILE")"
  rm -f "$HTTP_FILE"
  die "Seeding failed. Check that EXPENSE_PIN is set and the service-role key is correct."
fi
rm -f "$HTTP_FILE"

# ---------- 9. smoke test ----------
step "Smoke test"
echo "Checking expenses table…"
EXP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  "${VITE_SUPABASE_URL}/rest/v1/expenses?select=id&limit=1" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY")"
[[ "$EXP_CODE" == "200" ]] && green "  expenses ✓" || red "  expenses ✗ (HTTP $EXP_CODE)"

echo "Checking pnr-status function (cache-first, no API call expected)…"
PNR_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  -X POST "${VITE_SUPABASE_URL}/functions/v1/pnr-status" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pnr":"4438870715"}')"
# 200 = OK; first-time hits with no cache will return 200 (fresh) or 502 if RapidAPI is down.
[[ "$PNR_CODE" =~ ^(200|502)$ ]] && green "  pnr-status ✓ (HTTP $PNR_CODE)" || red "  pnr-status ✗ (HTTP $PNR_CODE)"

echo
green "✓ Setup complete."
echo
bold "Next steps:"
echo "  • npm run dev       # http://localhost:5173"
echo "  • npm run build     # production bundle in ./dist"
echo
echo "To rotate the PIN later: update EXPENSE_PIN in .env, then run:"
echo "  ./setup.sh --force-pin"
