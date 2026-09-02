import type { LayoutType } from '../types';

export interface ElkLayoutOptions {
  'elk.algorithm': string;
  'elk.direction'?: string;
  'elk.spacing.nodeNode'?: number;
  'elk.layered.spacing.nodeNodeBetweenLayers'?: number;
  'elk.force.iterations'?: number;
  'elk.spacing.componentComponent'?: number;
  'elk.padding'?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * ELK routes long edges through dummy nodes that occupy in-layer space, so on
 * dense graphs these spacings, not nodeNode, dominate the width. LINEAR_SEGMENTS
 * packs layers tighter than the BRANDES_KOEPF default without the stack
 * overflow NETWORK_SIMPLEX hits on graphs of a few hundred nodes.
 */
const layeredEdgeSpacing: Partial<ElkLayoutOptions> = {
  'elk.spacing.edgeNode': 2,
  'elk.spacing.edgeEdge': 1,
  'elk.layered.spacing.edgeNodeBetweenLayers': 5,
  'elk.layered.spacing.edgeEdgeBetweenLayers': 2,
  'elk.layered.nodePlacement.strategy': 'LINEAR_SEGMENTS',
};

const layeredPadding = '[top=30,left=30,bottom=30,right=30]';
const layeredComponentSpacing = 60;

/**
 * Spacing is expressed as the gap between node bounding boxes, and those boxes
 * now match the rendered node (see NODE_HEIGHT / estimateNodeWidth), so these
 * numbers are the gap the user actually sees.
 */
export const layoutConfigs: Record<Exclude<LayoutType, 'custom'>, ElkLayoutOptions> = {
  hierarchical: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    ...layeredEdgeSpacing,
    'elk.spacing.nodeNode': 40,
    // Leaves room for an edge label between layers.
    'elk.layered.spacing.nodeNodeBetweenLayers': 60,
    'elk.spacing.componentComponent': layeredComponentSpacing,
    'elk.padding': layeredPadding,
  },
  hierarchicalLR: {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    ...layeredEdgeSpacing,
    'elk.spacing.nodeNode': 30,
    'elk.layered.spacing.nodeNodeBetweenLayers': 80,
    'elk.spacing.componentComponent': layeredComponentSpacing,
    'elk.padding': layeredPadding,
  },
  force: {
    'elk.algorithm': 'force',
    'elk.force.model': 'EADES',
    'elk.force.iterations': 400,
    'elk.force.repulsion': 2,
    'elk.spacing.nodeNode': 20,
    'elk.spacing.componentComponent': 40,
    'elk.padding': '[top=25,left=25,bottom=25,right=25]',
  },
  grid: {
    'elk.algorithm': 'box',
    'elk.spacing.nodeNode': 30,
    'elk.spacing.componentComponent': 60,
    'elk.padding': '[top=30,left=30,bottom=30,right=30]',
    'elk.box.packingMode': 'ASPECT_RATIO',
    'elk.aspectRatio': '4',
  },
  // The stress algorithm positions by desired edge length and largely ignores
  // nodeNode spacing, so it already packs tightly and is left at its original
  // separation; tightening it further only produces node overlap.
  radial: {
    'elk.algorithm': 'stress',
    'elk.stress.desiredEdgeLength': '200',
    'elk.spacing.nodeNode': 500,
    'elk.spacing.componentComponent': 100,
    'elk.padding': layeredPadding,
  },
};

export function getLayoutOptions(layout: LayoutType): ElkLayoutOptions {
  if (layout === 'custom') {
    return layoutConfigs.hierarchical;
  }
  return layoutConfigs[layout] || layoutConfigs.hierarchical;
}
