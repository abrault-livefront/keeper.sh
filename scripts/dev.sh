#!/bin/bash
docker compose up -d

for port in 5173 5174 3000 3001; do
  lsof -ti :$port | xargs kill -9 2>/dev/null
done

bunx turbo run dev
