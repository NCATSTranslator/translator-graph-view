import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../types';
import styles from './GraphNode.module.scss';

function GraphNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as GraphNodeData;
  const nodeStyle = {
    '--node-color': nodeData.color,
  } as React.CSSProperties;

  return (
    <div
      className={`${styles.node} ${selected ? styles.selected : ''}`}
      style={nodeStyle}
    >
      <Handle type="target" position={Position.Top} />

      <div className={styles.label} title={nodeData.label}>
        {nodeData.label}
      </div>

      <div className={styles.typeBadge}>
        <svg className={styles.icon} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" />
        </svg>
        {nodeData.primaryType}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
