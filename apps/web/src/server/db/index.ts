import { createDb, type Db } from "@waku/db";
import type postgres from "postgres";

import { env } from "@/env";

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: Db | undefined;
};

let dbInstance = globalForDb.db;
if (!dbInstance) {
  const created = createDb(env.DATABASE_URL);
  dbInstance = created.db;
  if (env.NODE_ENV !== "production") {
    globalForDb.db = created.db;
    globalForDb.conn = created.conn;
  }
}

export const db = dbInstance;
