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
import { NODE_HEIGHT } from '../../utils/dataTransform';
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
interface MultiEdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  edgeIndex: number;
  edgeTotalCount: number;
  spacing: number;
}

function getMultiEdgePath({
  sx, sy, tx, ty, edgeIndex, edgeTotalCount, spacing,
}: MultiEdgeParams): [string, number, number] {
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

const EDGE_Y_OFFSET = NODE_HEIGHT / 2;

interface ResolvedEdgeProps {
  edgeType: EdgeType;
  inferred: boolean;
  edgeIndex?: number;
  edgeTotalCount?: number;
  label: string;
  hovered: boolean;
  predicate?: string;
}

function resolveEdgeDataProps(data: GraphEdgeData | undefined): ResolvedEdgeProps {
  const {
    edgeType = 'straight',
    inferred = false,
    edgeIndex,
    edgeTotalCount,
    showLabel = true,
    label: rawLabel = '',
    hovered = false,
    graphEdge,
  } = data ?? {};
  return {
    edgeType,
    inferred,
    edgeIndex,
    edgeTotalCount,
    label: showLabel ? rawLabel : '',
    hovered,
    predicate: graphEdge?.predicate,
  };
}

function buildEdgePathClassName(
  styles: Record<string, string>,
  selected: boolean,
  inferred: boolean,
  hovered: boolean,
): string {
  const classes = [styles.edgePath];
  if (selected) classes.push(styles.selected);
  if (inferred) classes.push(styles.inferred);
  if (hovered) classes.push(styles.hovered);
  return classes.join(' ');
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
  const {
    edgeType, inferred, edgeIndex, edgeTotalCount,
    label, hovered, predicate,
  } = resolveEdgeDataProps(edgeData);

  const [edgePath, labelX, labelY] = useMemo(() => {
    const adjSourceY = sourceY - EDGE_Y_OFFSET;
    const adjTargetY = targetY + EDGE_Y_OFFSET;

    if (edgeIndex !== undefined && edgeTotalCount !== undefined && edgeTotalCount > 1) {
      return getMultiEdgePath({
        sx: sourceX, sy: adjSourceY,
        tx: targetX, ty: adjTargetY,
        edgeIndex, edgeTotalCount,
        spacing: multiEdgeSpacing,
      });
    }
    return getEdgePath(edgeType, {
      sourceX,
      sourceY: adjSourceY,
      sourcePosition,
      targetX,
      targetY: adjTargetY,
      targetPosition,
    });
  }, [
    edgeIndex, edgeTotalCount, multiEdgeSpacing,
    edgeType, sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  ]);

  const pathClassName = buildEdgePathClassName(styles, !!selected, inferred, hovered);

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
            // eslint-disable-next-line no-restricted-syntax
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className={`nodrag nopan ${styles.edgeLabelContainer}`}
          >
            <div
              className={`${styles.edgeLabel} ${selected ? styles.selected : ''}`}
              title={predicate}
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
