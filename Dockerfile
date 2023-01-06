FROM node:18
WORKDIR /project
COPY . .
RUN npm install
ENTRYPOINT ["node"]
CMD ["index.js"]
