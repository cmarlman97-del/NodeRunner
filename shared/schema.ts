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
  cellPhone: text("cell_phone"),
  title: text("title"),
  company: text("company"),
  contactType: text("contact_type"), // e.g., Broker, Owner, Lender
  city: text("city"),
  state: text("state"),
  website: text("website"), // NEW (optional)
  // New fields for extended contact information
  owner: text("owner"),
  createdAt: timestamp("created_at").defaultNow(),
  propertyTypes: text("property_types"),
  lastActivityDate: text("last_activity_date"),
  nextActivityDate: text("next_activity_date"),
});

// Payload for creation (client -> server)
export const insertContactSchema = createInsertSchema(contacts)
  .omit({ id: true, createdAt: true }) // Exclude createdAt as it's auto-generated
  .extend({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional(),
    cellPhone: z.string().optional(),
    title: z.string().optional(),
    company: z.string().optional(),
    contactType: z.string().optional().default("Broker"),
    city: z.string().optional(),
    state: z.string().optional(),
    website: z.string().url().optional().or(z.literal("").transform(() => undefined)),
    // New fields
    owner: z.string().optional(),
    propertyTypes: z.string().optional(),
    lastActivityDate: z.string().optional(),
    nextActivityDate: z.string().optional(),
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
  title: text("title"),
  body: text("body").notNull(),
  occurredAt: timestamp("occurred_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  authorId: varchar("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
});

// Base schema for note creation
export const insertNoteSchema = z.object({
  title: z.string().min(1, "Title is required").optional().nullable(),
  body: z.string().min(1, "Note content is required"),
  occurredAt: z.string().datetime().optional().nullable(),
  contactId: z.string().min(1, "Contact ID is required"),
  createTask: z.boolean().optional().default(false),
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// Extended type for client-side use with author information
export type NoteWithAuthor = Note & {
  authorName?: string;
};

// What the client sends to create a note
export type NoteCreate = {
  title?: string | null | undefined;  // Explicitly allow undefined
  body: string;
  occurredAt?: string | null | undefined;  // Explicitly allow undefined
  createTask?: boolean | undefined;  // Explicitly allow undefined
  contactId: string;
};

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueAt: timestamp("due_at"),
  status: text("status").$type<"open" | "done">().default("open").notNull(),
  priority: text("priority").$type<"low" | "medium" | "high">(),
  owner: text("owner"),
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

// Extended type for client-side use with author information
export type CallWithAuthor = CallRow & {
  authorName?: string;
};

// What the client sends to create a call
export type CallCreate = {
  summary?: string | null | undefined;  // Explicitly allow undefined
  transcript?: string | null | undefined;  // Explicitly allow undefined
  occurredAt?: string | null | undefined;  // Explicitly allow undefined
  createTask?: boolean | undefined;  // Explicitly allow undefined
  contactId: string;
};
