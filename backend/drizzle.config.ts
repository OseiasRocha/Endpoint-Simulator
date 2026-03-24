import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/repos",
  dialect: "sqlite",
  dbCredentials: {
    url: "./src/repos/db.sqlite",
  },
} satisfies Config;