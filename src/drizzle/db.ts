import { env } from "@/data/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/drizzle/schema";
import { Pool } from "pg";

// Determine if using remote database
const isRemoteDB =
  env.DATABASE_URL.includes("sslmode=require") ||
  !env.DATABASE_URL.includes("localhost");

// Create connection pool (singleton pattern)
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 4, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: isRemoteDB ? 10000 : 2000, // 10s remote, 2s local
  ssl: isRemoteDB ? { rejectUnauthorized: false } : undefined,
});

// Export drizzle instance with pooled connections
export const db = drizzle(pool, { schema });

// Graceful shutdown (cleanup connections)
if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, closing database pool");
    await pool.end();
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, closing database pool");
    await pool.end();
  });
}

// Add this temporarily to src/drizzle/db.ts
pool.on("connect", () => {
  console.log("🔌 New connection created");
});

pool.on("acquire", () => {
  console.log("♻️  Connection reused from pool");
});

pool.on("remove", () => {
  console.log("🗑️  Connection removed from pool");
});
