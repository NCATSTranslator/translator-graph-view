import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { GraphAnnotationNode } from './GraphAnnotationNode';
import { GraphSettingsContext } from '../../hooks/useGraphSettings';
import { AnnotationActionsContext } from '../../hooks/useAnnotationActions';
import { DEFAULT_PLACEHOLDER } from './GraphAnnotationNode';

function renderAnnotationNode(
  overrides?: {
    text?: string;
    readOnly?: boolean;
    onTextChange?: (id: string, text: string) => void;
    onDelete?: (id: string) => void;
  },
) {
  const onTextChange = overrides?.onTextChange ?? vi.fn();
  const onDelete = overrides?.onDelete ?? vi.fn();
  const readOnly = overrides?.readOnly ?? false;

  render(
    <ReactFlowProvider>
      <GraphSettingsContext.Provider value={{ multiEdgeSpacing: 60 }}>
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
  it('renders annotation text', () => {
    renderAnnotationNode();
    expect(screen.getByDisplayValue('Hello note')).toBeInTheDocument();
  });

  it('commits text changes on blur', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();
    renderAnnotationNode({ onTextChange });

    const textarea = screen.getByDisplayValue('Hello note');
    await user.clear(textarea);
    await user.type(textarea, 'Updated note');
    fireEvent.blur(textarea);

    expect(onTextChange).toHaveBeenCalledWith('ann-1', 'Updated note');
  });

  it('keeps the full pasted value', () => {
    renderAnnotationNode({ text: '' });
    const textarea = screen.getByPlaceholderText(DEFAULT_PLACEHOLDER) as HTMLTextAreaElement;
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

  it('is read-only and hides delete when readOnly is true', () => {
    renderAnnotationNode({ readOnly: true });

    expect(screen.getByDisplayValue('Hello note')).toHaveAttribute('readonly');
    expect(screen.queryByLabelText('Delete annotation')).not.toBeInTheDocument();
  });
});
