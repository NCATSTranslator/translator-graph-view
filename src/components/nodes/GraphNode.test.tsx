import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { GraphNode } from './GraphNode';
import type { GraphNodeData, GraphNode as GraphNodeType } from '../../types';

function renderNode(data: GraphNodeData, selected = false) {
  // GraphNode is registered with React Flow as a custom node type and receives
  // many props from the framework. For a smoke test we only need the subset
  // the component actually reads.
  const props = {
    id: 'n1',
    type: 'graphNode',
    data,
    selected,
    dragging: false,
    isConnectable: false,
    xPos: 0,
    yPos: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
    width: 180,
    height: 60,
    sourcePosition: 'bottom',
    targetPosition: 'top',
  };
  return render(
    <ReactFlowProvider>
      {/* @ts-expect-error — rendering the memoized node component directly */}
      <GraphNode {...props} />
    </ReactFlowProvider>,
  );
}

const baseGraphNode: GraphNodeType = {
  id: 'n1',
  names: ['aspirin'],
  types: ['biolink:Drug'],
};

describe('GraphNode', () => {
  it('renders the label with each word capitalized for non-gene types', () => {
    renderNode({
      label: 'type ii diabetes',
      graphNode: { ...baseGraphNode, names: ['type ii diabetes'], types: ['biolink:Disease'] },
      primaryType: 'Disease',
      color: '#FF0000',
    });
    expect(screen.getByText('Type II Diabetes')).toBeInTheDocument();
  });

  it('uppercases the label for Gene and Protein types', () => {
    renderNode({
      label: 'brca1',
      graphNode: { ...baseGraphNode, names: ['brca1'], types: ['biolink:Gene'] },
      primaryType: 'Gene',
      color: '#00FF00',
    });
    expect(screen.getByText('BRCA1')).toBeInTheDocument();
  });

  it('shows the raw label in the title attribute', () => {
    renderNode({
      label: 'raw label',
      graphNode: baseGraphNode,
      primaryType: 'Drug',
      color: '#0000FF',
    });
    expect(screen.getByTitle('raw label')).toBeInTheDocument();
  });
});
