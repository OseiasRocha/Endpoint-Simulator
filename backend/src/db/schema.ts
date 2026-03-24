import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const endpoints = sqliteTable("endpoints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  protocol: text("protocol").notNull(), // tcp | udp
  host: text("host").notNull(),
  port: integer("port").notNull(),
});