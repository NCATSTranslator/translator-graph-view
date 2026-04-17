import { describe, it, expect } from 'vitest';
import { capitalizeWord, capitalizeAllWords } from './utils';

describe('capitalizeWord', () => {
  it('capitalizes the first character', () => {
    expect(capitalizeWord('hello')).toBe('Hello');
  });

  it('leaves already-capitalized words unchanged', () => {
    expect(capitalizeWord('World')).toBe('World');
  });

  it('handles empty string', () => {
    expect(capitalizeWord('')).toBe('');
  });
});

describe('capitalizeAllWords', () => {
  it('capitalizes every space-separated word', () => {
    expect(capitalizeAllWords('hello world')).toBe('Hello World');
  });

  it('uppercases roman numerals', () => {
    expect(capitalizeAllWords('type ii diabetes')).toBe('Type II Diabetes');
  });

  it('supports custom split characters', () => {
    expect(capitalizeAllWords('foo_bar_baz', '_')).toBe('Foo_Bar_Baz');
  });
});
