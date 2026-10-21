FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY backend-node/package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY backend-node/src ./src
COPY --chown=node:node backend-node/data ./data
EXPOSE 3000
USER node
CMD ["npm", "start"]
