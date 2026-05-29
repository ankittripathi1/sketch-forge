import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";

export type CodeToken = { text: string; color: string };

const LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  html: "markup",
  xml: "markup",
  "c++": "cpp",
  cs: "csharp",
};

function resolveLanguage(raw: string): Prism.Grammar | null {
  if (!raw) return null;
  const key = LANG_ALIASES[raw.toLowerCase()] ?? raw.toLowerCase();
  return Prism.languages[key] ?? null;
}

// Theme tuned for the canvas code-block background (light text on tinted dark
// surface, with a contrasting set for light backgrounds). The renderer picks
// the variant based on isColorDark of the text color.
type Theme = Record<string, string> & { default: string };

const DARK_THEME: Theme = {
  default: "#e6edf3",
  keyword: "#ff7b72",
  "class-name": "#f0883e",
  function: "#d2a8ff",
  string: "#a5d6ff",
  "template-string": "#a5d6ff",
  char: "#a5d6ff",
  comment: "#8b949e",
  number: "#79c0ff",
  boolean: "#79c0ff",
  null: "#79c0ff",
  operator: "#ff7b72",
  punctuation: "#c9d1d9",
  property: "#79c0ff",
  tag: "#7ee787",
  "attr-name": "#7ee787",
  "attr-value": "#a5d6ff",
  builtin: "#ffa657",
  regex: "#7ee787",
  variable: "#ffa657",
  parameter: "#e6edf3",
  selector: "#7ee787",
};

const LIGHT_THEME: Theme = {
  default: "#1f2328",
  keyword: "#cf222e",
  "class-name": "#953800",
  function: "#8250df",
  string: "#0a3069",
  "template-string": "#0a3069",
  char: "#0a3069",
  comment: "#6e7781",
  number: "#0550ae",
  boolean: "#0550ae",
  null: "#0550ae",
  operator: "#cf222e",
  punctuation: "#1f2328",
  property: "#0550ae",
  tag: "#116329",
  "attr-name": "#116329",
  "attr-value": "#0a3069",
  builtin: "#953800",
  regex: "#116329",
  variable: "#953800",
  parameter: "#1f2328",
  selector: "#116329",
};

function colorFor(types: string[], theme: Theme): string {
  for (const t of types) {
    if (theme[t]) return theme[t]!;
  }
  return theme.default;
}

function walk(
  tokens: (string | Prism.Token)[],
  inherited: string[],
  theme: Theme,
  out: CodeToken[],
) {
  for (const tok of tokens) {
    if (typeof tok === "string") {
      out.push({ text: tok, color: colorFor(inherited, theme) });
      continue;
    }
    const types = [tok.type, ...(tok.alias ? ([] as string[]).concat(tok.alias) : []), ...inherited];
    if (typeof tok.content === "string") {
      out.push({ text: tok.content, color: colorFor(types, theme) });
    } else if (Array.isArray(tok.content)) {
      walk(tok.content, types, theme, out);
    } else {
      walk([tok.content], types, theme, out);
    }
  }
}

/**
 * Tokenize a single line of source code for canvas rendering. Returns a flat
 * list of {text, color} chunks the renderer can paint with fillText. If the
 * language is unknown (or empty) returns a single uncolored token so callers
 * always get something to draw.
 */
export function highlightCodeLine(
  line: string,
  language: string,
  darkText: boolean,
): CodeToken[] {
  const theme = darkText ? LIGHT_THEME : DARK_THEME;
  const grammar = resolveLanguage(language);
  if (!grammar) return [{ text: line, color: theme.default }];
  const tokens = Prism.tokenize(line, grammar);
  const out: CodeToken[] = [];
  walk(tokens, [], theme, out);
  return out;
}
