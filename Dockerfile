FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install tsc
RUN npm install -g typescript

# Install dependencies
RUN pnpm install

# Copy application code
COPY . .

# Build the application
RUN pnpm build

# Expose port if needed (though this app doesn't seem to expose a port)
# EXPOSE 3000

# Command to run the application
CMD ["pnpm", "start"] 