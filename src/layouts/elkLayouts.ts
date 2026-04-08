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

export const layoutConfigs: Record<LayoutType, ElkLayoutOptions> = {
  hierarchical: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': 80,
    'elk.layered.spacing.nodeNodeBetweenLayers': 100,
    'elk.spacing.componentComponent': 100,
    'elk.padding': '[top=50,left=50,bottom=50,right=50]',
  },
  hierarchicalLR: {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.spacing.nodeNode': 80,
    'elk.layered.spacing.nodeNodeBetweenLayers': 100,
    'elk.spacing.componentComponent': 100,
    'elk.padding': '[top=50,left=50,bottom=50,right=50]',
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
    'elk.spacing.nodeNode': 50,
    'elk.spacing.componentComponent': 100,
    'elk.padding': '[top=50,left=50,bottom=50,right=50]',
    'elk.box.packingMode': 'ASPECT_RATIO',
    'elk.aspectRatio': '4',
  },
  radial: {
    'elk.algorithm': 'stress',
    'elk.stress.desiredEdgeLength': '200',
    'elk.spacing.nodeNode': 500,
    'elk.spacing.componentComponent': 100,
    'elk.padding': '[top=50,left=50,bottom=50,right=50]',
  },
};

export function getLayoutOptions(layout: LayoutType): ElkLayoutOptions {
  return layoutConfigs[layout] || layoutConfigs.hierarchical;
}
