import { describe, it, expect } from 'vitest';
import { parseAnnotationText, toSafeHref } from './annotationText';

describe('toSafeHref', () => {
  it('keeps http and https URLs', () => {
    expect(toSafeHref('https://example.com/a')).toBe('https://example.com/a');
    expect(toSafeHref('http://example.com')).toBe('http://example.com/');
  });

  it('adds https to www-prefixed hosts and mailto to emails', () => {
    expect(toSafeHref('www.example.com')).toBe('https://www.example.com/');
    expect(toSafeHref('someone@example.com')).toBe('mailto:someone@example.com');
  });

  it('rejects disallowed schemes and schemeless text', () => {
    expect(toSafeHref('javascript:alert(1)')).toBeNull();
    expect(toSafeHref('data:text/html,<script>')).toBeNull();
    expect(toSafeHref('file:///etc/passwd')).toBeNull();
    expect(toSafeHref('//example.com')).toBeNull();
    expect(toSafeHref('not a link')).toBeNull();
  });
});

describe('parseAnnotationText', () => {
  it('returns a single text token when there are no links', () => {
    expect(parseAnnotationText('plain note')).toEqual([
      { type: 'text', value: 'plain note' },
    ]);
  });

  it('splits a bare URL out of surrounding prose', () => {
    expect(parseAnnotationText('see https://example.com/x now')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'link', label: 'https://example.com/x', href: 'https://example.com/x' },
      { type: 'text', value: ' now' },
    ]);
  });

  it('leaves sentence punctuation out of the link', () => {
    expect(parseAnnotationText('read https://example.com/x.')).toEqual([
      { type: 'text', value: 'read ' },
      { type: 'link', label: 'https://example.com/x', href: 'https://example.com/x' },
      { type: 'text', value: '.' },
    ]);
  });

  it('keeps a closing paren the URL opened', () => {
    const tokens = parseAnnotationText('https://en.wikipedia.org/wiki/Metformin_(drug)');
    expect(tokens).toEqual([
      {
        type: 'link',
        label: 'https://en.wikipedia.org/wiki/Metformin_(drug)',
        href: 'https://en.wikipedia.org/wiki/Metformin_(drug)',
      },
    ]);
  });

  it('drops a closing paren the URL did not open', () => {
    expect(parseAnnotationText('(see https://example.com/x)')).toEqual([
      { type: 'text', value: '(see ' },
      { type: 'link', label: 'https://example.com/x', href: 'https://example.com/x' },
      { type: 'text', value: ')' },
    ]);
  });

  it('links www hosts and emails', () => {
    expect(parseAnnotationText('www.example.com and a@b.co')).toEqual([
      { type: 'link', label: 'www.example.com', href: 'https://www.example.com/' },
      { type: 'text', value: ' and ' },
      { type: 'link', label: 'a@b.co', href: 'mailto:a@b.co' },
    ]);
  });

  it('uses the label from markdown links', () => {
    expect(parseAnnotationText('[the paper](https://example.com/paper)')).toEqual([
      { type: 'link', label: 'the paper', href: 'https://example.com/paper' },
    ]);
  });

  it('handles parens inside a markdown target', () => {
    const tokens = parseAnnotationText('[wiki](https://en.wikipedia.org/wiki/Metformin_(drug))');
    expect(tokens).toEqual([
      {
        type: 'link',
        label: 'wiki',
        href: 'https://en.wikipedia.org/wiki/Metformin_(drug)',
      },
    ]);
  });

  it('renders a markdown link with an unsafe target as literal text', () => {
    expect(parseAnnotationText('[click](javascript:alert(1))')).toEqual([
      { type: 'text', value: '[click](javascript:alert(1))' },
    ]);
  });

  it('does not treat markup-looking text as a link', () => {
    expect(parseAnnotationText('<a href="https://evil.test">x</a>')).toEqual([
      { type: 'text', value: '<a href="' },
      { type: 'link', label: 'https://evil.test', href: 'https://evil.test/' },
      { type: 'text', value: '">x</a>' },
    ]);
  });
});
