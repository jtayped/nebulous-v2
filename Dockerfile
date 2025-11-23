FROM node:20-alpine

WORKDIR /app

# 1. Copy package files
COPY package*.json ./

# 2. Copy prisma folder
COPY prisma ./prisma/

# 3. Install dependencies
RUN npm install

# 4. Copy the rest of the source code
COPY . .

ARG SKIP_ENV_VALIDATION=1
RUN npm run build

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]