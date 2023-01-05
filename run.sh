#!/usr/bin/env bash

# This script is used to run the application in a docker container.
docker build -t cci-env-inspector .
docker run -it --rm cci-env-inspector
