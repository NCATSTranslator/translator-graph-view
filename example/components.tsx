import type { ReactNode } from 'react';
import type {
  Selection,
  GraphNodeType,
  GraphEdgeType,
  HoverGeometry,
} from '../src';
import styles from './App.module.css';

interface ToggleListProps<T extends string> {
  items: Array<{ label: string; value: T }>;
  active: T;
  onChange: (value: T) => void;
}

export function ToggleList<T extends string>({ items, active, onChange }: ToggleListProps<T>) {
  return (
    <div className={styles.buttonGroup}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`${styles.button} ${active === item.value ? styles.buttonActive : ''}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

interface SelectionListProps {
  title: string;
  items: Array<{ id: string; label: string }>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

export function SelectionList({ title, items, hoveredId, onHover }: SelectionListProps) {
  if (items.length === 0) return null;
  return (
    <div className={styles.selectedItems}>
      <strong>{title}</strong>
      <ul className={styles.list}>
        {items.map((item) => (
          <li
            key={item.id}
            className={`${styles.listItem} ${hoveredId === item.id ? styles.listItemHovered : ''}`}
            onMouseEnter={() => onHover(item.id)}
            onMouseLeave={() => onHover(null)}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface HoverPanelProps {
  hoveredNode: GraphNodeType | null;
  hoveredEdge: GraphEdgeType | null;
  hoverGeometry: HoverGeometry | null;
}

export function HoverPanel({ hoveredNode, hoveredEdge, hoverGeometry }: HoverPanelProps) {
  const nothingHovered = !hoveredNode && !hoveredEdge;
  return (
    <div className={styles.selectionInfo}>
      {hoveredNode && <div>Node: {hoveredNode.names[0] || hoveredNode.id}</div>}
      {hoveredEdge && <div>Edge: {hoveredEdge.predicate}</div>}
      {hoverGeometry && (
        <div className={styles.hoverGeometryMeta}>
          <div>
            Anchor ({hoverGeometry.anchorPosition}):{' '}
            {Math.round(hoverGeometry.anchor.x)}, {Math.round(hoverGeometry.anchor.y)}
          </div>
          <div>
            Bounds: {Math.round(hoverGeometry.rect.width)}×{Math.round(hoverGeometry.rect.height)}
          </div>
        </div>
      )}
      {nothingHovered && <div className={styles.hoverEmpty}>Hover over a node or edge</div>}
    </div>
  );
}

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

interface SelectionInfoProps {
  selection: Selection;
}

export function SelectionCounts({ selection }: SelectionInfoProps) {
  return (
    <div className={styles.selectionInfo}>
      <div>Nodes: {selection.nodes.length}</div>
      <div>Edges: {selection.edges.length}</div>
    </div>
  );
}
