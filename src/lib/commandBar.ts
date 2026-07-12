/**
 * Turn the search box into a tiny offline command bar.
 *
 * When what the user typed is really a calculation, a number-base conversion,
 * or a simple unit conversion, we can answer it inline and let them paste the
 * result — Raycast-style — without any network or history round-trip. This is
 * pure and deterministic: no eval(), no Function(), no remote rates. Anything
 * that isn't clearly one of these forms returns null so the normal search runs.
 */

export interface CommandResult {
  /** What kind of answer this is — drives the little label in the UI. */
  kind: 'math' | 'base' | 'unit';
  /** The pasteable answer, already formatted. */
  value: string;
  /** Human tag shown beside the result, e.g. "hex" or "°F". */
  detail?: string;
}

// ── Safe arithmetic (recursive-descent, no eval) ────────────────────────────

type Token = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'paren'; v: '(' | ')' };

function tokenizeMath(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = input;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c >= '0' && c <= '9' || c === '.') {
      let j = i;
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) j++;
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) return null;
      tokens.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '%' || c === '^') {
      // Support ** as exponent alias.
      if (c === '*' && s[i + 1] === '*') { tokens.push({ t: 'op', v: '^' }); i += 2; continue; }
      tokens.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '(' || c === ')') { tokens.push({ t: 'paren', v: c }); i++; continue; }
    return null; // any other character → not a math expression
  }
  return tokens;
}

function evalMath(input: string): number | null {
  const tokens = tokenizeMath(input);
  if (!tokens || tokens.length === 0) return null;
  let pos = 0;

  const peek = () => tokens[pos];
  const eat = () => tokens[pos++];

  // expr := term (('+'|'-') term)*
  function parseExpr(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v;
      const right = parseTerm();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  // term := power (('*'|'/'|'%') power)*
  function parseTerm(): number | null {
    let left = parsePower();
    if (left === null) return null;
    while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/' || peek().v === '%')) {
      const op = eat().v;
      const right = parsePower();
      if (right === null) return null;
      if ((op === '/' || op === '%') && right === 0) return null; // no divide by zero
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  }
  // power := unary ('^' power)?  (right-associative)
  function parsePower(): number | null {
    const base = parseUnary();
    if (base === null) return null;
    if (peek() && peek().t === 'op' && peek().v === '^') {
      eat();
      const exp = parsePower();
      if (exp === null) return null;
      return Math.pow(base, exp);
    }
    return base;
  }
  // unary := ('+'|'-') unary | primary
  function parseUnary(): number | null {
    if (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v;
      const val = parseUnary();
      if (val === null) return null;
      return op === '-' ? -val : val;
    }
    return parsePrimary();
  }
  // primary := number | '(' expr ')'
  function parsePrimary(): number | null {
    const tok = peek();
    if (!tok) return null;
    if (tok.t === 'num') { eat(); return tok.v; }
    if (tok.t === 'paren' && tok.v === '(') {
      eat();
      const inner = parseExpr();
      if (inner === null) return null;
      if (!peek() || peek().t !== 'paren' || peek().v !== ')') return null;
      eat();
      return inner;
    }
    return null;
  }

  const result = parseExpr();
  if (result === null || pos !== tokens.length) return null; // trailing junk → invalid
  if (!Number.isFinite(result)) return null;
  return result;
}

/** Trim floating-point fuzz (0.1+0.2) and group thousands for display. */
function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e10) / 1e10;
  if (Number.isInteger(rounded)) return rounded.toLocaleString('en-US');
  return String(rounded);
}

// ── Number-base conversion ──────────────────────────────────────────────────

const BASE_ALIASES: Record<string, { radix: number; label: string }> = {
  hex: { radix: 16, label: 'hex' }, hexadecimal: { radix: 16, label: 'hex' },
  bin: { radix: 2, label: 'binary' }, binary: { radix: 2, label: 'binary' },
  oct: { radix: 8, label: 'octal' }, octal: { radix: 8, label: 'octal' },
  dec: { radix: 10, label: 'decimal' }, decimal: { radix: 10, label: 'decimal' },
};

