import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ElkNode } from 'elkjs';
import { GraphView } from './GraphView';
import type { GraphData } from '../../types';

const fitViewSpy = vi.fn();

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

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    useReactFlow: () => {
      const flow = actual.useReactFlow();
      return {
        ...flow,
        fitView: (options?: Parameters<typeof flow.fitView>[0]) => {
          fitViewSpy(options);
          return flow.fitView(options);
        },
      };
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
  beforeEach(() => {
    fitViewSpy.mockClear();
  });

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

  it('renders annotations from the controlled annotations prop', async () => {
    render(
      <GraphView
        data={data}
        elkWorkerUrl="mock://elk"
        annotations={[
          { id: 'ann-1', text: 'Important note', position: { x: 50, y: 50 } },
        ]}
        onAnnotationsChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Important note')).toBeInTheDocument();
    });
  });

  it('hides the minimap when showMiniMap is false', async () => {
    render(
      <GraphView data={data} elkWorkerUrl="mock://elk" showMiniMap={false} />,
    );
    await screen.findByText('Aspirin');
    expect(document.querySelector('[data-testid="rf__minimap"]')).not.toBeInTheDocument();
  });

  it('removes the minimap when showMiniMap toggles off', async () => {
    const { rerender } = render(
      <GraphView data={data} elkWorkerUrl="mock://elk" showMiniMap />,
    );
    await screen.findByText('Aspirin');
    expect(document.querySelector('[data-testid="rf__minimap"]')).toBeInTheDocument();

    rerender(
      <GraphView data={data} elkWorkerUrl="mock://elk" showMiniMap={false} />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="rf__minimap"]')).not.toBeInTheDocument();
    });
  });

  it('fits the viewport after layout when no focusRequest is pending', async () => {
    render(<GraphView data={data} elkWorkerUrl="mock://elk" />);
    await waitFor(() => expect(screen.getByText('Aspirin')).toBeInTheDocument());
    await waitFor(() => {
      expect(fitViewSpy).toHaveBeenCalledWith(
        expect.objectContaining({ padding: 0.1, duration: 200 }),
      );
    });
  });

  it('applies focusRequest after layout completes, including requests sent while layouting', async () => {
    render(
      <GraphView
        data={data}
        elkWorkerUrl="mock://elk"
        focusRequest={{ nodeId: 'a', token: 1 }}
      />,
    );

    expect(screen.getByText('Computing layout...')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Aspirin')).toBeInTheDocument());
    await waitFor(() => expect(fitViewSpy).toHaveBeenCalled());

    const layoutFitViewCalls = fitViewSpy.mock.calls.filter(
      ([opts]) => opts?.padding === 0.1 && opts?.duration === 200,
    );
    const focusFitViewCalls = fitViewSpy.mock.calls.filter(
      ([opts]) => opts?.padding === 0.4 && opts?.nodes?.[0]?.id === 'a',
    );

    expect(layoutFitViewCalls).toHaveLength(0);
    expect(focusFitViewCalls.length).toBeGreaterThan(0);
  });

  it('hides connection handles when showHandles is false', async () => {
    const { container } = render(
      <GraphView data={data} elkWorkerUrl="mock://elk" showHandles={false} />,
    );
    await screen.findByText('Aspirin');
    expect(container.querySelector('.handlesHidden') ?? container.querySelector('[class*="handlesHidden"]'))
      .toBeTruthy();
    expect(container.querySelectorAll('.react-flow__handle.connectable')).toHaveLength(0);
  });

  it('renders client node chrome and wires remove and menu callbacks', async () => {
    const onNodeRemove = vi.fn();
    const onNodeMenu = vi.fn();
    render(
      <GraphView
        data={data}
        elkWorkerUrl="mock://elk"
        onNodeRemove={onNodeRemove}
        onNodeMenu={onNodeMenu}
        nodeChrome={{
          topLeft: ({ onRemove }) => (
            <button type="button" onClick={onRemove}>Remove node</button>
          ),
          bottomRight: ({ onMenu }) => (
            <button type="button" onClick={onMenu}>Node menu</button>
          ),
        }}
      />,
    );
    await screen.findByText('Aspirin');

    fireEvent.click(screen.getAllByText('Remove node')[0]);
    expect(onNodeRemove).toHaveBeenCalledWith('a');

    fireEvent.click(screen.getAllByText('Node menu')[0], { clientX: 42, clientY: 84 });
    expect(onNodeMenu).toHaveBeenCalledWith('a', { x: 42, y: 84 });
  });

  it('renders a client node icon when getNodeIcon is provided', async () => {
    render(
      <GraphView
        data={data}
        elkWorkerUrl="mock://elk"
        getNodeIcon={() => <span>host-icon</span>}
      />,
    );
    await screen.findByText('Aspirin');
    expect(screen.getAllByText('host-icon').length).toBeGreaterThan(0);
  });
});
