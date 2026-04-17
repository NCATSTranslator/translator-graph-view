import { describe, it, expect } from 'vitest';
import { getLayoutOptions, layoutConfigs } from './elkLayouts';

describe('getLayoutOptions', () => {
  it('returns the matching config for each layout type', () => {
    expect(getLayoutOptions('hierarchical')['elk.direction']).toBe('DOWN');
    expect(getLayoutOptions('hierarchicalLR')['elk.direction']).toBe('RIGHT');
    expect(getLayoutOptions('force')['elk.algorithm']).toBe('force');
    expect(getLayoutOptions('grid')['elk.algorithm']).toBe('box');
    expect(getLayoutOptions('radial')['elk.algorithm']).toBe('stress');
  });

  it('falls back to hierarchical for unknown layouts', () => {
    expect(getLayoutOptions('bogus' as never)).toBe(layoutConfigs.hierarchical);
  });

  it('every config specifies an elk.algorithm', () => {
    for (const config of Object.values(layoutConfigs)) {
      expect(config['elk.algorithm']).toBeTruthy();
    }
  });
});
