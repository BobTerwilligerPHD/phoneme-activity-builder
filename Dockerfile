FROM node:24.16.0-bookworm

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
# Keep development dependencies: the Prisma CLI is needed for startup migrations.
RUN npm ci --include=dev

COPY --chown=node:node . .
# Generate inside Linux rather than using a client from the host checkout.
RUN ./node_modules/.bin/prisma generate --config prisma7.config.ts
# Build-time placeholder only; the real database URL is supplied by Compose.
RUN DATABASE_URL=file:/tmp/phoneme-build.db npm run build
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh \
    && mkdir -p /app/data

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/health', {signal: AbortSignal.timeout(4000)}).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
