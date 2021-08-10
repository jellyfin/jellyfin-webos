#!/bin/bash
CONTAINER_IMAGE="ghcr.io/oddstr13/docker-tizen-webos-sdk:webos-only"

MY=$(realpath "$(dirname $0)")

function ct {
  docker container run -it --rm --user=$UID --network=host -v "${MY}":/home/developer $CONTAINER_IMAGE "$@"
}

if [ $# -lt 1 ]; then
  echo "Available commands:"
  echo "bash               Enter container command line"
  ct ares --list
else
  ct "$@"
fi
