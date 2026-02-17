/**
 * Converts a token amount string to BigInt with specified decimals
 * Avoids floating-point precision issues by using string manipulation
 *
 * @param amount - The amount as a string (e.g., "1000", "1000.5", "0.123")
 * @param decimals - Number of decimals (usually 18 for ERC20)
 * @returns BigInt representation in wei
 * @throws Error if amount is invalid
 *
 * @example
 * parseTokenAmount("1000", 18)  // Returns: 1000000000000000000000n
 * parseTokenAmount("5083", 18)  // Returns: 5083000000000000000000n (1 Golden Fisher)
 * parseTokenAmount("0.5", 18)   // Returns: 500000000000000000n
 * parseTokenAmount("1000.123456789012345678", 18) // Returns: 1000123456789012345678n
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  // Remove any whitespace and commas
  const cleanAmount = amount.trim().replace(/,/g, '');

  // Validate input
  if (!cleanAmount || cleanAmount === '.' || !/^[0-9.]+$/.test(cleanAmount)) {
    throw new Error('Invalid amount format');
  }

  // Split on decimal point
  const parts = cleanAmount.split('.');

  // Ensure only one decimal point
  if (parts.length > 2) {
    throw new Error('Invalid amount: multiple decimal points');
  }

  const [whole = '0', fraction = ''] = parts;

  // Handle empty whole part (e.g., ".5" -> "0.5")
  const wholePart = whole || '0';

  // Pad or truncate the fractional part to match decimals
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);

  // Combine whole and fractional parts
  const combined = wholePart + paddedFraction;

  // Remove leading zeros (except if the number is just "0")
  const trimmed = combined.replace(/^0+/, '') || '0';

  // Convert to BigInt
  return BigInt(trimmed);
}
