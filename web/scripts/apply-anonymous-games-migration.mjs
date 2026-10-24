import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "supabase/migrations/001_anonymous_games.sql"), "utf8");

async function main() {
  // Project-prefixed Cloud Secret (not POSTGRES_PASSWORD) so it does not collide
  // with other repos/environments that also inject a generic Postgres password.
  const password = process.env.TRADR_SUPABASE_DB_KEY;
  if (!password) throw new Error("TRADR_SUPABASE_DB_KEY is not set");
  const client = new pg.Client({
    host: "aws-1-us-east-1.pooler.supabase.com",
    port: 6543,
    user: "postgres.bcwxvyomuoolrolspgzn",
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });

  const statements = [
    "drop table if exists public.anonymous_games",
    ...sql
      .split(";")
      .map((s) => s.replace(/--[^\n]*/g, "").trim())
      .filter(Boolean),
  ];

  await client.connect();
  for (const stmt of statements) {
    try {
      await client.query(stmt);
      console.log("ok:", stmt.slice(0, 72).replace(/\s+/g, " "));
    } catch (e) {
      if (e.message?.includes("already exists")) {
        console.log("skip:", e.message);
        continue;
      }
      throw e;
    }
  }
  await client.end();
  console.log("anonymous_games migration applied");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
