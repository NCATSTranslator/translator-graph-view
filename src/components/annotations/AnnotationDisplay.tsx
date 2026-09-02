import { useCallback, useRef } from 'react';
import { cn } from '../../utils/cn';
import { AnnotationText } from './AnnotationText';
import { caretIndexFromPoint } from './caretFromPoint';
import styles from './GraphAnnotationNode.module.scss';

/**
 * Pointer travel (px) still treated as a click. Annotations are dragged by their
 * body, so a click that moved further than this was the tail of a drag, not a
 * request to start editing.
 */
const CLICK_MOVE_TOLERANCE = 4;

interface AnnotationDisplayProps {
  text: string;
  placeholder: string;
  linkify: boolean;
  linkClassName?: string;
  readOnly: boolean;
  /** Called with the clicked character offset, or null to start at the end. */
  onStartEditing: (caret: number | null) => void;
}

/**
 * The non-editing face of an annotation: static text whose links are clickable,
 * which hands off to the textarea when the note itself is clicked.
 */
export function AnnotationDisplay({
  text,
  placeholder,
  linkify,
  linkClassName,
  readOnly,
  onStartEditing,
}: AnnotationDisplayProps) {
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const origin = pointerDownRef.current;
    pointerDownRef.current = null;

    const moved = origin
      && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > CLICK_MOVE_TOLERANCE;
    if (moved) return;

    onStartEditing(caretIndexFromPoint(event.currentTarget, event.clientX, event.clientY));
  }, [onStartEditing]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Links inside the note handle their own Enter.
    if (event.key !== 'Enter' || event.target !== event.currentTarget) return;
    event.preventDefault();
    onStartEditing(null);
  }, [onStartEditing]);

  return (
    <div
      className={cn(styles.display, !text && styles.placeholder)}
      tabIndex={readOnly ? undefined : 0}
      aria-label={readOnly ? undefined : 'Edit annotation'}
      onPointerDown={readOnly ? undefined : handlePointerDown}
      onClick={readOnly ? undefined : handleClick}
      onKeyDown={readOnly ? undefined : handleKeyDown}
    >
      {text
        ? <AnnotationText text={text} linkify={linkify} linkClassName={linkClassName} />
        : placeholder}
    </div>
  );
}
