import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { GraphAnnotationData } from '../../types';
import { useAnnotationActions } from '../../hooks/useAnnotationActions';
import { useGraphSettings } from '../../hooks/useGraphSettings';
import { cn } from '../../utils/cn';
import styles from './GraphAnnotationNode.module.scss';

const MIN_TEXTAREA_HEIGHT = 48;

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

function syncTextareaHeight(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(MIN_TEXTAREA_HEIGHT, textarea.scrollHeight)}px`;
}

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

function GraphAnnotationNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as GraphAnnotationData;
  const { annotationStyles, hoverStyles } = useGraphSettings();
  const { onTextChange, onDelete, readOnly } = useAnnotationActions();
  const [text, setText] = useState(nodeData.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (document.activeElement === textareaRef.current) return;
    setText(nodeData.text);
  }, [nodeData.text]);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      syncTextareaHeight(textareaRef.current);
    }
  }, [text]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    syncTextareaHeight(event.target);
  }, []);

  const handleBlur = useCallback(() => {
    if (!readOnly && text !== nodeData.text) {
      onTextChange(id, text);
    }
  }, [id, nodeData.text, onTextChange, readOnly, text]);

  const handleDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onDelete(id);
    },
    [id, onDelete],
  );

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
      <div className={styles.sizer}>{text || DEFAULT_PLACEHOLDER}</div>
      <textarea
        ref={textareaRef}
        className={cn(styles.textarea, 'nodrag', 'nopan')}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={DEFAULT_PLACEHOLDER}
        readOnly={readOnly}
      />
    </div>
  );
}

export const GraphAnnotationNode = memo(GraphAnnotationNodeComponent);
