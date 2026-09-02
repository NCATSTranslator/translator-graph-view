import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import styles from './GraphAnnotationNode.module.scss';

const MIN_TEXTAREA_HEIGHT = 48;

interface AnnotationEditorProps {
  initialText: string;
  /** Character offset to place the caret at, or null for the end of the text. */
  initialCaret: number | null;
  placeholder: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

function syncTextareaHeight(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(MIN_TEXTAREA_HEIGHT, textarea.scrollHeight)}px`;
}

/**
 * The editing face of an annotation. It owns the draft text so the display view
 * keeps showing the committed value, and grows to fit as the user types.
 */
export function AnnotationEditor({
  initialText,
  initialCaret,
  placeholder,
  onCommit,
  onCancel,
}: AnnotationEditorProps) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The textarea replaces the display view, so focus and the caret have to be
  // put back where the click landed once it exists.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    syncTextareaHeight(textarea);
    const caret = initialCaret ?? textarea.value.length;
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
    // Mount-only: later caret moves belong to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    syncTextareaHeight(event.target);
  }, []);

  const handleBlur = useCallback(() => onCommit(text), [onCommit, text]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    // Keep Escape from also reaching the graph's own key handling.
    event.stopPropagation();
    onCancel();
  }, [onCancel]);

  return (
    <>
      <div className={styles.sizer}>{text || placeholder}</div>
      <textarea
        ref={textareaRef}
        className={cn(styles.textarea, 'nodrag', 'nopan')}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </>
  );
}
