import { memo, useMemo, useRef, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type {
  GraphNode as GraphNodeType,
  GraphNodeChromeContext,
  GraphNodeColors,
  GraphNodeData,
} from '../../types';
import { getNodeTypeIcon } from '../../utils/utils';
import { getNodeDisplayLabel } from '../../utils/dataTransform';
import { cn } from '../../utils/cn';
import { useGraphSettings } from '../../hooks/useGraphSettings';
import { useNodeChrome } from '../../hooks/useNodeChrome';
import styles from './GraphNode.module.scss';

function NodeChromeSlot({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      className={cn(styles.chrome, className, 'nodrag', 'nopan')}
      onClick={stopNodeEvent}
      onMouseDown={stopNodeEvent}
      onPointerDown={stopNodeEvent}
    >
      {children}
    </div>
  );
}

function stopNodeEvent(event: { stopPropagation(): void }) {
  event.stopPropagation();
}

function menuPositionFromEvent(
  event: MouseEvent | undefined,
  nodeElement: HTMLElement | null,
): { x: number; y: number } {
  if (event && (event.clientX !== 0 || event.clientY !== 0)) {
    return { x: event.clientX, y: event.clientY };
  }
  if (nodeElement) {
    const rect = nodeElement.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }
  return { x: 0, y: 0 };
}

function GraphNodeChromeSlots({
  id,
  node,
  selected,
  nodeRef,
}: {
  id: string;
  node: GraphNodeType;
  selected: boolean;
  nodeRef: RefObject<HTMLDivElement | null>;
}) {
  const { nodeChrome, onNodeRemove, onNodeMenu } = useNodeChrome();
  const chromeCtx = useMemo((): GraphNodeChromeContext | null => {
    if (!nodeChrome) return null;
    return {
      node,
      selected: Boolean(selected),
      onRemove: onNodeRemove ? () => { onNodeRemove(id); } : undefined,
      onMenu: onNodeMenu
        ? (event?: MouseEvent) => {
            onNodeMenu(id, menuPositionFromEvent(event, nodeRef.current));
          }
        : undefined,
    };
  }, [id, node, nodeChrome, nodeRef, onNodeMenu, onNodeRemove, selected]);

  if (!chromeCtx || !nodeChrome) return null;

  return (
    <>
      <NodeChromeSlot className={styles.chromeTopLeft}>
        {nodeChrome.topLeft?.(chromeCtx)}
      </NodeChromeSlot>
      <NodeChromeSlot className={styles.chromeBottomRight}>
        {nodeChrome.bottomRight?.(chromeCtx)}
      </NodeChromeSlot>
    </>
  );
}

function NodeTypeIcon({ icon }: { icon: ReactNode }) {
  if (icon === false || icon === null || icon === undefined) {
    return null;
  }
  return <span className={styles.icon}>{icon}</span>;
}

/**
 * Node custom properties. The background vars stay unset when the client
 * supplies no color, which leaves the node on the stylesheet's default
 * background.
 */
function nodeStyleFor(
  colors: GraphNodeColors | null | undefined,
): React.CSSProperties {
  if (!colors) return {};
  return {
    '--tgv-node-bg': colors.background,
    '--tgv-node-bg-hover': colors.hoverBackground ?? colors.background,
  } as React.CSSProperties;
}

function GraphNodeComponent({ id, data, selected, isConnectable = true }: NodeProps) {
  const nodeData = data as GraphNodeData;
  const { hoverStyles } = useGraphSettings();
  const { getNodeIcon, getNodeColor } = useNodeChrome();
  const nodeRef = useRef<HTMLDivElement>(null);
  const nodeColors = getNodeColor?.(nodeData.primaryType, nodeData.graphNode);
  const nodeStyle = useMemo(
    () => nodeStyleFor(nodeColors),
    [nodeColors?.background, nodeColors?.hoverBackground],
  );

  const nodeTypeIcon = getNodeIcon?.(nodeData.primaryType, nodeData.graphNode)
    ?? getNodeTypeIcon(nodeData.primaryType);
  const nodeLabel = getNodeDisplayLabel(nodeData.label, nodeData.primaryType);

  const className = cn(
    styles.node,
    selected && styles.selected,
    nodeData.hovered && styles.hovered,
    nodeData.dimmed && styles.dimmed,
    nodeData.hovered && hoverStyles?.hoveredNodeClassName,
    nodeData.dimmed && hoverStyles?.dimmedNodeClassName,
  );

  return (
    <div
      ref={nodeRef}
      className={className}
      style={nodeStyle}
    >
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />

      <NodeTypeIcon icon={nodeTypeIcon} />

      <div className={styles.label} title={nodeData.label}>
        {nodeLabel}
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />

      <GraphNodeChromeSlots
        id={id}
        node={nodeData.graphNode}
        selected={Boolean(selected)}
        nodeRef={nodeRef}
      />
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
