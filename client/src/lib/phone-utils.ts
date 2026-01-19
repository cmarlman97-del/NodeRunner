/**
 * Formats a phone number string to (###) ###-#### format
 * @param phone - Raw phone number string (digits, spaces, dashes, etc.)
 * @returns Formatted phone number or original string if invalid
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Extract only digits from the phone number
  const digits = phone.replace(/\D/g, '');
  
  // Handle different digit lengths
  if (digits.length === 10) {
    // Standard US format: (###) ###-####
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    // US format with country code: (###) ###-####
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.length > 0) {
    // Return original if not standard US format
    return phone;
  }
  
  return '';
}

/**
 * Strips formatting from phone number for storage
 * @param phone - Formatted phone number string
 * @returns Raw digits only
 */
export function stripPhoneFormatting(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Validates if a phone number has the correct format
 * @param phone - Phone number string to validate
 * @returns True if valid US phone number format
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
}
