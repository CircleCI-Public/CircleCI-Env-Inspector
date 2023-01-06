#!/usr/bin/env bash

# This script is used to run the application in a docker container.
echo "Building Docker image..."
DOCKER_BUILDKIT=1 docker build -t cci-env-inspector .
echo "Running Docker image..."
docker run -it --rm -v ${PWD}:/project cci-env-inspector
