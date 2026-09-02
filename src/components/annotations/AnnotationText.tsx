import { Fragment, useMemo, type MouseEvent, type PointerEvent } from 'react';
import { parseAnnotationText } from '../../utils/annotationText';
import { cn } from '../../utils/cn';
import styles from './GraphAnnotationNode.module.scss';

interface AnnotationTextProps {
  text: string;
  /** When false the text renders verbatim, with no anchors. */
  linkify: boolean;
  linkClassName?: string;
}

/**
 * Keep clicks and drags that start on a link from reaching the note behind it,
 * which would otherwise open the editor or pan the canvas instead of following
 * the link.
 */
function stopEvent(event: MouseEvent | PointerEvent): void {
  event.stopPropagation();
}

/** Annotation body text with URLs, emails, and markdown links as anchors. */
export function AnnotationText({ text, linkify, linkClassName }: AnnotationTextProps) {
  const tokens = useMemo(
    () => (linkify ? parseAnnotationText(text) : [{ type: 'text' as const, value: text }]),
    [linkify, text],
  );

  return (
    <>
      {tokens.map((token, index) => (token.type === 'text' ? (
        <Fragment key={index}>{token.value}</Fragment>
      ) : (
        <a
          key={index}
          className={cn(styles.link, 'nodrag', 'nopan', linkClassName)}
          href={token.href}
          target="_blank"
          rel="noopener noreferrer"
          title={token.href}
          onClick={stopEvent}
          onPointerDown={stopEvent}
        >
          {token.label}
        </a>
      )))}
    </>
  );
}
