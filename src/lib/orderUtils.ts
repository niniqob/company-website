/**
 * Get a short order ID from a full UUID
 * This must stay consistent with the email function logic
 */
export function getShortOrderId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

/**
 * Normalize user input for order ID comparison
 * Removes leading # and whitespace, converts to uppercase
 */
export function normalizeOrderId(input: string): string {
  return input.trim().replace(/^#/, "").toUpperCase();
}

/**
 * Get a display-friendly order ID with # prefix
 */
export function formatOrderId(orderId: string): string {
  return `#${getShortOrderId(orderId)}`;
}
