import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { GraphNode } from './GraphNode';
import styles from './GraphNode.module.scss';
import { GraphSettingsContext } from '../../hooks/useGraphSettings';
import { NodeChromeContext, type NodeChromeValue } from '../../hooks/useNodeChrome';
import { NODE_HEIGHT, NODE_WIDTH } from '../../utils/dataTransform';
import type {
  GraphNodeData,
  GraphNode as GraphNodeType,
  GraphNodeColorRenderer,
  GraphNodeIconRenderer,
} from '../../types';

function renderNode(
  data: GraphNodeData,
  options?: {
    selected?: boolean;
    isConnectable?: boolean;
    chrome?: NodeChromeValue;
    getNodeIcon?: GraphNodeIconRenderer;
    getNodeColor?: GraphNodeColorRenderer;
  },
) {
  // GraphNode is registered with React Flow as a custom node type and receives
  // many props from the framework. For a smoke test we only need the subset
  // the component actually reads.
  const props = {
    id: 'n1',
    type: 'graphNode',
    data,
    selected: options?.selected ?? false,
    dragging: false,
    isConnectable: options?.isConnectable ?? true,
    xPos: 0,
    yPos: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    sourcePosition: 'bottom',
    targetPosition: 'top',
  };
  const chromeValue: NodeChromeValue = {
    ...options?.chrome,
    getNodeIcon: options?.getNodeIcon ?? options?.chrome?.getNodeIcon,
    getNodeColor: options?.getNodeColor ?? options?.chrome?.getNodeColor,
  };
  return render(
    <ReactFlowProvider>
      <GraphSettingsContext.Provider value={{ multiEdgeSpacing: 60 }}>
        <NodeChromeContext.Provider value={chromeValue}>
          {/* @ts-expect-error — rendering the memoized node component directly */}
          <GraphNode {...props} />
        </NodeChromeContext.Provider>
      </GraphSettingsContext.Provider>
    </ReactFlowProvider>,
  );
}

function NodeWithColorChrome({
  data,
  getNodeColor,
}: {
  data: GraphNodeData;
  getNodeColor?: GraphNodeColorRenderer;
}) {
  const props = {
    id: 'n1',
    type: 'graphNode',
    data,
    selected: false,
    dragging: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    sourcePosition: 'bottom',
    targetPosition: 'top',
  };
  return (
    <ReactFlowProvider>
      <GraphSettingsContext.Provider value={{ multiEdgeSpacing: 60 }}>
        <NodeChromeContext.Provider value={{ getNodeColor }}>
          {/* @ts-expect-error — rendering the memoized node component directly */}
          <GraphNode {...props} />
        </NodeChromeContext.Provider>
      </GraphSettingsContext.Provider>
    </ReactFlowProvider>
  );
}

const baseGraphNode: GraphNodeType = {
  id: 'n1',
  names: ['aspirin'],
  types: ['biolink:Drug'],
};

const baseData: GraphNodeData = {
  label: 'aspirin',
  graphNode: baseGraphNode,
  primaryType: 'Drug',
};

