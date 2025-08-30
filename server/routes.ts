        import type { Express } from "express";
        import { createServer, type Server } from "http";
        import { storage } from "./storage";
        import { z } from "zod";

        // Contacts
        import {
          type Contact,
          insertContactSchema,
          updateContactSchema,
          // Contact Types
          insertContactTypeSchema,
          updateContactTypeSchema,
        } from "@shared/schema";

        export async function registerRoutes(app: Express): Promise<Server> {
          // =========================
          // Contacts
          // =========================

          // Get all contacts
          app.get("/api/contacts", async (_req, res) => {
            try {
              const contacts = await storage.getAllContacts();
              res.json(contacts);
            } catch {
              res.status(500).json({ message: "Failed to fetch contacts" });
            }
          });

          // Search contacts
          app.get("/api/contacts/search", async (req, res) => {
            try {
              const query = req.query.q as string;
              if (!query) return res.status(400).json({ message: "Search query is required" });
              const contacts = await storage.searchContacts(query);
              res.json(contacts);
            } catch {
              res.status(500).json({ message: "Failed to search contacts" });
            }
          });

          // Get single contact (used by the Contact Detail page)
          app.get("/api/contacts/:id", async (req, res) => {
            try {
              const contact = await storage.getContact(req.params.id);
              if (!contact) return res.status(404).json({ message: "Contact not found" });
              res.json(contact);
            } catch {
              res.status(500).json({ message: "Failed to fetch contact" });
            }
          });

          // Create new contact
          app.post("/api/contacts", async (req, res) => {
            try {
              const validatedData = insertContactSchema.parse(req.body);
              const contact = await storage.createContact(validatedData);
              res.status(201).json(contact);
            } catch (error) {
              if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Validation failed", errors: error.errors });
              }
              res.status(500).json({ message: "Failed to create contact" });
            }
          });

          // Update contact (partial)
          app.patch("/api/contacts/:id", async (req, res) => {
            try {
              const data = updateContactSchema.parse(req.body);
              const cleanData: Partial<Contact> = (Object.entries(data) as [keyof Contact, unknown][])
                .reduce((acc, [k, v]) => {
                  if (v === undefined) return acc;          // omit missing keys (don't overwrite)
                  const normalized = (v === "" ? null : v) as Contact[typeof k];
                  acc[k] = normalized;
                  return acc;
                }, {} as Partial<Contact>);
              const updated = await storage.updateContact(req.params.id, cleanData);
              if (!updated) return res.status(404).json({ message: "Contact not found" });
              res.json(updated);
            } catch (error) {
              if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Validation failed", errors: error.errors });
              }
              res.status(500).json({ message: "Failed to update contact" });
            }
          });

          // Delete contact
          app.delete("/api/contacts/:id", async (req, res) => {
            try {
              const deleted = await storage.deleteContact(req.params.id);
              if (!deleted) return res.status(404).json({ message: "Contact not found" });
              res.json({ message: "Contact deleted successfully" });
            } catch {
              res.status(500).json({ message: "Failed to delete contact" });
            }
          });

          // =========================
          // Contact Types (managed dropdown)
          // =========================

          // List active types (ordered)
          app.get("/api/contact-types", async (_req, res) => {
            try {
              const types = await storage.getContactTypes();
              res.json(types);
            } catch {
              res.status(500).json({ message: "Failed to fetch contact types" });
            }
          });

          // Create type
          app.post("/api/contact-types", async (req, res) => {
            try {
              const data = insertContactTypeSchema.parse(req.body);
              const created = await storage.createContactType(data);
              res.status(201).json(created);
            } catch (error) {
              if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Validation failed", errors: error.errors });
              }
              res.status(500).json({ message: "Failed to create contact type" });
            }
          });

          // Update type (rename, activate/deactivate, sort)
          app.patch("/api/contact-types/:id", async (req, res) => {
            try {
              const data = updateContactTypeSchema.parse(req.body);
              const updated = await storage.updateContactType(req.params.id, data);
              if (!updated) return res.status(404).json({ message: "Contact type not found" });
              res.json(updated);
            } catch (error) {
              if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Validation failed", errors: error.errors });
              }
              res.status(500).json({ message: "Failed to update contact type" });
            }
          });

          // Delete type (supports reassignment via ?reassignToId=...)
          app.delete("/api/contact-types/:id", async (req, res) => {
            try {
              const reassignToId = (req.query.reassignToId as string) || undefined;
              const ok = await storage.deleteContactType(req.params.id, reassignToId ? { reassignToId } : undefined);
              if (!ok) {
                return res.status(400).json({
                  message: reassignToId
                    ? "Failed to delete / reassign"
                    : "Type in use; provide ?reassignToId=<otherTypeId> to reassign and delete",
                });
              }
              res.json({ message: "Deleted (soft)" });
            } catch {
              res.status(500).json({ message: "Failed to delete contact type" });
            }
          });

          // =========================
          // Activities (Contact Detail right pane)
          // Minimal read-only list endpoints for Notes / Tasks / Calls
          // =========================
          app.get("/api/contacts/:id/notes", async (req, res) => {
            try {
              const { page = "1", pageSize = "20" } = req.query as Record<string, string>;
              const data = await storage.listNotes(req.params.id, { page: +page, pageSize: +pageSize });
              res.json(data);
            } catch {
              res.status(500).json({ message: "Failed to fetch notes" });
            }
          });

          app.get("/api/contacts/:id/tasks", async (req, res) => {
            try {
              const { page = "1", pageSize = "20" } = req.query as Record<string, string>;
              const data = await storage.listTasks(req.params.id, { page: +page, pageSize: +pageSize });
              res.json(data);
            } catch {
              res.status(500).json({ message: "Failed to fetch tasks" });
            }
          });

          app.get("/api/contacts/:id/calls", async (req, res) => {
            try {
              const { page = "1", pageSize = "20" } = req.query as Record<string, string>;
              const data = await storage.listCalls(req.params.id, { page: +page, pageSize: +pageSize });
              res.json(data);
            } catch {
              res.status(500).json({ message: "Failed to fetch calls" });
            }
          });

          const httpServer = createServer(app);
          return httpServer;
        }
