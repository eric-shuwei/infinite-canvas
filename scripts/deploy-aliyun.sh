#!/usr/bin/env bash

set -Eeuo pipefail

image="${1:?missing image}"
host_port="${2:?missing host port}"
revision="${3:?missing revision}"
container_name="infinite-canvas"

command -v docker >/dev/null
command -v curl >/dev/null

previous_image="$(docker inspect --format '{{.Config.Image}}' "$container_name" 2>/dev/null || true)"

docker pull "$image"
docker rm -f "$container_name" >/dev/null 2>&1 || true
docker run -d \
  --name "$container_name" \
  --restart unless-stopped \
  --label infinite-canvas.revision="$revision" \
  -p "127.0.0.1:${host_port}:3000" \
  "$image" >/dev/null

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error "http://127.0.0.1:${host_port}/" >/dev/null; then
    echo "Deployment completed: $revision"
    exit 0
  fi

  if [ "$attempt" -eq 30 ]; then
    docker logs --tail=100 "$container_name" || true
    docker rm -f "$container_name" >/dev/null 2>&1 || true

    if [ -n "$previous_image" ]; then
      docker run -d \
        --name "$container_name" \
        --restart unless-stopped \
        -p "127.0.0.1:${host_port}:3000" \
        "$previous_image" >/dev/null
      echo "Previous image restored: $previous_image" >&2
    fi

    echo "Deployment health check failed." >&2
    exit 1
  fi

  sleep 2
done
