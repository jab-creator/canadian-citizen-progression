FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Expose internal port
EXPOSE 3000

# Run the app
CMD ["node", "server.js"]
