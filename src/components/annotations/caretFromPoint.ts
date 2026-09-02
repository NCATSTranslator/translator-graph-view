interface CaretSource {
  offsetNode: Node;
  offset: number;
}

/** Safari and older WebKit only expose the Range-based variant. */
interface WebKitCaretDocument {
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
}

function caretSourceFromPoint(x: number, y: number): CaretSource | null {
  if (typeof document.caretPositionFromPoint === 'function') {
    return document.caretPositionFromPoint(x, y);
  }

  const webkitDocument = document as unknown as WebKitCaretDocument;
  if (typeof webkitDocument.caretRangeFromPoint === 'function') {
    const range = webkitDocument.caretRangeFromPoint(x, y);
    return range ? { offsetNode: range.startContainer, offset: range.startOffset } : null;
  }

  return null;
}

/**
 * Character offset of `target`/`offset` within `container`'s text content, or
 * `null` when the position is not inside the container.
 */
function textOffsetWithin(container: Node, target: Node, offset: number): number | null {
  if (!container.contains(target)) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node === target) return total + offset;
    total += node.textContent?.length ?? 0;
  }

  // A click landing on an element rather than a text node (padding, gaps
  // between spans) reports the element itself; fall back to its end.
  return target === container ? total : null;
}

/**
 * Where a click at `(x, y)` lands in the annotation's text, so swapping the
 * display view for the textarea can keep the caret under the pointer instead of
 * snapping it to the end.
 */
export function caretIndexFromPoint(
  container: HTMLElement,
  x: number,
  y: number,
): number | null {
  try {
    const source = caretSourceFromPoint(x, y);
    if (!source) return null;
    return textOffsetWithin(container, source.offsetNode, source.offset);
  } catch {
    return null;
  }
}
