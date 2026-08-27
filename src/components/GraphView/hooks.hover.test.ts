import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import type { GraphData } from '../../types';
import { ANNOTATION_NODE_TYPE } from '../../utils/annotationTransform';
import { useHoverGeometry, type UseHoverGeometryOptions } from './hooks';

const data: GraphData = {
  nodes: {
    a: { id: 'a', names: ['A'], types: ['Drug'], curies: ['CURIE:a'] },
    b: { id: 'b', names: ['B'], types: ['Gene'], curies: ['CURIE:b'] },
  },
  edges: {
    e1: { id: 'e1', subject: 'a', object: 'b', predicate: 'treats' },
  },
};

const flowNode = (id: string) => ({ id, position: { x: 0, y: 0 }, data: {} }) as Node;

const annotationNode = {
  id: 'ann1',
  type: ANNOTATION_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: {},
} as Node;

function flushAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function setup(overrides: Partial<UseHoverGeometryOptions> = {}) {
  const onNodeHover = vi.fn();
  const onEdgeHover = vi.fn();
  const onAnnotationHover = vi.fn();
  const surface = document.createElement('div');

  const { result } = renderHook(() =>
    useHoverGeometry({
      data,
      nodeHoverAnchor: 'topCenter',
      edgeHoverAnchor: 'midpoint',
      onNodeHover,
      onEdgeHover,
      onAnnotationHover,
      surfaceRef: { current: surface },
      ...overrides,
    }),
  );

  return { handlers: result.current, onNodeHover, onEdgeHover, onAnnotationHover };
}

describe('useHoverGeometry viewport changes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('re-measures the hovered node on viewport change by default', async () => {
    const { handlers, onNodeHover } = setup();

    handlers.handleNodeMouseEnter({} as React.MouseEvent, flowNode('a'));
    expect(onNodeHover).toHaveBeenCalledTimes(1);

    handlers.scheduleFlush();
    await flushAnimationFrame();

    expect(onNodeHover).toHaveBeenCalledTimes(2);
    expect(onNodeHover.mock.calls[1][0]).toEqual(data.nodes.a);
  });

  it('clears the hovered node once instead of re-measuring when enabled', async () => {
    const { handlers, onNodeHover } = setup({ clearHoverOnViewportChange: true });

    handlers.handleNodeMouseEnter({} as React.MouseEvent, flowNode('a'));
    expect(onNodeHover).toHaveBeenCalledTimes(1);

    handlers.scheduleFlush();

    expect(onNodeHover).toHaveBeenCalledTimes(2);
    expect(onNodeHover).toHaveBeenLastCalledWith(null, null);

    // Later frames of the same gesture have nothing left to clear.
    handlers.scheduleFlush();
    await flushAnimationFrame();
    expect(onNodeHover).toHaveBeenCalledTimes(2);
  });

  it('clears the hovered edge when enabled', () => {
    const { handlers, onEdgeHover } = setup({ clearHoverOnViewportChange: true });

    handlers.handleEdgeMouseEnter({} as React.MouseEvent, { id: 'e1' } as never);
    expect(onEdgeHover).toHaveBeenCalledTimes(1);

    handlers.scheduleFlush();

    expect(onEdgeHover).toHaveBeenCalledTimes(2);
    expect(onEdgeHover).toHaveBeenLastCalledWith(null, null);
  });

  it('clears the hovered annotation when enabled', () => {
    const { handlers, onAnnotationHover } = setup({ clearHoverOnViewportChange: true });

    handlers.handleNodeMouseEnter({} as React.MouseEvent, annotationNode);
    expect(onAnnotationHover).toHaveBeenCalledTimes(1);
    expect(onAnnotationHover).toHaveBeenCalledWith('ann1');

    handlers.scheduleFlush();

    expect(onAnnotationHover).toHaveBeenCalledTimes(2);
    expect(onAnnotationHover).toHaveBeenLastCalledWith(null);
  });

  it('does not fire hover callbacks on viewport change when nothing is hovered', () => {
    const { handlers, onNodeHover, onEdgeHover, onAnnotationHover } = setup({
      clearHoverOnViewportChange: true,
    });

    handlers.scheduleFlush();

    expect(onNodeHover).not.toHaveBeenCalled();
    expect(onEdgeHover).not.toHaveBeenCalled();
    expect(onAnnotationHover).not.toHaveBeenCalled();
  });

  it('allows hover to resume after a viewport change cleared it', () => {
    const { handlers, onNodeHover } = setup({ clearHoverOnViewportChange: true });

    handlers.handleNodeMouseEnter({} as React.MouseEvent, flowNode('a'));
    handlers.scheduleFlush();
    onNodeHover.mockClear();

    handlers.handleNodeMouseEnter({} as React.MouseEvent, flowNode('b'));

    expect(onNodeHover).toHaveBeenCalledTimes(1);
    expect(onNodeHover.mock.calls[0][0]).toEqual(data.nodes.b);
  });
});
