#!/usr/bin/env bash

# This script is used to run the application in a docker container.
echo "Building Docker image..."
docker build -t cci-env-inspector .
echo "Running Docker image..."
docker run --name my-container -it cci-env-inspector 
docker cp my-container:circleci-data.json
docker container rm my-container