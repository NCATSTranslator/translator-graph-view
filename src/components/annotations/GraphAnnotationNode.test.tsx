import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { GraphAnnotationNode } from './GraphAnnotationNode';
import { GraphSettingsContext } from '../../hooks/useGraphSettings';
import { AnnotationActionsContext } from '../../hooks/useAnnotationActions';
import { DEFAULT_PLACEHOLDER } from './GraphAnnotationNode';
import type { GraphAnnotationStyles } from '../../types';

/** The display view swaps in the textarea; click it to reach edit mode. */
function enterEditMode(): HTMLTextAreaElement {
  fireEvent.click(screen.getByLabelText('Edit annotation'));
  return screen.getByRole('textbox') as HTMLTextAreaElement;
}

function renderAnnotationNode(
  overrides?: {
    text?: string;
    readOnly?: boolean;
    annotationStyles?: GraphAnnotationStyles;
    onTextChange?: (id: string, text: string) => void;
    onDelete?: (id: string) => void;
  },
) {
  const onTextChange = overrides?.onTextChange ?? vi.fn();
  const onDelete = overrides?.onDelete ?? vi.fn();
  const readOnly = overrides?.readOnly ?? false;

  render(
    <ReactFlowProvider>
      <GraphSettingsContext.Provider
        value={{ multiEdgeSpacing: 60, annotationStyles: overrides?.annotationStyles }}
      >
        <AnnotationActionsContext.Provider
          value={readOnly
            ? { onTextChange: vi.fn(), onDelete: vi.fn(), readOnly: true }
            : { onTextChange, onDelete, readOnly: false }}
        >
          <GraphAnnotationNode
            id="ann-1"
            type="graphAnnotation"
            selected={false}
            dragging={false}
            zIndex={1000}
            selectable={false}
            deletable={false}
            draggable={!readOnly}
            isConnectable={false}
            positionAbsoluteX={0}
            positionAbsoluteY={0}
            data={{
              text: overrides?.text ?? 'Hello note',
              annotation: {
                id: 'ann-1',
                text: overrides?.text ?? 'Hello note',
                position: { x: 0, y: 0 },
              },
            }}
          />
        </AnnotationActionsContext.Provider>
      </GraphSettingsContext.Provider>
    </ReactFlowProvider>,
  );

  return { onTextChange, onDelete };
}

describe('GraphAnnotationNode', () => {
  it('renders annotation text as static text until it is clicked', () => {
    renderAnnotationNode();

    expect(screen.getByText('Hello note')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the placeholder when there is no text', () => {
    renderAnnotationNode({ text: '' });

    expect(screen.getByText(DEFAULT_PLACEHOLDER)).toBeInTheDocument();
  });

  it('commits text changes on blur', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();
    renderAnnotationNode({ onTextChange });

    const textarea = enterEditMode();
    await user.clear(textarea);
    await user.type(textarea, 'Updated note');
    fireEvent.blur(textarea);

    expect(onTextChange).toHaveBeenCalledWith('ann-1', 'Updated note');
  });

  it('returns to the display view after committing', () => {
    renderAnnotationNode();

    const textarea = enterEditMode();
    fireEvent.blur(textarea);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Hello note')).toBeInTheDocument();
  });

  it('discards the edit and exits on Escape', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();
    renderAnnotationNode({ onTextChange });

    const textarea = enterEditMode();
    await user.type(textarea, ' edited');
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(onTextChange).not.toHaveBeenCalled();
    expect(screen.getByText('Hello note')).toBeInTheDocument();
  });

  it('keeps the full pasted value', () => {
    renderAnnotationNode({ text: '' });
    const textarea = enterEditMode();
    const pastedText = 'Beginning of pasted text that should all remain visible';

    fireEvent.change(textarea, { target: { value: pastedText } });

    expect(textarea).toHaveValue(pastedText);
  });

  it('calls delete handler when delete button is clicked', () => {
    const onDelete = vi.fn();
    renderAnnotationNode({ onDelete });

    fireEvent.click(screen.getByLabelText('Delete annotation'));

    expect(onDelete).toHaveBeenCalledWith('ann-1');
  });

  it('is not editable and hides delete when readOnly is true', () => {
    renderAnnotationNode({ readOnly: true });

    expect(screen.getByText('Hello note')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit annotation')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete annotation')).not.toBeInTheDocument();
  });

  describe('links', () => {
    it('renders URLs, emails, and markdown links as anchors', () => {
      renderAnnotationNode({
        text: 'See https://example.com/a, mail a@b.co, or [the paper](https://example.com/p)',
      });

      expect(screen.getByRole('link', { name: 'https://example.com/a' }))
        .toHaveAttribute('href', 'https://example.com/a');
      expect(screen.getByRole('link', { name: 'a@b.co' }))
        .toHaveAttribute('href', 'mailto:a@b.co');
      expect(screen.getByRole('link', { name: 'the paper' }))
        .toHaveAttribute('href', 'https://example.com/p');
    });

    it('opens links in a new tab without leaking the opener', () => {
      renderAnnotationNode({ text: 'https://example.com/a' });

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not enter edit mode when a link is clicked', () => {
      renderAnnotationNode({ text: 'https://example.com/a' });

      fireEvent.click(screen.getByRole('link'));

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('links in read-only annotations too', () => {
      renderAnnotationNode({ text: 'https://example.com/a', readOnly: true });

      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/a');
    });

    it('shows the raw text when linkify is disabled', () => {
      renderAnnotationNode({
        text: 'https://example.com/a',
        annotationStyles: { linkify: false },
      });

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('https://example.com/a')).toBeInTheDocument();
    });

    it('applies a client link class', () => {
      renderAnnotationNode({
        text: 'https://example.com/a',
        annotationStyles: { linkClassName: 'client-link' },
      });

      expect(screen.getByRole('link')).toHaveClass('client-link');
    });

    it('shows the editable raw text while editing', () => {
      renderAnnotationNode({ text: '[the paper](https://example.com/p)' });

      const textarea = enterEditMode();

      expect(textarea).toHaveValue('[the paper](https://example.com/p)');
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