describe('GraphNode', () => {
  it('renders the label with each word capitalized for non-gene types', () => {
    renderNode({
      label: 'type ii diabetes',
      graphNode: { ...baseGraphNode, names: ['type ii diabetes'], types: ['biolink:Disease'] },
      primaryType: 'Disease',
    });
    expect(screen.getByText('Type II Diabetes')).toBeInTheDocument();
  });

  it('uppercases the label for Gene and Protein types', () => {
    renderNode({
      label: 'brca1',
      graphNode: { ...baseGraphNode, names: ['brca1'], types: ['biolink:Gene'] },
      primaryType: 'Gene',
    });
    expect(screen.getByText('BRCA1')).toBeInTheDocument();
  });

  it('shows the raw label in the title attribute', () => {
    renderNode(baseData);
    expect(screen.getByTitle('aspirin')).toBeInTheDocument();
  });

  it('does not render chrome when nodeChrome is omitted', () => {
    renderNode(baseData);
    expect(screen.queryByRole('button', { hidden: true })).not.toBeInTheDocument();
  });

  it('marks handles as not connectable when isConnectable is false', () => {
    const { container } = renderNode(baseData, { isConnectable: false });
    expect(container.querySelectorAll('.react-flow__handle.connectable')).toHaveLength(0);
  });

  it('marks handles as connectable by default', () => {
    const { container } = renderNode(baseData);
    expect(container.querySelectorAll('.react-flow__handle.connectable').length).toBeGreaterThan(0);
  });

  it('omits onRemove and onMenu when parent callbacks are missing', () => {
    renderNode(baseData, {
      chrome: {
        nodeChrome: {
          topLeft: ({ onRemove, onMenu }) => (
            <>
              <span>{onRemove ? 'has-remove' : 'no-remove'}</span>
              <span>{onMenu ? 'has-menu' : 'no-menu'}</span>
            </>
          ),
        },
      },
    });
    expect(screen.getByText('no-remove')).toBeInTheDocument();
    expect(screen.getByText('no-menu')).toBeInTheDocument();
  });

  it('renders client chrome and wires remove and menu callbacks', () => {
    const onNodeRemove = vi.fn();
    const onNodeMenu = vi.fn();
    renderNode(baseData, {
      chrome: {
        onNodeRemove,
        onNodeMenu,
        nodeChrome: {
          topLeft: ({ onRemove }) => (
            <button type="button" onClick={onRemove}>Remove</button>
          ),
          bottomRight: ({ onMenu }) => (
            <button type="button" onClick={onMenu}>Menu</button>
          ),
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove', hidden: true }));
    expect(onNodeRemove).toHaveBeenCalledWith('n1');

    fireEvent.click(screen.getByRole('button', { name: 'Menu', hidden: true }), {
      clientX: 42,
      clientY: 84,
    });
    expect(onNodeMenu).toHaveBeenCalledWith('n1', { x: 42, y: 84 });
  });

  it('falls back to the node bounding rect when menu is triggered without pointer coordinates', () => {
    const onNodeMenu = vi.fn();
    renderNode(baseData, {
      chrome: {
        onNodeMenu,
        nodeChrome: {
          bottomRight: ({ onMenu }) => (
            <button type="button" onClick={() => onMenu?.()}>Menu</button>
          ),
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Menu', hidden: true }));
    expect(onNodeMenu).toHaveBeenCalledWith('n1', expect.objectContaining({
      x: expect.any(Number),
      y: expect.any(Number),
    }));
  });

  it('wraps the library icon in the icon slot by default', () => {
    const { container } = renderNode(baseData);
    expect(container.querySelector(`.${styles.icon} svg`)).toBeTruthy();
  });

  it('renders a client icon when getNodeIcon is provided', () => {
    renderNode(baseData, {
      getNodeIcon: () => <span>host-icon</span>,
    });
    expect(screen.getByText('host-icon')).toBeInTheDocument();
  });

  it('passes the simplified primary type and graph node to getNodeIcon', () => {
    const getNodeIcon = vi.fn(() => <span>host-icon</span>);
    renderNode(baseData, { getNodeIcon });
    expect(getNodeIcon).toHaveBeenCalledWith('Drug', baseGraphNode);
  });

  it('uses the library icon when getNodeIcon returns null', () => {
    const { container } = renderNode(baseData, { getNodeIcon: () => null });
    expect(container.querySelector(`.${styles.icon} svg`)).toBeTruthy();
    expect(screen.queryByText('host-icon')).not.toBeInTheDocument();
  });

  it('uses the library icon when getNodeIcon returns undefined', () => {
    const { container } = renderNode(baseData, { getNodeIcon: () => undefined });
    expect(container.querySelector(`.${styles.icon} svg`)).toBeTruthy();
  });

  it('hides the icon when getNodeIcon returns false', () => {
    const { container } = renderNode(baseData, { getNodeIcon: () => false });
    expect(container.querySelector('svg')).toBeFalsy();
    expect(container.querySelector(`.${styles.icon}`)).toBeFalsy();
  });

  it('wraps a non-svg client icon in the icon slot', () => {
    const { container } = renderNode(baseData, {
      getNodeIcon: () => <img alt="host-icon" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />,
    });
    expect(container.querySelector(`.${styles.icon} img`)).toBeTruthy();
  });
  it('leaves the background vars unset when no getNodeColor is supplied', () => {
    const { container } = renderNode(baseData);
    const node = container.querySelector(`.${styles.node}`) as HTMLElement;
    expect(node.style.getPropertyValue('--tgv-node-bg')).toBe('');
    expect(node.style.getPropertyValue('--tgv-node-bg-hover')).toBe('');
  });

  it('passes the simplified primary type and graph node to getNodeColor', () => {
    const getNodeColor = vi.fn(() => ({ background: '#FFEEDD' }));
    renderNode(baseData, { getNodeColor });
    expect(getNodeColor).toHaveBeenCalledWith('Drug', baseGraphNode);
  });

  it('sets both background vars from getNodeColor', () => {
    const { container } = renderNode(baseData, {
      getNodeColor: () => ({ background: '#FFEEDD', hoverBackground: '#CCBBAA' }),
    });
    const node = container.querySelector(`.${styles.node}`) as HTMLElement;
    expect(node.style.getPropertyValue('--tgv-node-bg')).toBe('#FFEEDD');
    expect(node.style.getPropertyValue('--tgv-node-bg-hover')).toBe('#CCBBAA');
  });

  it('falls back to the resting background when hoverBackground is omitted', () => {
    const { container } = renderNode(baseData, {
      getNodeColor: () => ({ background: '#FFEEDD' }),
    });
    const node = container.querySelector(`.${styles.node}`) as HTMLElement;
    expect(node.style.getPropertyValue('--tgv-node-bg-hover')).toBe('#FFEEDD');
  });

  it('leaves the background vars unset when getNodeColor returns null', () => {
    const { container } = renderNode(baseData, { getNodeColor: () => null });
    const node = container.querySelector(`.${styles.node}`) as HTMLElement;
    expect(node.style.getPropertyValue('--tgv-node-bg')).toBe('');
  });

  it('clears background vars when getNodeColor is removed on rerender', () => {
    const getNodeColor = () => ({ background: '#FFEEDD' });
    const { container, rerender } = render(
      <NodeWithColorChrome data={baseData} getNodeColor={getNodeColor} />,
    );

    let node = container.querySelector(`.${styles.node}`) as HTMLElement;
    expect(node.style.getPropertyValue('--tgv-node-bg')).toBe('#FFEEDD');

    rerender(<NodeWithColorChrome data={baseData} />);

    node = container.querySelector(`.${styles.node}`) as HTMLElement;
    expect(node.style.getPropertyValue('--tgv-node-bg')).toBe('');
    expect(node.style.getPropertyValue('--tgv-node-bg-hover')).toBe('');
  });
});
