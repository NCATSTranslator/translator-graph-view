import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../types';
import { capitalizeAllWords, getNodeTypeIcon } from '../../utils/utils';
import { cn } from '../../utils/cn';
import { useGraphSettings } from '../../hooks/useGraphSettings';
import styles from './GraphNode.module.scss';

function GraphNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as GraphNodeData;
  const { hoverStyles } = useGraphSettings();
  const nodeStyle = {
    '--node-color': nodeData.color,
  } as React.CSSProperties;

  const nodeTypeIcon = getNodeTypeIcon(nodeData.primaryType);
  const nodeLabel = (nodeData.primaryType === 'Gene' || nodeData.primaryType === 'Protein')
    ? nodeData.label.toUpperCase()
    : capitalizeAllWords(nodeData.label);

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
      className={className}
      style={nodeStyle}
    >
      <Handle type="target" position={Position.Top} />

      {nodeTypeIcon}

      <div className={styles.label} title={nodeData.label}>
        {nodeLabel}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
