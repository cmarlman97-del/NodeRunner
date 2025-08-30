import {
  type User,
  type InsertUser,
  type Contact,
  type InsertContact,
  // Contact Types (shared)
  type ContactTypeItem,
  type InsertContactType,
  type UpdateContactType,
} from "@shared/schema";
import { randomUUID } from "crypto";

// --------- Local minimal types for Activities (in-memory) ---------
export type Note = {
  id: string;
  contactId: string;
  body: string;
  createdAt: string; // ISO
};

export type Task = {
  id: string;
  contactId: string;
  title: string;
  status: "open" | "done";
  dueAt?: string | null; // ISO
  createdAt: string; // ISO
};

export type Call = {
  id: string;
  contactId: string;
  occurredAt: string; // ISO
  summary?: string | null;
  transcript?: string | null;
  createdAt: string; // ISO
};

export type PageOpts = { page: number; pageSize: number };
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number };

function isoNow() {
  return new Date().toISOString();
}

function paginate<T>(items: T[], { page, pageSize }: PageOpts): Page<T> {
  const total = items.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  return { items: items.slice(start, end), page, pageSize, total };
}

// ===================================================================
// Storage Interface
// ===================================================================
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contacts
  getAllContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  deleteContact(id: string): Promise<boolean>;
  searchContacts(query: string): Promise<Contact[]>;
  updateContact(id: string, data: Partial<Contact>): Promise<Contact | undefined>;

  // Contact Types (managed dropdown)
  getContactTypes(): Promise<ContactTypeItem[]>;
  createContactType(data: InsertContactType): Promise<ContactTypeItem>;
  updateContactType(id: string, data: UpdateContactType): Promise<ContactTypeItem | undefined>;
  deleteContactType(id: string, opts?: { reassignToId?: string }): Promise<boolean>;
  countContactsByTypeLabel(label: string): Promise<number>;

  // Activities (read-only lists for the Contact Detail page)
  listNotes(contactId: string, opts: PageOpts): Promise<Page<Note>>;
  listTasks(contactId: string, opts: PageOpts): Promise<Page<Task>>;
  listCalls(contactId: string, opts: PageOpts): Promise<Page<Call>>;
}

