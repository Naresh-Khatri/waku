import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

export * from "./auth-schema";
export * from "./schema";

const schema = { ...authSchema, ...appSchema };

export type DbSchema = typeof schema;
export type Db = PostgresJsDatabase<DbSchema>;

export function createDb(url: string): { db: Db; conn: postgres.Sql } {
  const conn = postgres(url);
  const db = drizzle(conn, { schema });
  return { db, conn };
}
