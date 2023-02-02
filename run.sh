#!/usr/bin/env bash

if which podman &>/dev/null; then
    OCI_IMAGE_RUNNER="podman"
elif which docker &>/dev/null; then
    OCI_IMAGE_RUNNER="docker"
else
    echo "Please install podman or docker. You can also run via Node with 'npm start'."
    exit 1
fi
# This script is used to run the application in a docker container.
echo "Building Docker image..."
"${OCI_IMAGE_RUNNER}" build -t cci-env-inspector .
echo "Running Docker image..."
"${OCI_IMAGE_RUNNER}" run --name circleci-env-inspector -it cci-env-inspector
echo "Extracting data from container..."
"${OCI_IMAGE_RUNNER}" cp circleci-env-inspector:/project/circleci-data.json circleci-data.json
echo "Cleaning up..."
"${OCI_IMAGE_RUNNER}" container rm circleci-env-inspector &>/dev/null
echo "Done."
