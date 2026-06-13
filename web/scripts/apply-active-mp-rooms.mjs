import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const env = fs.readFileSync(envPath, "utf8");
const match = env.match(/POSTGRES_URL_NON_POOLING="([^"]+)"/);
if (!match) {
  console.error("POSTGRES_URL_NON_POOLING not found in .env.local");
  process.exit(1);
}

const sql = fs.readFileSync(path.join(root, "supabase/migrations/002_active_mp_rooms.sql"), "utf8");
const client = new pg.Client({
  connectionString: match[1],
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query(sql);
const check = await client.query("select to_regclass('public.active_mp_rooms') as table_name");
await client.end();
console.log("Migration OK:", check.rows[0]?.table_name);