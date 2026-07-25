/* ═══════════════════════════════════════════
   数据库：优先 DATABASE_URL(Postgres/Render)，
   否则回落本地 SQLite（server/data/dev.sqlite3）
   启动时自动建表，无需手动迁移
   ═══════════════════════════════════════════ */
import knexFactory from "knex";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PG_URL = process.env.DATABASE_URL || "";
export const isPg = !!PG_URL;

let config;
if (isPg) {
  config = {
    client: "pg",
    connection: {
      connectionString: PG_URL,
      // Render 的 External URL 需要 SSL；Internal URL 也兼容
      ssl: PG_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    },
    pool: { min: 0, max: 8 },
  };
} else {
  const dataDir = path.join(__dirname, "..", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  config = {
    client: "better-sqlite3",
    connection: { filename: path.join(dataDir, "dev.sqlite3") },
    useNullAsDefault: true,
  };
}

export const db = knexFactory(config);

export async function migrate() {
  if (!(await db.schema.hasTable("users"))) {
    await db.schema.createTable("users", (t) => {
      t.increments("id").primary();
      t.string("username", 32).notNullable().unique();
      t.string("password_hash", 128).notNullable();
      t.timestamp("created_at").defaultTo(db.fn.now());
    });
  }
  if (!(await db.schema.hasTable("books"))) {
    await db.schema.createTable("books", (t) => {
      t.increments("id").primary();
      t.integer("owner_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      t.string("title", 256).notNullable();
      t.string("author", 128).defaultTo("");
      t.integer("total_chapters").defaultTo(0);
      t.string("filename", 256).notNullable();
      t.integer("size").notNullable();
      t.string("sha256", 64).notNullable();
      t.boolean("is_public").defaultTo(false);
      t.binary("data").notNullable();          // .bookpack 原始 zip
      t.binary("cover");                        // 封面图（从包内抽出）
      t.string("cover_mime", 32);
      t.integer("downloads").defaultTo(0);
      // 上链存证
      t.string("chain_status", 16).defaultTo("none"); // none|pending|confirmed|failed
      t.string("chain_tx", 80);
      t.string("chain_error", 256);
      t.timestamp("created_at").defaultTo(db.fn.now());
      t.unique(["owner_id", "sha256"]);         // 同一用户不重复存同一本
    });
  }
}

/* Postgres 返回 bytea 为 Buffer；SQLite better-sqlite3 同样为 Buffer，读写统一 */
export function toBuffer(v) {
  return Buffer.isBuffer(v) ? v : Buffer.from(v);
}
