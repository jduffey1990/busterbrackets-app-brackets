# -- Stage 1: Build --
    FROM node:18-alpine AS builder

    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    RUN npm run build
    
    # -- Stage 2: Run --
    FROM node:18-alpine AS runner
    
    WORKDIR /app
    COPY --from=builder /app/dist ./dist
    COPY package*.json ./
    RUN npm install --omit=dev
    
    EXPOSE 3000
    CMD ["npm", "run", "start"]