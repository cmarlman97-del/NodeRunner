import type { Contact } from "@shared/schema";
import { buildIndex, type SearchIndex } from "./search";

// Simple memoization cache for search indexes
const indexCache = new Map<string, SearchIndex>();

/**
 * Generate a cache key for a contact
 * Uses contact ID and a hash of relevant fields to detect changes
 */
function getCacheKey(contact: Contact): string {
  // Create a simple hash of the searchable fields
  const searchableData = [
    contact.name,
    contact.email || '',
    (contact as any).company || '',
    contact.phone || ''
  ].join('|');
  
  // Simple hash function (not cryptographic, just for cache invalidation)
  let hash = 0;
  for (let i = 0; i < searchableData.length; i++) {
    const char = searchableData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `${contact.id}:${hash}`;
}

/**
 * Get or build search index for a contact with memoization
 */
export function getMemoizedIndex(contact: Contact): SearchIndex {
  const cacheKey = getCacheKey(contact);
  
  // Check if we have a cached index
  const cached = indexCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Build new index and cache it
  const index = buildIndex(contact);
  indexCache.set(cacheKey, index);
  
  // Clean up old entries for this contact ID (in case data changed)
  const contactIdPrefix = `${contact.id}:`;
  for (const [key] of indexCache) {
    if (key.startsWith(contactIdPrefix) && key !== cacheKey) {
      indexCache.delete(key);
    }
  }
  
  return index;
}

/**
 * Clear the entire cache (useful for testing or memory management)
 */
export function clearIndexCache(): void {
  indexCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: indexCache.size,
    keys: Array.from(indexCache.keys())
  };
}
