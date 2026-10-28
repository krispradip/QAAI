FROM node:22-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node public/ ./public/
COPY --chown=node:node src/ ./src/
USER node
EXPOSE 8080
CMD ["node","src/eks-server.mjs"]
