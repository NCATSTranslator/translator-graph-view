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
import { useGraphSettings } from '../../hooks/useGraphSettings';
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

/**
 * Compute a quadratic bezier path with the control point offset
 * perpendicular to the straight line between source and target.
 * Returns [pathString, labelX, labelY].
 */
function getMultiEdgePath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  edgeIndex: number,
  edgeTotalCount: number,
  spacing: number,
): [string, number, number] {
  const offset = (edgeIndex - (edgeTotalCount - 1) / 2) * spacing;

  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Perpendicular unit vector
  const px = -dy / len;
  const py = dx / len;

  // Control point at the midpoint, offset perpendicularly
  const mx = (sx + tx) / 2 + px * offset;
  const my = (sy + ty) / 2 + py * offset;

  // Label sits at the quadratic bezier midpoint (t=0.5)
  const labelX = 0.25 * sx + 0.5 * mx + 0.25 * tx;
  const labelY = 0.25 * sy + 0.5 * my + 0.25 * ty;

  return [`M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`, labelX, labelY];
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
  const { multiEdgeSpacing } = useGraphSettings();
  const edgeData = data as GraphEdgeData | undefined;
  const edgeType: EdgeType = edgeData?.edgeType ?? 'straight';
  const inferred = edgeData?.inferred ?? false;
  const edgeIndex = edgeData?.edgeIndex;
  const edgeTotalCount = edgeData?.edgeTotalCount;
  const isMultiEdge = edgeTotalCount != null && edgeTotalCount > 1 && edgeIndex != null;

  const adjustedSourceY = sourceY - 16;
  const adjustedTargetY = targetY + 16;

  const [edgePath, labelX, labelY] = useMemo(() => {
    if (isMultiEdge) {
      return getMultiEdgePath(
        sourceX, adjustedSourceY,
        targetX, adjustedTargetY,
        edgeIndex, edgeTotalCount,
        multiEdgeSpacing,
      );
    }
    return getEdgePath(edgeType, {
      sourceX,
      sourceY: adjustedSourceY,
      sourcePosition,
      targetX,
      targetY: adjustedTargetY,
      targetPosition,
    });
  }, [
    isMultiEdge, edgeIndex, edgeTotalCount, multiEdgeSpacing,
    edgeType, sourceX, adjustedSourceY, sourcePosition,
    targetX, adjustedTargetY, targetPosition,
  ]);

  const showLabel = edgeData?.showLabel ?? true;
  const label = showLabel ? edgeData?.label || '' : '';

  const pathClassName = [
    styles.edgePath,
    selected ? styles.selected : '',
    inferred ? styles.inferred : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={pathClassName}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className={`nodrag nopan ${styles.edgeLabelContainer}`}
          >
            <div
              className={`${styles.edgeLabel} ${selected ? styles.selected : ''}`}
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
