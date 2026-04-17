import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { GraphEdge } from './GraphEdge';
import type { GraphEdgeData, GraphEdge as GraphEdgeType } from '../../types';

function renderEdge(data: GraphEdgeData, selected = false) {
  const props = {
    id: 'e1',
    source: 'a',
    target: 'b',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: 'bottom',
    targetPosition: 'top',
    data,
    selected,
    animated: false,
    style: {},
    markerStart: undefined,
    markerEnd: undefined,
    interactionWidth: 0,
  };
  return render(
    <ReactFlowProvider>
      <svg>
        {/* @ts-expect-error — rendering the memoized edge component directly */}
        <GraphEdge {...props} />
      </svg>
    </ReactFlowProvider>,
  );
}

const baseGraphEdge: GraphEdgeType = {
  id: 'e1',
  subject: 'a',
  object: 'b',
  predicate: 'biolink:treats',
};

describe('GraphEdge', () => {
  it('renders a path element', () => {
    const { container } = renderEdge({
      label: 'treats',
      graphEdge: baseGraphEdge,
      showLabel: true,
    });
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('applies the selected class when selected', () => {
    const { container } = renderEdge(
      {
        label: 'treats',
        graphEdge: baseGraphEdge,
        showLabel: true,
      },
      true,
    );
    const path = container.querySelector('path');
    expect(path?.getAttribute('class')).toMatch(/selected/);
  });

  it('applies the inferred class when edge is inferred', () => {
    const { container } = renderEdge({
      label: 'treats',
      graphEdge: baseGraphEdge,
      inferred: true,
    });
    const path = container.querySelector('path');
    expect(path?.getAttribute('class')).toMatch(/inferred/);
  });

  it('produces a curved path (Q command) for multi-edges', () => {
    const { container } = renderEdge({
      label: 'treats',
      graphEdge: baseGraphEdge,
      edgeIndex: 0,
      edgeTotalCount: 3,
    });
    const d = container.querySelector('path')?.getAttribute('d') ?? '';
    expect(d).toMatch(/\sQ\s/);
  });
});