function parseIntLiteral(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  let n: number;
  if (s.startsWith('0x')) n = parseInt(s.slice(2), 16);
  else if (s.startsWith('0b')) n = parseInt(s.slice(2), 2);
  else if (s.startsWith('0o')) n = parseInt(s.slice(2), 8);
  else if (/^-?\d+$/.test(s)) n = parseInt(s, 10);
  else return null;
  return Number.isFinite(n) ? n : null;
}

function tryBaseConversion(input: string): CommandResult | null {
  // "<number> in|to|as hex" / "0xFF in dec"
  const m = input.trim().match(/^(0x[0-9a-f]+|0b[01]+|0o[0-7]+|-?\d+)\s+(?:in|to|as)\s+([a-z]+)$/i);
  if (!m) return null;
  const n = parseIntLiteral(m[1]);
  const target = BASE_ALIASES[m[2].toLowerCase()];
  if (n === null || !target) return null;
  let out: string;
  switch (target.radix) {
    case 16: out = (n < 0 ? '-0x' : '0x') + Math.abs(n).toString(16).toUpperCase(); break;
    case 2: out = (n < 0 ? '-0b' : '0b') + Math.abs(n).toString(2); break;
    case 8: out = (n < 0 ? '-0o' : '0o') + Math.abs(n).toString(8); break;
    default: out = n.toString(10); break;
  }
  return { kind: 'base', value: out, detail: target.label };
}

// ── Simple offline unit conversion (fixed factors only) ─────────────────────

type UnitConv = { match: string[]; to: string[]; label: string; convert: (n: number) => number };

const UNIT_CONVERSIONS: UnitConv[] = [
  { match: ['c', '°c', 'celsius'], to: ['f', '°f', 'fahrenheit'], label: '°F', convert: (n) => n * 9 / 5 + 32 },
  { match: ['f', '°f', 'fahrenheit'], to: ['c', '°c', 'celsius'], label: '°C', convert: (n) => (n - 32) * 5 / 9 },
  { match: ['km', 'kilometers', 'kilometres'], to: ['mi', 'miles'], label: 'mi', convert: (n) => n / 1.609344 },
  { match: ['mi', 'miles'], to: ['km', 'kilometers', 'kilometres'], label: 'km', convert: (n) => n * 1.609344 },
  { match: ['kg', 'kilograms'], to: ['lb', 'lbs', 'pounds'], label: 'lb', convert: (n) => n / 0.45359237 },
  { match: ['lb', 'lbs', 'pounds'], to: ['kg', 'kilograms'], label: 'kg', convert: (n) => n * 0.45359237 },
  { match: ['m', 'meters', 'metres'], to: ['ft', 'feet'], label: 'ft', convert: (n) => n / 0.3048 },
  { match: ['ft', 'feet'], to: ['m', 'meters', 'metres'], label: 'm', convert: (n) => n * 0.3048 },
];

function tryUnitConversion(input: string): CommandResult | null {
  // "<number> <unit> to <unit>"
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*([a-z°]+)\s+(?:to|in)\s+([a-z°]+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const from = m[2].toLowerCase();
  const to = m[3].toLowerCase();
  if (!Number.isFinite(n)) return null;
  for (const c of UNIT_CONVERSIONS) {
    if (c.match.includes(from) && c.to.includes(to)) {
      return { kind: 'unit', value: formatNumber(c.convert(n)), detail: c.label };
    }
  }
  return null;
}

// ── Public entry point ──────────────────────────────────────────────────────

export function evaluateCommand(input: string): CommandResult | null {
  const trimmed = input.trim();
  if (trimmed.length < 2) return null;

  // Base/unit forms first — they contain letters a math pass would reject anyway.
  const base = tryBaseConversion(trimmed);
  if (base) return base;
  const unit = tryUnitConversion(trimmed);
  if (unit) return unit;

  // Only treat it as math if it actually contains an operator between numbers —
  // a bare "42" or a word shouldn't render a result row.
  if (!/[-+*/%^]/.test(trimmed.replace(/^[-+]/, ''))) return null;
  const math = evalMath(trimmed);
  if (math === null) return null;
  return { kind: 'math', value: formatNumber(math) };
}
