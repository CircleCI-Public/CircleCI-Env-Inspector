FROM node:18
WORKDIR /project
COPY . .
RUN npm install && npm run build
ENV REPORT_PATH=/project/report
ENTRYPOINT ["node"]
CMD ["./dist/index.js"]
