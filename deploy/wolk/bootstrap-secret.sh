#!/usr/bin/env bash
set -euo pipefail

# Run once with sudo on wolk. The token never appears in a file in /docker.
set -a
source /etc/default/homeserver
set +a

bws=/home/feiko/.local/bin/bws
project_id="${1:-}"
if [[ -z "$project_id" ]]; then
  mapfile -t projects < <("$bws" project list --output json | jq -r '.[].id')
  if [[ "${#projects[@]}" -ne 1 ]]; then
    echo "Expected one Bitwarden project; pass its project ID as the first argument." >&2
    "$bws" project list --output table >&2
    exit 1
  fi
  project_id="${projects[0]}"
fi

if "$bws" secret list --output json | jq -e '.[] | select(.key == "WOW_VOTE_SYNC_TOKEN")' >/dev/null; then
  echo "WOW_VOTE_SYNC_TOKEN already exists; reloading secrets."
else
  token="$(openssl rand -hex 32)"
  "$bws" secret create --output none WOW_VOTE_SYNC_TOKEN "$token" "$project_id"
  unset token
fi

systemctl reload homeserver-secrets.service
if ! grep -q '^WOW_VOTE_SYNC_TOKEN=' /run/secrets/homeserver.env; then
  echo "Secret reload did not provide WOW_VOTE_SYNC_TOKEN." >&2
  exit 1
fi
echo "WOW_VOTE_SYNC_TOKEN is ready in Bitwarden and the homeserver secret environment."
