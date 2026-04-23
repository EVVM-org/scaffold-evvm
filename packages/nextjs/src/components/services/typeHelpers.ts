/**
 * Solidity-type → UI hint mapping used by the auto-generated service form.
 * Kept deliberately shallow: we handle the common scalar types plus
 * bytes and dynamic/fixed arrays via a fallback JSON input. Tuples and
 * nested arrays are rendered as a monospace JSON string that the caller
 * parses before passing to viem — good enough for MVP, replaceable later
 * with proper structured inputs.
 */

import type { AbiParam } from '@/types/services';

export type UiInputKind =
  | 'address'
  | 'bool'
  | 'number'
  | 'bytes'
  | 'string'
  | 'json'; // fallback for tuples, arrays, nested types

export function uiInputKind(type: string): UiInputKind {
  if (type === 'address') return 'address';
  if (type === 'bool') return 'bool';
  if (type.startsWith('uint') || type.startsWith('int')) return 'number';
  if (type.startsWith('bytes')) return 'bytes';
  if (type === 'string') return 'string';
  return 'json';
}

/**
 * Parse a raw string value from a form input into the shape viem's
 * `writeContract` / `readContract` expects. Throws with a human error if
 * the input can't be coerced.
 */
export function coerceInput(raw: string, type: string): unknown {
  const v = raw.trim();

  if (type === 'bool') {
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0' || v === '') return false;
    throw new Error(`Expected bool, got "${raw}"`);
  }

  if (type === 'address') {
    if (!/^0x[0-9a-fA-F]{40}$/.test(v)) throw new Error(`Invalid address: ${raw}`);
    return v;
  }

  if (type.startsWith('uint') || type.startsWith('int')) {
    if (v === '') return 0n;
    // Accept plain ints, scientific notation, and "N*10^18" shorthand.
    if (/^[+-]?\d+$/.test(v)) return BigInt(v);
    // Try float → scaled int when the type is uint256/int256 and value has
    // a decimal point: treat "1.5" in a uint256 context as 1.5 * 10^18.
    if (/^[+-]?\d*\.\d+$/.test(v) && (type === 'uint256' || type === 'int256')) {
      const [whole, frac] = v.split('.');
      const scaled = BigInt(whole || '0') * 10n ** 18n +
        BigInt(frac.padEnd(18, '0').slice(0, 18));
      return scaled;
    }
    throw new Error(`Invalid ${type}: ${raw}`);
  }

  if (type.startsWith('bytes')) {
    if (!v.startsWith('0x')) throw new Error(`${type} must start with 0x: ${raw}`);
    return v;
  }

  if (type === 'string') return v;

  // Fallback: treat the input as JSON (arrays, tuples, nested types).
  if (v === '') return [];
  try {
    return JSON.parse(v);
  } catch {
    throw new Error(`Could not parse ${type} as JSON: ${raw}`);
  }
}

/**
 * Best-effort display for a return value from a view call. bigints → string,
 * addresses kept as-is, nested arrays/tuples → indented JSON.
 */
export function formatReturnValue(value: unknown, param?: AbiParam): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (Array.isArray(value)) {
    // If this is a tuple output with named components, label them.
    if (param?.components && value.length === param.components.length) {
      return value
        .map((v, i) => `${param.components![i].name || i}: ${formatReturnValue(v, param.components![i])}`)
        .join('\n');
    }
    return value.map((v) => formatReturnValue(v)).join(', ');
  }
  try {
    return JSON.stringify(
      value,
      (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
      2,
    );
  } catch {
    return String(value);
  }
}

/**
 * Placeholder text for each Solidity type. Keeps the form visually
 * suggestive without any extra docs.
 */
export function placeholderFor(type: string): string {
  if (type === 'address') return '0x…';
  if (type === 'bool') return 'true | false';
  if (type.startsWith('bytes')) return '0x…';
  if (type === 'string') return 'Enter text';
  if (type.startsWith('uint') || type.startsWith('int')) return '0';
  if (type.endsWith('[]')) return '[]';
  if (type.startsWith('tuple')) return '{}';
  return '';
}
