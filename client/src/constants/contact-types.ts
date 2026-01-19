// Default contact types matching server initialization
export const DEFAULT_CONTACT_TYPES = [
  "Broker",
  "Owner", 
  "Lender",
  "Investor",
  "Vendor"
] as const;

// Type for contact type values
export type ContactTypeValue = typeof DEFAULT_CONTACT_TYPES[number];
