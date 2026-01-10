# ---- Base image ----
FROM node:20-alpine

# ---- Create app directory ----
WORKDIR /app

# ---- Install dependencies first (better caching) ----
COPY package*.json ./
# If you use pnpm or yarn, tell me and I’ll adjust.
RUN npm ci --omit=dev

# ---- Copy source ----
COPY . .

# ---- Environment ----
ENV NODE_ENV=production
ENV PORT=8080

# ---- Expose the port your server listens on ----
EXPOSE 8080

# ---- Start ----
# Change "start" if your package.json uses a different script
CMD ["npm", "run", "start"]
