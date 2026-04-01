import { memo, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import type { GraphEdgeData, EdgeType } from '../../types';
import styles from './GraphEdge.module.scss';

function getEdgePath(
  type: EdgeType,
  params: {
    sourceX: number;
    sourceY: number;
    sourcePosition: EdgeProps['sourcePosition'];
    targetX: number;
    targetY: number;
    targetPosition: EdgeProps['targetPosition'];
  }
): [string, number, number, number, number] {
  switch (type) {
    case 'bezier':
      return getBezierPath(params);
    case 'step':
      return getSmoothStepPath({ ...params, borderRadius: 0 });
    case 'smoothstep':
      return getSmoothStepPath(params);
    case 'straight':
    default:
      return getStraightPath(params);
  }
}

function GraphEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as GraphEdgeData | undefined;
  const edgeType: EdgeType = edgeData?.edgeType ?? 'straight';

  const [edgePath, labelX, labelY] = useMemo(
    () =>
      getEdgePath(edgeType, {
        sourceX,
        sourceY: sourceY - 16,
        sourcePosition,
        targetX,
        targetY: targetY + 16,
        targetPosition,
      }),
    [edgeType, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]
  );

  const showLabel = edgeData?.showLabel ?? true;
  const label = showLabel ? edgeData?.label || '' : '';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={`${styles.edgePath} ${selected ? styles.selected : ''}`}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              style={{
                background: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 500,
                color: selected ? '#4285F4' : '#666',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
              }}
              title={edgeData?.graphEdge?.predicate}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const GraphEdge = memo(GraphEdgeComponent);
