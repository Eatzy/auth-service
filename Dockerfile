# 1. Use Bun image as base
FROM oven/bun:latest AS base

# 2. Set working directory
WORKDIR /app

# 3. Install dependencies with Bun (skip scripts to avoid better-sqlite3 compilation)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# 4. Copy all source files
COPY . .

# 5. Build TypeScript
RUN bun run build

# 6. Copy entrypoint and give permission
COPY entrypoint.sh /app/entrypoint
RUN chmod 755 /app/entrypoint

# 7. Run entrypoint script
ENTRYPOINT ["/app/entrypoint"]