/**
 * Turns annotation plain text into a token stream so the display view can render
 * anchors without ever parsing HTML. Nothing here produces markup: the caller
 * builds React elements from the tokens, which is what keeps injected markup and
 * `javascript:` URLs out of the rendered note.
 */

export type AnnotationTextToken =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string };

/** Schemes an annotation link is allowed to navigate to. */
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Markdown first so `[label](url)` wins over the bare-URL branch, then absolute
 * URLs, `www.`-prefixed hosts, and finally emails. The markdown target allows one
 * level of nested parens so wiki-style URLs survive.
 */
const TOKEN_PATTERN = new RegExp(
  [
    // The two alternatives start with disjoint characters, so each position has
    // one path to try and matching stays linear.
    // eslint-disable-next-line sonarjs/slow-regex
    /\[(?<mdLabel>[^\]\n]+)\]\((?<mdHref>(?:[^\s()]|\([^\s()]*\))+)\)/,
    /(?<url>https?:\/\/[^\s<>]+)/,
    /(?<www>www\.[^\s<>]+)/,
    // The host class excludes the dot separator, so the segments cannot overlap
    // and backtrack against each other.
    // eslint-disable-next-line sonarjs/slow-regex
    /(?<email>[^\s<>()[\]{},;:"']+@[a-z0-9-]+(?:\.[a-z0-9-]+)+)/,
  ].map((part) => part.source).join('|'),
  'gi',
);

const TRAILING_PUNCTUATION = new Set([
  '.', ',', ';', ':', '!', '?', '"', "'", '’', '”',
]);

const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

function countChar(value: string, char: string): number {
  let total = 0;
  for (const candidate of value) {
    if (candidate === char) total += 1;
  }
  return total;
}

/**
 * Bare URLs in prose absorb the sentence punctuation that follows them. Trim it
 * back off, keeping a closing bracket only when the match opened it too.
 */
function trimTrailingPunctuation(value: string): string {
  let end = value.length;

  while (end > 0) {
    const char = value[end - 1];

    if (TRAILING_PUNCTUATION.has(char)) {
      end -= 1;
      continue;
    }

    const opener = CLOSERS[char];
    if (opener) {
      const slice = value.slice(0, end);
      if (countChar(slice, char) > countChar(slice, opener)) {
        end -= 1;
        continue;
      }
    }

    break;
  }

  return value.slice(0, end);
}

function isEmail(value: string): boolean {
  return !SCHEME_PATTERN.test(value) && value.includes('@');
}

/**
 * Resolve raw link text to a navigable href, or `null` when it is not something
 * we are willing to link. Only http(s) and mailto survive.
 */
export function toSafeHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^www\./i.test(value)) return toSafeHref(`https://${value}`);
  if (isEmail(value)) return toSafeHref(`mailto:${value}`);
  if (!SCHEME_PATTERN.test(value)) return null;

  try {
    const url = new URL(value);
    return ALLOWED_SCHEMES.has(url.protocol.toLowerCase()) ? url.href : null;
  } catch {
    return null;
  }
}

function pushText(tokens: AnnotationTextToken[], value: string): void {
  if (!value) return;

  const last = tokens[tokens.length - 1];
  if (last?.type === 'text') {
    last.value += value;
    return;
  }

  tokens.push({ type: 'text', value });
}

/**
 * Split `text` into plain runs and links. Unparseable or disallowed targets fall
 * back to the literal source text, so nothing the user typed is ever dropped.
 */
export function parseAnnotationText(text: string): AnnotationTextToken[] {
  const tokens: AnnotationTextToken[] = [];
  let lastIndex = 0;

  TOKEN_PATTERN.lastIndex = 0;
  let match = TOKEN_PATTERN.exec(text);

  while (match !== null) {
    const groups = match.groups ?? {};
    const raw = match[0];
    pushText(tokens, text.slice(lastIndex, match.index));

    if (groups.mdLabel !== undefined) {
      const href = toSafeHref(groups.mdHref ?? '');
      if (href) tokens.push({ type: 'link', label: groups.mdLabel, href });
      else pushText(tokens, raw);
    } else {
      const label = trimTrailingPunctuation(raw);
      const href = toSafeHref(label);
      if (href) tokens.push({ type: 'link', label, href });
      else pushText(tokens, label);
      pushText(tokens, raw.slice(label.length));
    }

    lastIndex = match.index + raw.length;
    match = TOKEN_PATTERN.exec(text);
  }

  pushText(tokens, text.slice(lastIndex));
  return tokens;
}
