#!/usr/bin/env bash

set -Eeuo pipefail

revision="${1:?missing revision}"
archive="${2:?missing archive}"
app_dir="${3:-/var/www/infinite-canvas}"
site_domain="${4:-canvas.usetoken.org}"
releases_dir="$app_dir/releases"
release_dir="$releases_dir/$revision"
temporary_dir=""
previous_release="$(readlink -f "$app_dir/current" 2>/dev/null || true)"

cleanup() {
  [ -z "$temporary_dir" ] || rm -rf -- "$temporary_dir"
  rm -f -- "$archive"
}
trap cleanup EXIT

mkdir -p "$releases_dir"

if [ ! -d "$release_dir" ]; then
  temporary_dir="$(mktemp -d "$releases_dir/.deploy-${revision}.XXXXXX")"
  tar -xzf "$archive" -C "$temporary_dir"
  test -f "$temporary_dir/index.html"
  test -f "$temporary_dir/config.js"
  printf '%s\n' "$revision" > "$temporary_dir/.revision"
  mv "$temporary_dir" "$release_dir"
  temporary_dir=""
fi

ln -sfn "$release_dir" "$app_dir/current.next"
mv -Tf "$app_dir/current.next" "$app_dir/current"

for attempt in $(seq 1 15); do
  if curl --fail --silent --show-error -H "Host: $site_domain" http://127.0.0.1/ >/dev/null; then
    break
  fi

  if [ "$attempt" -eq 15 ]; then
    if [ -n "$previous_release" ]; then
      ln -sfn "$previous_release" "$app_dir/current.next"
      mv -Tf "$app_dir/current.next" "$app_dir/current"
      echo "Previous release restored: $previous_release" >&2
    else
      rm -f -- "$app_dir/current"
    fi
    echo "Deployment health check failed." >&2
    exit 1
  fi

  sleep 2
done

mapfile -t old_releases < <(
  find "$releases_dir" -mindepth 1 -maxdepth 1 -type d ! -path "$release_dir" \
    -printf '%T@ %p\n' | sort -nr | tail -n +6 | cut -d' ' -f2-
)
for old_release in "${old_releases[@]}"; do
  rm -rf -- "$old_release"
done

echo "Deployment completed: $revision"
