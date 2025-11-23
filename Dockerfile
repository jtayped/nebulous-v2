FROM node:20-alpine

WORKDIR /app

# 1. Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# 2. Copy source code
COPY . .

# 3. Build the app
ARG SKIP_ENV_VALIDATION=1
RUN npm run build

RUN cp -r public .next/standalone/

# Copy the '.next/static' folder (CSS, JS chunks, fonts)
RUN cp -r .next/static .next/standalone/.next/

EXPOSE 3000

# Start the optimized standalone server directly
CMD ["node", ".next/standalone/server.js"]