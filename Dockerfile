FROM node:24-alpine AS verify
WORKDIR /app
COPY package.json ./
COPY src/ ./src/
COPY public/ ./public/
RUN node --input-type=module -e "await import('./src/server.js')"

FROM gcr.io/distroless/nodejs24-debian13:nonroot
LABEL com.azure.containerizationassist.createdby="containerization-assist"
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=verify --chown=65532:65532 /app/package.json ./
COPY --from=verify --chown=65532:65532 /app/src/ ./src/
COPY --from=verify --chown=65532:65532 /app/public/ ./public/
USER 65532
EXPOSE 8080
CMD ["src/server.js"]
