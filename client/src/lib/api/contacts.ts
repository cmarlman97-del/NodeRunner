import { normalizeValue } from "@/lib/validation/contactSchemas";
import type { Contact } from "@shared/schema";

export async function patchContact(
  id: string,
  updates: Partial<Contact>
): Promise<Contact> {
  // Normalize values (empty strings to null)
  const normalizedUpdates = Object.fromEntries(
    Object.entries(updates).map(([key, value]) => [
      key,
      typeof value === "string" ? normalizeValue(value) : value,
    ])
  );

  const response = await fetch(`/api/contacts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedUpdates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to update contact: ${response.statusText}`
    );
  }

  return response.json();
}
