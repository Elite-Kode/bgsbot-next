FROM node:20-bookworm-slim as build-stage

LABEL org.opencontainers.image.authors=mukhopadhyay@gmail.com
LABEL org.opencontainers.image.title="BGSBot"
LABEL org.opencontainers.image.description="A Discord bot for Elite Dangerous player groups"

WORKDIR /app
RUN chown -R node:node /app
COPY --chown=node:node package*.json ./
USER node
RUN npm ci \
    && npm cache clean --force
ENV PATH=/app/node_modules/.bin:$PATH
COPY --chown=node:node . .

RUN tsc
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]