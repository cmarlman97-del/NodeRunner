import type { Contact } from "@shared/schema";

// Sortable field types
export type SortKey = 'name' | 'email' | 'company' | 'city' | 'state' | 'contactType';
export type SortDir = 'asc' | 'desc' | null;

/**
 * Case-insensitive string comparison with null-safe handling.
 * Null/undefined/empty values are pushed to the bottom in both directions.
 */
export function compareStrings(
  a: string | null | undefined, 
  b: string | null | undefined, 
  dir: SortDir
): number {
  // Normalize values - treat null, undefined, and empty string as "empty"
  const aVal = a?.trim() || null;
  const bVal = b?.trim() || null;
  
  // Handle null values - always push to bottom regardless of direction
  if (aVal === null && bVal === null) return 0;
  if (aVal === null) return 1;  // a goes after b
  if (bVal === null) return -1; // b goes after a
  
  // Both values exist - do case-insensitive comparison
  const result = aVal.localeCompare(bVal, undefined, { 
    sensitivity: 'base',
    numeric: true 
  });
  
  // Apply direction
  return dir === 'desc' ? -result : result;
}

/**
 * Get a comparator function for sorting contacts by the specified field and direction.
 */
export function getComparator(key: SortKey, dir: SortDir): (a: Contact, b: Contact) => number {
  if (dir === null) {
    // No sorting - maintain original order
    return () => 0;
  }

  return (a: Contact, b: Contact) => {
    let aValue: string | null | undefined;
    let bValue: string | null | undefined;

    // Extract the field values based on the sort key
    switch (key) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'email':
        aValue = a.email;
        bValue = b.email;
        break;
      case 'company':
        aValue = a.company;
        bValue = b.company;
        break;
      case 'city':
        aValue = (a as any).city;
        bValue = (b as any).city;
        break;
      case 'state':
        aValue = (a as any).state;
        bValue = (b as any).state;
        break;
      case 'contactType':
        aValue = (a as any).contactType;
        bValue = (b as any).contactType;
        break;
      default:
        return 0;
    }

    return compareStrings(aValue, bValue, dir);
  };
}

/**
 * Sort state type for managing current sort configuration
 */
export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

/**
 * Toggle sort direction for a given key.
 * Logic: none → asc → desc → none
 */
export function toggleSort(currentSort: SortState | null, key: SortKey): SortState | null {
  // If clicking a different column, start with ascending
  if (!currentSort || currentSort.key !== key) {
    return { key, dir: 'asc' };
  }
  
  // Same column - cycle through states
  if (currentSort.dir === 'asc') {
    return { key, dir: 'desc' };
  } else {
    // desc → none (no sort)
    return null;
  }
}
