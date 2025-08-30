import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Contacts
 * - Keeps your existing structure (single `name` field)
 * - Adds `website` (optional) so the detail page can show it
 */
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  contactType: text("contact_type"), // e.g., Broker, Owner, Lender
  city: text("city"),
  state: text("state"),
  website: text("website"), // NEW (optional)
});

// Payload for creation (client -> server)
export const insertContactSchema = createInsertSchema(contacts)
  .omit({ id: true })
  .extend({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional(),
    company: z.string().optional(),
    contactType: z.string().optional().default("Broker"),
    city: z.string().optional(),
    state: z.string().optional(),
    website: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  });

export type InsertContact = z.infer<typeof insertContactSchema>;

// Partial for PATCH
export const updateContactSchema = insertContactSchema.partial();
export type UpdateContact = z.infer<typeof updateContactSchema>;

// Saved Contact (server -> client)
export type Contact = typeof contacts.$inferSelect;

/**
 * Users (unchanged)
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/**
 * Contact Types (MVP stays in-memory; no DB table yet)
 */
export const insertContactTypeSchema = z.object({
  label: z.string().min(1, "Label is required"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().optional(),
});

export const updateContactTypeSchema = z.object({
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export type InsertContactType = z.infer<typeof insertContactTypeSchema>;
export type UpdateContactType = z.infer<typeof updateContactTypeSchema>;

// What the server returns for each type (in-memory model)
export type ContactTypeItem = {
  id: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
};

/**
 * Activities for the Contact Detail page
 * - New tables: notes, tasks, calls
 * - Reference contacts.id (onDelete: cascade)
 */

// Notes
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
});
export type InsertNoteRow = z.infer<typeof insertNoteSchema>;
export type NoteRow = typeof notes.$inferSelect;

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueAt: timestamp("due_at"),
  status: text("status").$type<"open" | "done">().default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});
export type InsertTaskRow = z.infer<typeof insertTaskSchema>;
export type TaskRow = typeof tasks.$inferSelect;

// Calls
export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  occurredAt: timestamp("occurred_at").defaultNow(),
  summary: text("summary"),
  transcript: text("transcript"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});
export type InsertCallRow = z.infer<typeof insertCallSchema>;
export type CallRow = typeof calls.$inferSelect;

