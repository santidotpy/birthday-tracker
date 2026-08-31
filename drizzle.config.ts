import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/db/schema.ts', './src/db/schema-auth.ts'],
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_PATH ?? './birthday-tracker.sqlite' },
});
