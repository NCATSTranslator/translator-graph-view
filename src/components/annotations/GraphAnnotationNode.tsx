import { memo, useCallback, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { GraphAnnotationData } from '../../types';
import { useAnnotationActions } from '../../hooks/useAnnotationActions';
import { useGraphSettings } from '../../hooks/useGraphSettings';
import { cn } from '../../utils/cn';
import { AnnotationDisplay } from './AnnotationDisplay';
import { AnnotationEditor } from './AnnotationEditor';
import styles from './GraphAnnotationNode.module.scss';

function DefaultDeleteIcon() {
  return (
    <svg
      className={styles.defaultDeleteIcon}
      viewBox="0 0 10 10"
      aria-hidden="true"
    >
      <path
        d="M1 1l8 8M9 1L1 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const DEFAULT_PLACEHOLDER = 'Add an annotation...';

function optionalBackground(color?: string): React.CSSProperties | undefined {
  return color ? { backgroundColor: color } : undefined;
}

function AnnotationDeleteButton({
  className,
  style,
  icon,
  onDelete,
}: {
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
  onDelete: (event: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className={cn(styles.deleteButton, 'nodrag', 'nopan', className)}
      style={style}
      aria-label="Delete annotation"
      onClick={onDelete}
    >
      {icon ?? <DefaultDeleteIcon />}
    </button>
  );
}

function annotationNodeClassName(
  annotationClassName: string | undefined,
  hovered: boolean | undefined,
  dimmed: boolean | undefined,
  hoveredClassName?: string,
  dimmedClassName?: string,
): string {
  return cn(
    styles.annotation,
    annotationClassName,
    hovered && styles.hovered,
    dimmed && styles.dimmed,
    hovered && hoveredClassName,
    dimmed && dimmedClassName,
  );
}

/** Null while the annotation shows its display view, else where the caret goes. */
type EditState = { caret: number | null } | null;

function GraphAnnotationNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as GraphAnnotationData;
  const { annotationStyles, hoverStyles } = useGraphSettings();
  const { onTextChange, onDelete, readOnly } = useAnnotationActions();
  const [edit, setEdit] = useState<EditState>(null);

  const stopEditing = useCallback(() => setEdit(null), []);

  const startEditing = useCallback((caret: number | null) => {
    if (!readOnly) setEdit({ caret });
  }, [readOnly]);

  const commit = useCallback((text: string) => {
    setEdit(null);
    if (text !== nodeData.text) onTextChange(id, text);
  }, [id, nodeData.text, onTextChange]);

  const handleDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete(id);
  }, [id, onDelete]);

  return (
    <div
      className={annotationNodeClassName(
        annotationStyles?.className,
        nodeData.hovered,
        nodeData.dimmed,
        hoverStyles?.hoveredAnnotationClassName,
        hoverStyles?.dimmedAnnotationClassName,
      )}
      style={optionalBackground(annotationStyles?.backgroundColor)}
    >
      {!readOnly && (
        <AnnotationDeleteButton
          className={annotationStyles?.deleteButton?.className}
          style={optionalBackground(annotationStyles?.deleteButton?.backgroundColor)}
          icon={annotationStyles?.deleteButton?.icon}
          onDelete={handleDelete}
        />
      )}
      {edit ? (
        <AnnotationEditor
          initialText={nodeData.text}
          initialCaret={edit.caret}
          placeholder={DEFAULT_PLACEHOLDER}
          onCommit={commit}
          onCancel={stopEditing}
        />
      ) : (
        <AnnotationDisplay
          text={nodeData.text}
          placeholder={DEFAULT_PLACEHOLDER}
          linkify={annotationStyles?.linkify !== false}
          linkClassName={annotationStyles?.linkClassName}
          readOnly={readOnly}
          onStartEditing={startEditing}
        />
      )}
    </div>
  );
}

export const GraphAnnotationNode = memo(GraphAnnotationNodeComponent);
