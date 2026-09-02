import type { GraphNodeColors } from '../src';

/**
 * Demo palette for `getNodeColor`, keyed by the **simplified primary type**
 * that the renderer receives (for example `"Drug"`, not `"biolink:Drug"`).
 *
 * Backgrounds are kept light because node labels are near-black.
 */
export const EXAMPLE_NODE_COLORS: Record<string, GraphNodeColors> = {
  Drug: { background: '#D6E4FF', hoverBackground: '#B9D0F7' },
  Disease: { background: '#F8D7DA', hoverBackground: '#F1B9BF' },
  Gene: { background: '#FFF0D4', hoverBackground: '#FADFB0' },
  Protein: { background: '#FFE3D0', hoverBackground: '#FFCFB0' },
  ChemicalEntity: { background: '#D2EFF5', hoverBackground: '#B2E2EC' },
  SmallMolecule: { background: '#D2EFF5', hoverBackground: '#B2E2EC' },
  MolecularMixture: { background: '#D2EFF5', hoverBackground: '#B2E2EC' },
  PhenotypicFeature: { background: '#EADCF8', hoverBackground: '#DBC5F1' },
  Pathway: { background: '#DDF3E4', hoverBackground: '#C2E5CE' },
  AnatomicalEntity: { background: '#E4E0D5', hoverBackground: '#D5D0C0' },
};

/**
 * Returns null for any type the palette does not cover, which leaves those
 * nodes on the library's default background. The large dataset carries a few
 * umbrella types (`NamedThing`, `BiologicalEntity`) that take that path.
 *
 * Defined at module scope so the renderer identity stays stable across renders.
 */
export function getExampleNodeColor(type: string): GraphNodeColors | null {
  return EXAMPLE_NODE_COLORS[type] ?? null;
}
