import { z } from "zod";
import { US_STATE_CODES } from "@/constants/us-states";
import { DEFAULT_CONTACT_TYPES } from "@/constants/contact-types";

// Basic validation patterns
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlPattern = /^https?:\/\/[^\s$.?#].[^\s]*$/;
const phonePattern = /^[\d\s+\-().]{10,20}$/; // Basic phone number pattern

// Field-specific validators
export const nameSchema = z.string().min(1, "Name is required");
export const emailSchema = z.string().refine(
  (val) => !val || emailPattern.test(val),
  { message: "Please enter a valid email address" }
);
export const websiteSchema = z.string().refine(
  (val) => !val || urlPattern.test(val),
  { message: "Please enter a valid URL" }
);
export const phoneSchema = z.string().refine(
  (val) => !val || phonePattern.test(val),
  { message: "Please enter a valid phone number" }
);

// Generic text field (for company, city, etc.)
export const textFieldSchema = z.string().optional();

// State validation (2-letter US state codes)
export const stateSchema = z.string().refine(
  (val) => !val || US_STATE_CODES.includes(val as any),
  { message: "Please enter a valid US state code" }
);

// Contact type validation (must be from available types)
export const contactTypeSchema = z.string().refine(
  (val) => !val || DEFAULT_CONTACT_TYPES.includes(val as any),
  { message: "Please select a valid contact type" }
);

// Map of field names to their validation schemas
export const fieldValidators = {
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  cellPhone: phoneSchema,
  title: textFieldSchema,
  company: textFieldSchema,
  city: textFieldSchema,
  state: stateSchema,
  website: websiteSchema,
  contactType: contactTypeSchema,
  owner: textFieldSchema,
} as const;

export type FieldName = keyof typeof fieldValidators;

// Helper to validate a field value
export function validateField<T extends FieldName>(
  field: T,
  value: string
): { valid: boolean; error?: string | undefined } {
  const schema = fieldValidators[field];
  if (!schema) return { valid: true }; // No validation for unknown fields

  const result = schema.safeParse(value);
  return {
    valid: result.success,
    error: result.success ? undefined : result.error.errors[0]?.message,
  };
}

// Convert empty strings to null for database storage
export function normalizeValue(value: string | undefined): string | null {
  return value?.trim() || null;
}
