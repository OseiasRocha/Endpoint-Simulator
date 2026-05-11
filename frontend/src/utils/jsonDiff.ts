export interface Mismatch {
  path: string;
  expected: unknown;
  received: unknown;
}

export interface WildcardMatch {
  path: string;
  pattern: string;
  received: unknown;
}

export type DiffResult =
  | { ok: true; format: 'json' | 'text'; wildcardMatches: WildcardMatch[] }
  | { ok: false; parseError: string }
  | { ok: false; mismatches: Mismatch[]; wildcardMatches: WildcardMatch[] };

/** Deep-compare two JSON strings. Returns ok:true on match, error details otherwise. */
export function diffJson(expectedStr: string, receivedStr: string): DiffResult {
  let expected: unknown;
  let received: unknown;

  try {
    received = JSON.parse(receivedStr);
  } catch {
    return expectedStr === receivedStr
      ? { ok: true, format: 'text', wildcardMatches: [] }
      : { ok: false, parseError: 'Text response does not match expected value' };
  }

  try {
    expected = JSON.parse(expectedStr);
  } catch {
    return expectedStr === receivedStr
      ? { ok: true, format: 'text', wildcardMatches: [] }
      : { ok: false, parseError: 'Text response does not match expected value' };
  }

  const { mismatches, wildcardMatches } = walk(expected, received, '');
  return mismatches.length === 0
    ? { ok: true, format: 'json', wildcardMatches }
    : { ok: false, mismatches, wildcardMatches };
}

interface WalkResult {
  mismatches: Mismatch[];
  wildcardMatches: WildcardMatch[];
}

function walk(expected: unknown, received: unknown, path: string): WalkResult {
  const label = path || 'root';

  if (typeof expected === 'string') {
    if (expected === '*') {
      return { mismatches: [], wildcardMatches: [{ path: label, pattern: '*', received }] };
    }
    if (expected.startsWith('$regex:')) {
      const patternStr = expected.slice(7);
      try {
        if (new RegExp(patternStr).test(String(received))) {
          return { mismatches: [], wildcardMatches: [{ path: label, pattern: expected, received }] };
        }
      } catch {
        // invalid regex — fall through to mismatch
      }
      return { mismatches: [{ path: label, expected, received }], wildcardMatches: [] };
    }
  }

  if (typeof expected !== typeof received || Array.isArray(expected) !== Array.isArray(received)) {
    return { mismatches: [{ path: label, expected, received }], wildcardMatches: [] };
  }

  if (expected === null || typeof expected !== 'object') {
    return expected === received
      ? { mismatches: [], wildcardMatches: [] }
      : { mismatches: [{ path: label, expected, received }], wildcardMatches: [] };
  }

  const exp = expected as Record<string, unknown>;
  const rec = received as Record<string, unknown>;
  const keys = new Set([...Object.keys(exp), ...Object.keys(rec)]);
  const mismatches: Mismatch[] = [];
  const wildcardMatches: WildcardMatch[] = [];

  for (const key of keys) {
    const child = path ? `${path}.${key}` : key;
    if (!(key in exp)) {
      mismatches.push({ path: child, expected: undefined, received: rec[key] });
    } else if (!(key in rec)) {
      mismatches.push({ path: child, expected: exp[key], received: undefined });
    } else {
      const result = walk(exp[key], rec[key], child);
      mismatches.push(...result.mismatches);
      wildcardMatches.push(...result.wildcardMatches);
    }
  }

  return { mismatches, wildcardMatches };
}

/**
 * Render JSON as line objects annotated with whether they belong to a mismatched
 * path, a wildcard-matched path, or neither.
 */
export function annotateLines(
  value: unknown,
  mismatches: Mismatch[],
  wildcardMatches: WildcardMatch[] = [],
): { text: string; error: boolean; wildcard: boolean }[] {
  const mismatchPaths = mismatches.map((m) => m.path);
  const wildcardPaths = wildcardMatches.map((m) => m.path);
  return renderValue(value, mismatchPaths, wildcardPaths, '', 0, true);
}

export function formatValue(v: unknown): string {
  if (v === undefined) return '(missing)';
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[… ${v.length} item${v.length !== 1 ? 's' : ''}]`;
  if (typeof v === 'object') {
    const keys = Object.keys(v as object).length;
    return `{… ${keys} key${keys !== 1 ? 's' : ''}}`;
  }
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

/** Convert internal dot-notation paths (e.g. "items.0.name") to bracket notation ("items[0].name"). */
export function formatPath(path: string): string {
  const parts = path.split('.');
  let result = '';
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      result += `[${part}]`;
    } else {
      result += result ? `.${part}` : part;
    }
  }
  return result;
}

function renderValue(
  value: unknown,
  mismatchPaths: string[],
  wildcardPaths: string[],
  path: string,
  indent: number,
  isLast: boolean,
  propertyName?: string,
): { text: string; error: boolean; wildcard: boolean }[] {
  const prefix = `${' '.repeat(indent)}${propertyName ? `${JSON.stringify(propertyName)}: ` : ''}`;
  const currentPath = path || 'root';
  const isError = hasMismatch(currentPath, mismatchPaths);
  const isWildcard = !isError && hasWildcard(currentPath, wildcardPaths);

  if (value === null || typeof value !== 'object') {
    return [{
      text: `${prefix}${JSON.stringify(value)}${isLast ? '' : ','}`,
      error: isError,
      wildcard: isWildcard,
    }];
  }

  if (Array.isArray(value)) {
    const lines: { text: string; error: boolean; wildcard: boolean }[] = [{
      text: `${prefix}[`,
      error: isError,
      wildcard: isWildcard,
    }];

    value.forEach((item, index) => {
      const childPath = path ? `${path}.${index}` : String(index);
      lines.push(...renderValue(item, mismatchPaths, wildcardPaths, childPath, indent + 2, index === value.length - 1));
    });

    lines.push({ text: `${' '.repeat(indent)}]${isLast ? '' : ','}`, error: false, wildcard: false });
    return lines;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const lines: { text: string; error: boolean; wildcard: boolean }[] = [{
    text: `${prefix}{`,
    error: isError,
    wildcard: isWildcard,
  }];

  entries.forEach(([key, child], index) => {
    const childPath = path ? `${path}.${key}` : key;
    lines.push(...renderValue(child, mismatchPaths, wildcardPaths, childPath, indent + 2, index === entries.length - 1, key));
  });

  lines.push({ text: `${' '.repeat(indent)}}${isLast ? '' : ','}`, error: false, wildcard: false });
  return lines;
}

function hasMismatch(path: string, mismatchPaths: string[]): boolean {
  return mismatchPaths.some(
    (p) => p === path || p.startsWith(`${path}.`),
  );
}

function hasWildcard(path: string, wildcardPaths: string[]): boolean {
  return wildcardPaths.some(
    (p) => p === path || path.startsWith(`${p}.`),
  );
}