// ===================================================================
// In-memory implementation
// ===================================================================
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contacts: Map<string, Contact>;

  // Contact Types
  private contactTypes: Map<string, ContactTypeItem>;

  // Activities (simple in-memory stores)
  private notes: Map<string, Note>;
  private tasks: Map<string, Task>;
  private calls: Map<string, Call>;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();

    this.contactTypes = new Map();
    ["Broker", "Owner", "Lender", "Investor", "Vendor"].forEach((label, i) => {
      const id = randomUUID();
      this.contactTypes.set(id, { id, label, isActive: true, sortOrder: i });
    });

    this.notes = new Map();
    this.tasks = new Map();
    this.calls = new Map();

    // (Optional) You can seed sample activities here if you’d like:
    // const cId = "demo-contact-id";
    // this.notes.set(randomUUID(), { id: randomUUID(), contactId: cId, body: "First note", createdAt: isoNow() });
  }

  // ==== Users ====
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // ==== Contacts ====
  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = {
      id,
      name: insertContact.name,
      email: insertContact.email,
      contactType: insertContact.contactType ?? null,
      state: insertContact.state ?? null,
      phone: insertContact.phone ?? null,
      company: insertContact.company ?? null,
      city: insertContact.city ?? null,
      website: insertContact.website ?? null,
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact | undefined> {
    const existing = this.contacts.get(id);
    if (!existing) return undefined;
    const updated: Contact = { ...existing, ...data };
    this.contacts.set(id, updated);
    return updated;
  }

  async searchContacts(query: string): Promise<Contact[]> {
    const q = (query ?? "").trim().toLowerCase();
    if (!q) return Array.from(this.contacts.values());

    const includes = (v?: string) => (v ?? "").toLowerCase().includes(q);

    return Array.from(this.contacts.values()).filter((contact) =>
      includes((contact as any).name) || // if you have a single 'name' field
      includes((contact as any).firstName) ||
      includes((contact as any).lastName) ||
      includes(contact.email) ||
      includes((contact as any).company) ||
      includes((contact as any).phone) ||
      includes((contact as any).contactType) ||
      includes((contact as any).city) ||
      includes((contact as any).state)
    );
  }

  // ==== Contact Types (managed dropdown) ====
  async getContactTypes(): Promise<ContactTypeItem[]> {
    return Array.from(this.contactTypes.values())
      .filter((t) => t.isActive !== false)
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label)
      );
  }

  async createContactType(data: InsertContactType): Promise<ContactTypeItem> {
    const label = data.label.trim();

    // Case-insensitive dedupe
    const existing = Array.from(this.contactTypes.values()).find(
      (t) => t.label.toLowerCase() === label.toLowerCase()
    );
    if (existing) {
      const reactivated = { ...existing, isActive: true };
      this.contactTypes.set(existing.id, reactivated);
      return reactivated;
    }

    const id = randomUUID();
    const item: ContactTypeItem = {
      id,
      label,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    };
    this.contactTypes.set(id, item);
    return item;
  }

  async updateContactType(id: string, data: UpdateContactType): Promise<ContactTypeItem | undefined> {
    const existing = this.contactTypes.get(id);
    if (!existing) return undefined;
    const updated: ContactTypeItem = {
      ...existing,
      ...data,
      label: data.label !== undefined ? data.label.trim() : existing.label,
      isActive: data.isActive ?? existing.isActive,
      sortOrder: data.sortOrder ?? existing.sortOrder,
    };
    this.contactTypes.set(id, updated);
    return updated;
  }

  async countContactsByTypeLabel(label: string): Promise<number> {
    const target = (label ?? "").toLowerCase();
    return Array.from(this.contacts.values()).filter(
      (c) => ((c as any).contactType ?? "").toLowerCase() === target
    ).length;
  }

  async deleteContactType(
    id: string,
    opts?: { reassignToId?: string }
  ): Promise<boolean> {
    const item = this.contactTypes.get(id);
    if (!item) return false;

    const inUse = await this.countContactsByTypeLabel(item.label);
    if (inUse > 0) {
      // require reassignment
      if (!opts?.reassignToId) return false;
      const replacement = this.contactTypes.get(opts.reassignToId);
      if (!replacement) return false;

      // reassign contacts by label text (contacts store text right now)
      for (const c of this.contacts.values()) {
        const current = ((c as any).contactType ?? "").toLowerCase();
        if (current === item.label.toLowerCase()) {
          (c as any).contactType = replacement.label;
        }
      }
    }

    // soft delete
    this.contactTypes.set(id, { ...item, isActive: false });
    return true;
  }

  // ==== Activities (read-only list endpoints for the Contact Detail page) ====

  async listNotes(contactId: string, opts: PageOpts): Promise<Page<Note>> {
    const items = Array.from(this.notes.values())
      .filter((n) => n.contactId === contactId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return paginate(items, opts);
  }

  async listTasks(contactId: string, opts: PageOpts): Promise<Page<Task>> {
    const items = Array.from(this.tasks.values())
      .filter((t) => t.contactId === contactId)
      // open first by due date, then recent
      .sort((a, b) => {
        // open > done
        if (a.status !== b.status) return a.status === "open" ? -1 : 1;
        const aDue = a.dueAt ?? "";
        const bDue = b.dueAt ?? "";
        if (aDue && bDue && aDue !== bDue) return aDue < bDue ? -1 : 1;
        return a.createdAt < b.createdAt ? 1 : -1;
      });
    return paginate(items, opts);
  }

  async listCalls(contactId: string, opts: PageOpts): Promise<Page<Call>> {
    const items = Array.from(this.calls.values())
      .filter((c) => c.contactId === contactId)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)); // most recent call first
    return paginate(items, opts);
  }

  // -----------------------------------------------------------------
  // (Optional) helper creators to seed activity data later if needed:
  // call these from routes you’ll add in the future (POST /notes, etc.)
  // -----------------------------------------------------------------
  // createNote(contactId: string, body: string): Note {
  //   const n: Note = { id: randomUUID(), contactId, body, createdAt: isoNow() };
  //   this.notes.set(n.id, n);
  //   return n;
  // }
  // createTask(contactId: string, title: string, dueAt?: string | null): Task {
  //   const t: Task = { id: randomUUID(), contactId, title, status: "open", dueAt: dueAt ?? null, createdAt: isoNow() };
  //   this.tasks.set(t.id, t);
  //   return t;
  // }
  // createCall(contactId: string, summary?: string | null): Call {
  //   const c: Call = { id: randomUUID(), contactId, occurredAt: isoNow(), summary: summary ?? null, transcript: null, createdAt: isoNow() };
  //   this.calls.set(c.id, c);
  //   return c;
  // }
}

export const storage = new MemStorage();
