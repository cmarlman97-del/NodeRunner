export const PROPERTY_TYPES = [
  { value: "industrial", label: "Industrial" },
  { value: "multifamily", label: "Multifamily" },
  { value: "self_storage", label: "Self Storage" },
  { value: "retail", label: "Retail" },
  { value: "office_flex", label: "Office / Flex" },
  { value: "land", label: "Land" },
  { value: "other", label: "Other" },
];

export const DEFAULT_PROPERTY_TYPES = PROPERTY_TYPES;

/**
 * Get the human-friendly label for a property type value
 * @param value - The normalized property type value (e.g., "self_storage")
 * @returns The human-friendly label (e.g., "Self Storage") or the original value if not found
 */
export function getPropertyTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const propertyType = PROPERTY_TYPES.find(pt => pt.value === value);
  return propertyType?.label || value;
}

/**
 * Get the normalized value for a property type label
 * @param label - The human-friendly label (e.g., "Self Storage")
 * @returns The normalized value (e.g., "self_storage") or the original label if not found
 */
export function getPropertyTypeValue(label: string | null | undefined): string | null {
  if (!label || label === '—') return null;
  const propertyType = PROPERTY_TYPES.find(pt => pt.label === label);
  return propertyType?.value || label;
}
