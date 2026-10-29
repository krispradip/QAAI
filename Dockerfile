FROM gcr.io/distroless/nodejs24-debian13:nonroot
LABEL com.azure.containerizationassist.createdby="containerization-assist"
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json ./
COPY src/ ./src/
COPY public/ ./public/
RUN ["/nodejs/bin/node", "--input-type=module", "-e", "await import('./src/server.js')"]
USER 65532
EXPOSE 8080
# Distroless has no shell; configure health probes in the orchestrator.
CMD ["src/server.js"]
