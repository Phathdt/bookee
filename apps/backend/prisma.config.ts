import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { defineConfig } from 'prisma/config';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://bookee:bookee@localhost:5432/bookee?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: connectionString,
  },
  migrations: {
    adapter: () => Promise.resolve(new PrismaPg({ connectionString })),
    seed: 'bun run prisma/seed.ts',
  },
});
