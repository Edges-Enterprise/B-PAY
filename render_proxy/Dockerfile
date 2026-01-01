# Use official Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production-only)
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port (Render uses $PORT, but default to 3000)
EXPOSE 3000

# Run the app
CMD ["npm", "start"]