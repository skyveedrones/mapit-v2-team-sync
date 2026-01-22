import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table for drone mapping projects.
 * Each project belongs to a user and contains metadata about the mapping job.
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** Project name/title */
  name: varchar("name", { length: 255 }).notNull(),
  /** Optional description of the project */
  description: text("description"),
  /** Project location (address or coordinates) */
  location: varchar("location", { length: 500 }),
  /** Client name for the project */
  clientName: varchar("clientName", { length: 255 }),
  /** Project status */
  status: mysqlEnum("status", ["active", "completed", "archived"]).default("active").notNull(),
  /** Date when the drone flight/mapping was conducted */
  flightDate: timestamp("flightDate"),
  /** Cover image URL for the project */
  coverImage: varchar("coverImage", { length: 500 }),
  /** Number of media items in the project */
  mediaCount: int("mediaCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
