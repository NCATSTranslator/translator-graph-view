import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ElkNode } from 'elkjs';
import { GraphView } from './GraphView';
import type { GraphData } from '../../types';

// Mock ELK to bypass the web-worker path (jsdom has no workers) and return
// deterministic positions so layout completes synchronously.
vi.mock('elkjs/lib/elk-api.js', () => {
  return {
    default: class MockELK {
      async layout(graph: ElkNode): Promise<ElkNode> {
        return {
          ...graph,
          children: (graph.children ?? []).map((child, i) => ({
            ...child,
            x: i * 200,
            y: 0,
          })),
        };
      }
    },
  };
});

const data: GraphData = {
  nodes: {
    a: { id: 'a', names: ['Aspirin'], types: ['biolink:Drug'] },
    b: { id: 'b', names: ['Headache'], types: ['biolink:Disease'] },
  },
  edges: {
    e1: { id: 'e1', subject: 'a', object: 'b', predicate: 'biolink:treats' },
  },
};

describe('GraphView', () => {
  it('renders nodes from GraphData after layout completes', async () => {
    render(<GraphView data={data} elkWorkerUrl="mock://elk" />);
    await waitFor(() => {
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
      expect(screen.getByText('Headache')).toBeInTheDocument();
    });
  });

  it('fires onNodeClick with the original GraphNode', async () => {
    const onNodeClick = vi.fn();
    render(
      <GraphView
        data={data}
        elkWorkerUrl="mock://elk"
        onNodeClick={onNodeClick}
      />,
    );
    const node = await screen.findByText('Aspirin');
    fireEvent.click(node);
    expect(onNodeClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a' }),
    );
  });

  it('re-renders with new data', async () => {
    const { rerender } = render(
      <GraphView data={data} elkWorkerUrl="mock://elk" />,
    );
    await screen.findByText('Aspirin');

    const newData: GraphData = {
      nodes: {
        x: { id: 'x', names: ['Ibuprofen'], types: ['biolink:Drug'] },
      },
      edges: {},
    };
    rerender(<GraphView data={newData} elkWorkerUrl="mock://elk" />);
    await waitFor(() => {
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    });
  });
});
