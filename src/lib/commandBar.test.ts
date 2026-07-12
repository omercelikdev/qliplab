import { describe, it, expect } from 'vitest';
import { evaluateCommand } from './commandBar';

describe('evaluateCommand — math', () => {
  const cases: [string, string][] = [
    ['1280 * 0.7', '896'],
    ['2+3*4', '14'],
    ['(2+3)*4', '20'],
    ['10/4', '2.5'],
    ['2^10', '1,024'],
    ['2**8', '256'],
    ['-5 + 3', '-2'],
    ['100 % 7', '2'],
    ['0.1 + 0.2', '0.3'], // fp fuzz trimmed
    ['1000000 * 2', '2,000,000'],
  ];
  it.each(cases)('%s = %s', (input, expected) => {
    expect(evaluateCommand(input)?.value).toBe(expected);
    expect(evaluateCommand(input)?.kind).toBe('math');
  });

  it('rejects divide by zero', () => {
    expect(evaluateCommand('5/0')).toBeNull();
  });
  it('rejects trailing junk', () => {
    expect(evaluateCommand('2+3 apples')).toBeNull();
  });
  it('rejects unbalanced parens', () => {
    expect(evaluateCommand('(2+3')).toBeNull();
  });
  it('does not fire on a bare number', () => {
    expect(evaluateCommand('42')).toBeNull();
  });
  it('does not fire on plain text', () => {
    expect(evaluateCommand('hello world')).toBeNull();
  });
  it('ignores too-short input', () => {
    expect(evaluateCommand('2')).toBeNull();
  });
});

describe('evaluateCommand — base conversion', () => {
  it('decimal to hex', () => {
    expect(evaluateCommand('255 in hex')).toEqual({ kind: 'base', value: '0xFF', detail: 'hex' });
  });
  it('decimal to binary', () => {
    expect(evaluateCommand('10 to binary')).toEqual({ kind: 'base', value: '0b1010', detail: 'binary' });
  });
  it('hex to decimal', () => {
    expect(evaluateCommand('0xFF in dec')).toEqual({ kind: 'base', value: '255', detail: 'decimal' });
  });
  it('binary to decimal', () => {
    expect(evaluateCommand('0b1010 as decimal')).toEqual({ kind: 'base', value: '10', detail: 'decimal' });
  });
  it('decimal to octal', () => {
    expect(evaluateCommand('64 in octal')).toEqual({ kind: 'base', value: '0o100', detail: 'octal' });
  });
  it('rejects an unknown target base', () => {
    expect(evaluateCommand('255 in base99')).toBeNull();
  });
});

describe('evaluateCommand — unit conversion', () => {
  it('celsius to fahrenheit', () => {
    expect(evaluateCommand('100 c to f')).toEqual({ kind: 'unit', value: '212', detail: '°F' });
  });
  it('fahrenheit to celsius', () => {
    expect(evaluateCommand('32 f to c')).toEqual({ kind: 'unit', value: '0', detail: '°C' });
  });
  it('km to miles', () => {
    const r = evaluateCommand('10 km to mi');
    expect(r?.kind).toBe('unit');
    expect(r?.detail).toBe('mi');
    expect(Number(r?.value.replace(/,/g, ''))).toBeCloseTo(6.2137, 3);
  });
  it('kg to lb', () => {
    const r = evaluateCommand('5 kg to lb');
    expect(Number(r?.value.replace(/,/g, ''))).toBeCloseTo(11.0231, 3);
  });
  it('rejects an unknown unit pair', () => {
    expect(evaluateCommand('5 km to kg')).toBeNull();
  });
});
