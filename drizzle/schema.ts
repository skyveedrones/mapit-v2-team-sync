import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

/**
 * Media table for storing uploaded drone photos and videos.
 * Each media item belongs to a project and contains file metadata + GPS coordinates.
 */
export const media = mysqlTable("media", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Foreign key to users table (owner) */
  userId: int("userId").notNull(),
  /** Original filename */
  filename: varchar("filename", { length: 255 }).notNull(),
  /** S3 storage key */
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  /** Public URL to access the file */
  url: varchar("url", { length: 500 }).notNull(),
  /** File MIME type (image/jpeg, video/mp4, etc.) */
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  /** File size in bytes */
  fileSize: int("fileSize").notNull(),
  /** Media type: photo or video */
  mediaType: mysqlEnum("mediaType", ["photo", "video"]).notNull(),
  /** GPS latitude from EXIF data (nullable if not available) */
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  /** GPS longitude from EXIF data (nullable if not available) */
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  /** Altitude in meters from EXIF data */
  altitude: decimal("altitude", { precision: 10, scale: 2 }),
  /** Date/time the photo/video was captured (from EXIF) */
  capturedAt: timestamp("capturedAt"),
  /** Camera make from EXIF */
  cameraMake: varchar("cameraMake", { length: 100 }),
  /** Camera model from EXIF */
  cameraModel: varchar("cameraModel", { length: 100 }),
  /** Thumbnail URL for quick preview */
  thumbnailUrl: varchar("thumbnailUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type InsertMedia = typeof media.$inferInsert;
