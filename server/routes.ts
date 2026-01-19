        import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  type Contact, 
  type Note, 
  type NoteCreate, 
  type NoteWithAuthor,
  insertContactSchema, 
  updateContactSchema,
  insertNoteSchema,
  insertContactTypeSchema,
  updateContactTypeSchema,
  type InsertNote,
  type TaskRow,
  type CallRow
} from "@shared/schema";

// Helper function for error handling
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Registering API routes...');
  
  // =========================
  // Contacts
  // =========================
  
  // Get all contacts
  app.get("/api/contacts", asyncHandler(async (req, res) => {
    const contacts = await storage.getAllContacts();
    res.json(contacts);
  }));

  // Search contacts with proper type safety
  app.get("/api/contacts/search", (req, res, next) => {
    const query = req.query.q;
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }
    // We've validated that query is a non-empty string
    const searchQuery = query.trim();
    // We know searchQuery is a non-empty string at this point
    storage.searchContacts(searchQuery as string)
      .then(contacts => res.json(contacts))
      .catch(next);
  });

  // Get single contact
  app.get<{ id: string }>(
    "/api/contacts/:id", 
    asyncHandler(async (req, res) => {
      const contactId = req.params.id;
      if (!contactId) {
        return res.status(400).json({ message: "Contact ID is required" });
      }
      const contact = await storage.getContact(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    })
  );

  // Create new contact
  app.post("/api/contacts", express.json(), asyncHandler(async (req, res) => {
    const validatedData = insertContactSchema.parse(req.body);
    const contact = await storage.createContact(validatedData);
    res.status(201).json(contact);
  }));

  // Update contact
  app.patch("/api/contacts/:id", express.json(), asyncHandler(async (req, res) => {
    const contactId = String(req.params.id);
    const update = updateContactSchema.parse(req.body);
    
    // Create a properly typed update object with null for undefined values
    const typedUpdate: Record<string, unknown> = {};
    
    // Only include defined values in the update
    for (const [key, value] of Object.entries(update)) {
      if (value !== undefined) {
        // Convert empty strings to null for nullable fields
        typedUpdate[key] = value === '' ? null : value;
      }
    }
    
    // Type assertion here since we know the structure matches Partial<Contact>
    const updatedContact = await storage.updateContact(contactId, typedUpdate as Partial<Contact>);
    if (!updatedContact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    
    res.json(updatedContact);
  }));

  // Delete contact
  app.delete("/api/contacts/:id", asyncHandler(async (req, res) => {
    const contactId = String(req.params.id);
    const deleted = await storage.deleteContact(contactId);
    if (!deleted) {
      return res.status(404).json({ message: "Contact not found" });
    }
    res.json({ message: "Contact deleted successfully" });
  }));

  // =========================
  // Notes
  // =========================
  
  // Get notes for a contact
  app.get<{ id: string }>(
    "/api/contacts/:id/notes", 
    asyncHandler(async (req, res) => {
      const contactId = req.params.id;
      if (!contactId) {
        return res.status(400).json({ message: "Contact ID is required" });
      }
      
      const page = typeof req.query.page === 'string' ? req.query.page : '1';
      const pageSize = typeof req.query.pageSize === 'string' ? req.query.pageSize : '20';
      
      const data = await storage.listNotes(contactId, { 
        page: parseInt(page, 10), 
        pageSize: parseInt(pageSize, 10) 
      });
      
      res.json(data);
    })
  );

  // Create a new note for a contact
  app.post<{ id: string }, Note, NoteCreate>(
    "/api/contacts/:id/notes",
    express.json(),
    asyncHandler(async (req, res) => {
      const startTime = Date.now();
      const requestId = Math.random().toString(36).substring(2, 10);
      
      // Log the request
      console.log(`[${requestId}] [${new Date().toISOString()}] POST /api/contacts/${req.params.id}/notes`);
      console.log(`[${requestId}] Request body:`, JSON.stringify(req.body));
      
      // Parse and validate contact ID from URL params
      const paramsResult = z.object({
        id: z.string().min(1, "Contact ID is required")
      }).safeParse(req.params);
      
      if (!paramsResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: paramsResult.error.errors,
          requestId
        });
      }
      
      const { id: contactId } = paramsResult.data;
      
      // Validate request body against schema
      const bodyResult = insertNoteSchema.safeParse({
        ...req.body,
        contactId // Ensure contactId comes from URL params, not body
      });
      
      if (!bodyResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: bodyResult.error.errors,
          requestId
        });
      }
      
      // Verify contact exists
      const contact = await storage.getContact(contactId);
      if (!contact) {
        return res.status(404).json({ 
          message: "Contact not found",
          requestId
        });
      }
      
      // Create the note with validated data
      const note = await storage.createNote(contactId, {
        title: bodyResult.data.title || null,
        body: bodyResult.data.body,
        occurredAt: bodyResult.data.occurredAt ? new Date(bodyResult.data.occurredAt) : new Date(),
        createTask: bodyResult.data.createTask || false
      });
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Created note in ${duration}ms`);
    
    res.status(201).json(note);
  }));
  
  // =========================
  // Tasks
  // =========================
  
  // Get tasks for a contact
  app.get<{ id: string }>(
    "/api/contacts/:id/tasks", 
    asyncHandler(async (req, res) => {
      const contactId = req.params.id;
      if (!contactId) {
        return res.status(400).json({ message: "Contact ID is required" });
      }
      
      const page = typeof req.query.page === 'string' ? req.query.page : '1';
      const pageSize = typeof req.query.pageSize === 'string' ? req.query.pageSize : '20';
      
      const data = await storage.listTasks(contactId, { 
        page: parseInt(page, 10), 
        pageSize: parseInt(pageSize, 10) 
      });
      
      res.json(data);
    })
  );
  
  // =========================
  // Calls
  // =========================
  
  // Get calls for a contact
  app.get<{ id: string }>(
    "/api/contacts/:id/calls", 
    asyncHandler(async (req, res) => {
      const contactId = req.params.id;
      if (!contactId) {
        return res.status(400).json({ message: "Contact ID is required" });
      }
      
      const page = typeof req.query.page === 'string' ? req.query.page : '1';
      const pageSize = typeof req.query.pageSize === 'string' ? req.query.pageSize : '20';
      
      const data = await storage.listCalls(contactId, { 
        page: parseInt(page, 10), 
        pageSize: parseInt(pageSize, 10) 
      });
      
      res.json(data);
    })
  );
  
  // =========================
  // Contact Types
  // =========================
  
  // Get all contact types
  app.get("/api/contact-types", asyncHandler(async (req, res) => {
    const types = await storage.getContactTypes();
    res.json(types);
  }));
  
  // Create contact type
  app.post("/api/contact-types", express.json(), asyncHandler(async (req, res) => {
    const data = insertContactTypeSchema.parse(req.body);
    const newType = await storage.createContactType(data);
    res.status(201).json(newType);
  }));
  
  // Update contact type
  app.patch<{ id: string }>(
    "/api/contact-types/:id",
    express.json(),
    asyncHandler(async (req, res) => {
      const typeId = req.params.id;
      if (!typeId) {
        return res.status(400).json({ message: "Contact type ID is required" });
      }
      
      const data = updateContactTypeSchema.parse(req.body);
      const updatedType = await storage.updateContactType(typeId, data);
      
      if (!updatedType) {
        return res.status(404).json({ message: "Contact type not found" });
      }
      
      res.json(updatedType);
    })
  );
  
  // Delete contact type
  app.delete<{ id: string }, {}, { reassignToId?: string }>(
    "/api/contact-types/:id",
    asyncHandler(async (req, res) => {
      const typeId = req.params.id;
      if (!typeId) {
        return res.status(400).json({ message: "Contact type ID is required" });
      }
      
      const reassignToId = typeof req.query.reassignToId === 'string' ? req.query.reassignToId : undefined;
      
      const ok = await storage.deleteContactType(
        typeId,
        reassignToId ? { reassignToId } : undefined
      );
      
      if (!ok) {
        return res.status(400).json({
          message: reassignToId
            ? "Failed to delete/reassign contact type"
            : "Type in use; provide ?reassignToId=<otherTypeId> to reassign and delete",
        });
      }
      
      res.json({ message: "Contact type deleted successfully" });
    })
  );

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    const requestId = req.headers['x-request-id'] || 'unknown';
    
    console.error(`[${requestId}] Error:`, err);
    
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: err.errors,
        requestId
      });
    }
    
    res.status(status).json({ 
      message,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) 
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
