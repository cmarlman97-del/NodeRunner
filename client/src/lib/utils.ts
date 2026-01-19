import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addDays, addWeeks, addMonths, format, isWeekend } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strips HTML tags from a string
 * @param html The HTML string to strip tags from
 * @returns Plain text with HTML tags removed
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  // Create a temporary div element
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Calculate follow-up dates based on predefined options
 * @param option The follow-up option selected
 * @returns The calculated date
 */
export function getFollowUpDate(option: string): Date {
  const now = new Date();
  
  switch (option) {
    case 'today':
      return now;
    case 'tomorrow':
      return addDays(now, 1);
    case '1-business-day':
      return getNextBusinessDay(now, 1);
    case '3-business-days':
      return getNextBusinessDay(now, 3);
    case '1-week':
      return addWeeks(now, 1);
    case '2-weeks':
      return addWeeks(now, 2);
    case '1-month':
      return addMonths(now, 1);
    case '3-months':
      return addMonths(now, 3);
    case '6-months':
      return addMonths(now, 6);
    default:
      return now;
  }
}

/**
 * Get the next business day (skipping weekends)
 * @param startDate The starting date
 * @param businessDays Number of business days to add
 * @returns The calculated business day
 */
function getNextBusinessDay(startDate: Date, businessDays: number): Date {
  let currentDate = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    currentDate = addDays(currentDate, 1);
    if (!isWeekend(currentDate)) {
      daysAdded++;
    }
  }
  
  return currentDate;
}

/**
 * Format an absolute date with abbreviated uppercase month
 * @param date The date to format
 * @param includeWeekday Whether to include weekday prefix
 * @returns Formatted date string (e.g., "OCT 15" or "WED, OCT 15")
 */
export function formatAbsoluteDate(date: Date, includeWeekday = false): string {
  const now = new Date();
  const month = format(date, 'MMM').toUpperCase();
  const day = format(date, 'd');
  const year = date.getFullYear();
  const currentYear = now.getFullYear();
  
  let dateStr = `${month} ${day}`;
  
  // Add year if different from current year
  if (year !== currentYear) {
    dateStr += `, ${year}`;
  }
  
  // Add weekday prefix if requested
  if (includeWeekday) {
    const weekday = format(date, 'EEE').toUpperCase();
    dateStr = `${weekday}, ${dateStr}`;
  }
  
  return dateStr;
}

/**
 * Get a human-readable label for a follow-up option
 * @param option The follow-up option
 * @param date The calculated date
 * @returns A formatted label
 */
export function getFollowUpLabel(option: string, date: Date): string {
  const dayName = format(date, 'EEEE');
  
  switch (option) {
    case 'today':
      return 'today';
    case 'tomorrow':
      return 'tomorrow';
    case '1-business-day':
      return `1 business day (${dayName})`;
    case '3-business-days':
      return `3 business days (${dayName})`;
    case '1-week':
      return '1 week';
    case '2-weeks':
      return '2 weeks';
    case '1-month':
      return '1 month';
    case '3-months':
      return '3 months';
    case '6-months':
      return '6 months';
    default:
      return format(date, 'MMM d');
  }
}

/**
 * Generate query key for calls
 * @param contactId The contact ID
 * @returns Query key array for TanStack Query
 */
export function callsKey(contactId: string): [string, string] {
  return ["calls", contactId];
}

/**
 * Generate a local ID for calls
 * @returns A unique local ID
 */
export function generateLocalCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate query key for tasks
 * @param contactId The contact ID
 * @returns Query key array for TanStack Query
 */
export function tasksKey(contactId: string): [string, string] {
  return ["tasks", contactId];
}

/**
 * Generate a local ID for tasks
 * @returns A unique local ID
 */
export function generateLocalTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
