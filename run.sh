#!/usr/env/bin bash

# This script is used to run the application in a docker container.
echo "Building Docker image..."
docker build -t cci-env-inspector .
echo "Running Docker image..."
docker run --name circleci-env-inspector -it cci-env-inspector
echo "Extracting data from container..."
docker cp circleci-env-inspector:/project/circleci-data.json circleci-data.json
echo "Cleaning up..."
docker container rm circleci-env-inspector &>/dev/null
echo "Done."
