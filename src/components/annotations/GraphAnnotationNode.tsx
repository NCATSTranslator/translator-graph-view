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

  const containerStyle = annotationStyles?.backgroundColor
    ? { backgroundColor: annotationStyles.backgroundColor }
    : undefined;

  const deleteButtonStyle = annotationStyles?.deleteButton?.backgroundColor
    ? { backgroundColor: annotationStyles.deleteButton.backgroundColor }
    : undefined;

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
      className={cn(
        styles.annotation,
        annotationStyles?.className,
        nodeData.hovered && styles.hovered,
        nodeData.dimmed && styles.dimmed,
        nodeData.hovered && hoverStyles?.hoveredAnnotationClassName,
        nodeData.dimmed && hoverStyles?.dimmedAnnotationClassName,
      )}
      style={containerStyle}
    >
      {!readOnly && (
        <button
          type="button"
          className={cn(
            styles.deleteButton,
            'nodrag',
            'nopan',
            annotationStyles?.deleteButton?.className,
          )}
          style={deleteButtonStyle}
          aria-label="Delete annotation"
          onClick={handleDelete}
        >
          {annotationStyles?.deleteButton?.icon ?? <DefaultDeleteIcon />}
        </button>
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
