import { type Config } from "drizzle-kit";

import { env } from "@/env";

export default {
  schema: [
    "../../packages/db/src/auth-schema.ts",
    "../../packages/db/src/schema.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
