FROM node
WORKDIR /project
COPY . .
RUN npm install
