import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/react";

/**
 * Callout / admonition block for the notes editor.
 *
 * Serializes to a Docusaurus-style `:::variant … :::` fenced container so the
 * note round-trips cleanly through the Markdown that `useCanvasSync` persists.
 * A Markdown shortcut (`:::tip␣` at the start of a line) wraps the current
 * block, matching the other shortcuts StarterKit provides.
 */

export const CALLOUT_VARIANTS = ["note", "tip", "info", "warning", "danger"] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

function normalizeVariant(value?: string | null): CalloutVariant {
  const v = (value || "").toLowerCase();
  return (CALLOUT_VARIANTS as readonly string[]).includes(v)
    ? (v as CalloutVariant)
    : "note";
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      variant: {
        default: "note" as CalloutVariant,
        parseHTML: (element) => normalizeVariant(element.getAttribute("data-variant")),
        renderHTML: (attributes) => ({ "data-variant": attributes.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-callout": "",
      }),
      0,
    ];
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^:::(note|tip|info|warning|danger)?[ \t]$/,
        type: this.type,
        getAttributes: (match) => ({ variant: normalizeVariant(match[1]) }),
      }),
    ];
  },

  // ─── Markdown round-trip (via @tiptap/markdown) ──────────────────────────
  markdownTokenizer: {
    name: "callout",
    level: "block",
    start(src: string) {
      const index = src.indexOf(":::");
      return index < 0 ? src.length : index;
    },
    tokenize(src, _tokens, lexer) {
      const match =
        /^:::[ \t]*([A-Za-z]+)?[ \t]*\r?\n([\s\S]*?)\r?\n:::[ \t]*(?:\r?\n|$)/.exec(
          src,
        );
      if (!match) return;
      return {
        type: "callout",
        raw: match[0],
        variant: normalizeVariant(match[1]),
        tokens: lexer.blockTokens(`${match[2]}\n`),
      };
    },
  },

  parseMarkdown: (token, helpers) => {
    const parseChildren = helpers.parseBlockChildren ?? helpers.parseChildren;
    const children = parseChildren(token.tokens || []);
    return helpers.createNode(
      "callout",
      { variant: normalizeVariant(token.variant) },
      children.length ? children : [helpers.createNode("paragraph")],
    );
  },

  renderMarkdown: (node, helpers) => {
    const variant = normalizeVariant(node.attrs?.variant);
    const inner = node.content ? helpers.renderChildren(node.content) : "";
    return `:::${variant}\n${inner.replace(/\n+$/, "")}\n:::\n`;
  },
});
