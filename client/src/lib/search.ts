import type { Contact } from "@shared/schema";
import { getMemoizedIndex } from "./memo-index";

export interface SearchIndex {
  nameWords: string[];      // split on spaces/punct
  nameFull: string;         // full name normalized
  emailLocal: string;       // before '@'
  emailDomain: string;      // after '@'
  companyWords: string[];
  phoneDigits: string;      // only digits
}

/**
 * Normalize text: lowercase, trim, collapse spaces, basic cleanup
 */
export function normalizeText(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')  // collapse multiple spaces
    .replace(/[^\w\s@.-]/g, ''); // keep alphanumeric, spaces, @, ., -
}

/**
 * Extract only digits from phone number
 */
export function normalizePhone(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/\D/g, ''); // remove all non-digits
}

/**
 * Tokenize query: split on spaces/punct, drop empty tokens
 */
export function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(/[\s\-_.]+/)
    .filter(token => token.length > 0);
}

/**
 * Check if any word in haystack starts with the token (prefix match)
 */
export function hasPrefix(haystackWords: string[], token: string): boolean {
  return haystackWords.some(word => word.startsWith(token));
}

/**
 * Check if token appears as substring in any of the haystack strings
 */
export function hasSubstring(haystackStrings: string[], token: string): boolean {
  return haystackStrings.some(str => str.includes(token));
}

/**
 * Build search index for a contact
 */
export function buildIndex(contact: Contact): SearchIndex {
  const nameFull = normalizeText(contact.name);
  const nameWords = nameFull.split(/\s+/).filter(w => w.length > 0);
  
  const email = normalizeText(contact.email);
  const emailParts = email.split('@');
  const emailLocal = emailParts[0] || '';
  const emailDomain = emailParts[1] || '';
  
  const company = normalizeText((contact as any).company);
  const companyWords = company.split(/\s+/).filter(w => w.length > 0);
  
  const phoneDigits = normalizePhone(contact.phone);
  
  return {
    nameWords,
    nameFull,
    emailLocal,
    emailDomain,
    companyWords,
    phoneDigits
  };
}

/**
 * Classify match quality for a contact against search tokens
 * Returns:
 * - 1: Tier 1 (at least one prefix match, all tokens match somewhere)
 * - 2: Tier 2 (all tokens match as substrings only)
 * - null: No match (at least one token doesn't match anywhere)
 */
export function classifyMatch(tokens: string[], index: SearchIndex): 1 | 2 | null {
  let hasAnyPrefix = false;
  
  for (const token of tokens) {
    let tokenMatches = false;
    
    // Check for prefix matches in name words
    if (hasPrefix(index.nameWords, token)) {
      hasAnyPrefix = true;
      tokenMatches = true;
    }
    
    // Check for prefix matches in company words
    if (hasPrefix(index.companyWords, token)) {
      hasAnyPrefix = true;
      tokenMatches = true;
    }
    
    // Check for prefix matches in email parts
    if (index.emailLocal.startsWith(token) || index.emailDomain.startsWith(token)) {
      hasAnyPrefix = true;
      tokenMatches = true;
    }
    
    // Check for prefix matches in phone (for numeric tokens)
    if (/^\d+$/.test(token) && index.phoneDigits.startsWith(token)) {
      hasAnyPrefix = true;
      tokenMatches = true;
    }
    
    // If no prefix match found, check for substring matches
    if (!tokenMatches) {
      const allFields = [
        index.nameFull,
        index.emailLocal,
        index.emailDomain,
        ...index.companyWords,
        index.phoneDigits
      ];
      
      if (hasSubstring(allFields, token)) {
        tokenMatches = true;
      }
    }
    
    // If this token doesn't match anywhere, no match
    if (!tokenMatches) {
      return null;
    }
  }
  
  // All tokens matched - return tier based on whether we had any prefix matches
  return hasAnyPrefix ? 1 : 2;
}

/**
 * Determine the best field for tie-breaking within a tier
 */
export function bestFieldForTie(
  tokens: string[], 
  index: SearchIndex, 
  tier: 1 | 2, 
  numericIntent: boolean
): 'name' | 'email' | 'company' | 'phone' {
  // Field priority order
  const normalPriority = ['name', 'email', 'company', 'phone'] as const;
  const numericPriority = ['phone', 'name', 'email', 'company'] as const;
  
  const priority = numericIntent ? numericPriority : normalPriority;
  
  // Find the highest priority field that has a match
  for (const field of priority) {
    let fieldMatches = false;
    
    for (const token of tokens) {
      switch (field) {
        case 'name':
          if (tier === 1 && hasPrefix(index.nameWords, token)) fieldMatches = true;
          if (tier === 2 && index.nameFull.includes(token)) fieldMatches = true;
          break;
        case 'email':
          if (tier === 1 && (index.emailLocal.startsWith(token) || index.emailDomain.startsWith(token))) fieldMatches = true;
          if (tier === 2 && (index.emailLocal.includes(token) || index.emailDomain.includes(token))) fieldMatches = true;
          break;
        case 'company':
          if (tier === 1 && hasPrefix(index.companyWords, token)) fieldMatches = true;
          if (tier === 2 && index.companyWords.some(w => w.includes(token))) fieldMatches = true;
          break;
        case 'phone':
          if (/^\d+$/.test(token)) {
            if (tier === 1 && index.phoneDigits.startsWith(token)) fieldMatches = true;
            if (tier === 2 && index.phoneDigits.includes(token)) fieldMatches = true;
          }
          break;
      }
      
      if (fieldMatches) break;
    }
    
    if (fieldMatches) return field;
  }
  
  // Fallback to name
  return 'name';
}

/**
 * Filter and rank contacts based on search query
 */
export function filterAndRank(contacts: Contact[], query: string): Contact[] {
  // Enforce minimum query length
  const trimmedQuery = query.trim();
  const digitCount = (trimmedQuery.match(/\d/g) || []).length;
  const nonSpaceCharCount = trimmedQuery.replace(/\s/g, '').length;
  
  // Must have ≥3 non-space characters OR ≥3 digits
  if (nonSpaceCharCount < 3 && digitCount < 3) {
    return contacts; // Return unfiltered list
  }
  
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return contacts;
  }
  
  // Detect numeric intent (any token with ≥3 digits)
  const numericIntent = tokens.some(token => /^\d{3,}/.test(token));
  
  // Build results with classification
  const results: Array<{
    contact: Contact;
    tier: 1 | 2;
    bestField: 'name' | 'email' | 'company' | 'phone';
    index: SearchIndex;
  }> = [];
  
  for (const contact of contacts) {
    const index = getMemoizedIndex(contact);
    const tier = classifyMatch(tokens, index);
    
    if (tier !== null) {
      const bestField = bestFieldForTie(tokens, index, tier, numericIntent);
      results.push({ contact, tier, bestField, index });
    }
  }
  
  // Sort by: tier (1 before 2), then field priority, then name A→Z
  results.sort((a, b) => {
    // Primary: tier (1 before 2)
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    
    // Secondary: field priority
    const fieldPriority = numericIntent 
      ? { phone: 0, name: 1, email: 2, company: 3 }
      : { name: 0, email: 1, company: 2, phone: 3 };
    
    const aPriority = fieldPriority[a.bestField];
    const bPriority = fieldPriority[b.bestField];
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Tertiary: name A→Z
    return a.contact.name.localeCompare(b.contact.name, undefined, { sensitivity: 'base' });
  });
  
  return results.map(r => r.contact);
}
