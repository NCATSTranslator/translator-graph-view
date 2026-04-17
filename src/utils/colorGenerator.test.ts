import { describe, it, expect } from 'vitest';
import { getColorForType, simplifyTypeName, getPrimaryType } from './colorGenerator';

describe('colorGenerator', () => {
  describe('getColorForType', () => {
    it('returns the same color for the same input', () => {
      expect(getColorForType('biolink:Drug')).toBe(getColorForType('biolink:Drug'));
    });

    it('returns a hex color string', () => {
      expect(getColorForType('biolink:Gene')).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('simplifyTypeName', () => {
    it('strips the biolink: prefix', () => {
      expect(simplifyTypeName('biolink:Drug')).toBe('Drug');
    });

    it('strips other prefixes with a colon', () => {
      expect(simplifyTypeName('foo:Bar')).toBe('Bar');
    });

    it('returns the original string when no prefix is present', () => {
      expect(simplifyTypeName('Drug')).toBe('Drug');
    });
  });

  describe('getPrimaryType', () => {
    it('returns the first type in the list', () => {
      expect(getPrimaryType(['biolink:Drug', 'biolink:ChemicalEntity'])).toBe('biolink:Drug');
    });

    it('returns "Unknown" for an empty list', () => {
      expect(getPrimaryType([])).toBe('Unknown');
    });
  });
});
