type SearchSnippetSegment = {
  text: string;
  highlighted: boolean;
};

const OPEN_MARK = "<mark>";
const CLOSE_MARK = "</mark>";

/**
 * Parses only the highlight markers produced by PostgreSQL's `ts_headline`.
 * Every other tag-like value remains text and is escaped by React at render time.
 */
export function parseSearchSnippet(snippet: string): SearchSnippetSegment[] {
  const parts = snippet.split(/(<mark>|<\/mark>)/gi);
  const segments: SearchSnippetSegment[] = [];
  let highlighted = false;

  for (const part of parts) {
    const normalized = part.toLowerCase();
    if (normalized === OPEN_MARK) {
      highlighted = true;
      continue;
    }
    if (normalized === CLOSE_MARK) {
      highlighted = false;
      continue;
    }
    if (!part) continue;

    const previous = segments.at(-1);
    if (previous?.highlighted === highlighted) {
      previous.text += part;
    } else {
      segments.push({ text: part, highlighted });
    }
  }

  return segments;
}

export function SearchSnippet({ snippet }: { snippet: string }) {
  return (
    <p className="mt-0.5 truncate text-[10px] text-text-muted">
      {parseSearchSnippet(snippet).map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={`${index}:${segment.text}`}
            className="bg-accent-subtle text-text-primary"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={`${index}:${segment.text}`}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
