FROM node:18
WORKDIR /project
COPY . .
RUN npm install && npm run build
ENTRYPOINT ["node"]
CMD ["./dist/index.mjs"]
