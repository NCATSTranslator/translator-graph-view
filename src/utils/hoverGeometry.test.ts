import { describe, it, expect } from 'vitest';
import { anchorFromRect, escapeDataIdForAttributeSelector } from './hoverGeometry';

const rect = { x: 100, y: 200, width: 50, height: 40 };

describe('anchorFromRect', () => {
  it('returns the correct point for each named position', () => {
    expect(anchorFromRect(rect, 'topLeft')).toEqual({ x: 100, y: 200 });
    expect(anchorFromRect(rect, 'topCenter')).toEqual({ x: 125, y: 200 });
    expect(anchorFromRect(rect, 'topRight')).toEqual({ x: 150, y: 200 });
    expect(anchorFromRect(rect, 'centerLeft')).toEqual({ x: 100, y: 220 });
    expect(anchorFromRect(rect, 'center')).toEqual({ x: 125, y: 220 });
    expect(anchorFromRect(rect, 'centerRight')).toEqual({ x: 150, y: 220 });
    expect(anchorFromRect(rect, 'bottomLeft')).toEqual({ x: 100, y: 240 });
    expect(anchorFromRect(rect, 'bottomCenter')).toEqual({ x: 125, y: 240 });
    expect(anchorFromRect(rect, 'bottomRight')).toEqual({ x: 150, y: 240 });
  });

  it('falls back to center when position is midpoint', () => {
    expect(anchorFromRect(rect, 'midpoint')).toEqual({ x: 125, y: 220 });
  });
});

describe('escapeDataIdForAttributeSelector', () => {
  it('returns a string that can be used inside a double-quoted attribute selector', () => {
    const escaped = escapeDataIdForAttributeSelector('plain-id');
    expect(() => document.querySelector(`[data-id="${escaped}"]`)).not.toThrow();
  });

  it('handles ids containing quotes and backslashes', () => {
    const escaped = escapeDataIdForAttributeSelector('weird"id\\here');
    expect(() => document.querySelector(`[data-id="${escaped}"]`)).not.toThrow();
  });
});
