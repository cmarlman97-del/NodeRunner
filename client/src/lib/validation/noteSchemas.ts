import { z } from 'zod';
import { stripHtml } from '@/lib/utils';

// Base schema for creating a note
export const createNoteSchema = z.object({
  body: z
    .string()
    .min(1, 'Note body is required')
    .transform((val) => val.trim())
    .refine(
      (val) => stripHtml(val).trim().length > 0,
      'Note cannot be empty after removing formatting'
    ),
  occurredAt: z.string().datetime().default(() => new Date().toISOString()),
  createFollowUpTask: z.boolean().default(false),
  followUpDueDate: z.string().datetime().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

// Schema for updating a note
export const updateNoteSchema = createNoteSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

// Schema for the API response
export const noteResponseSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  body: z.string(),
  occurredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  authorName: z.string().optional(),
});

export type NoteResponse = z.infer<typeof noteResponseSchema>;
