FROM node
WORKDIR /project
COPY . .
RUN npm install
ENTRYPOINT ["node"]
CMD ["index.js"]
