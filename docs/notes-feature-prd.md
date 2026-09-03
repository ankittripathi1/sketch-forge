# PRD — Page Notes

**Status:** Draft for discussion
**Owner:** Ankit
**Last updated:** 2026-07-18

---

## 1. Summary

Give every canvas page a **written notes surface** that sits alongside the
drawing — a place to write paragraphs *about* the diagram (decisions,
trade-offs, todos, reasoning) in a comfortable reading/writing column. This is
the "note-taking" half of Sketch Forge's promise: *draw the structure, write
the thinking, find both later.*

This is deliberately **not** another canvas text tool. It complements the
canvas; it does not replace it.

---

## 2. Problem & motivation

Sketch Forge is positioned as a "visual-first technical notebook." The canvas
side (shapes, connectors, freehand, images) is mature. The **notes side barely
exists** — you can drop text *blocks* onto the canvas, but there's nowhere to
write flowing prose.

Two things people actually want to do on a page like "plan an HRMS":

1. **Draw the structure** — services, DB tables, request flows. → Canvas (done).
2. **Write about it** — "chose JWT over sessions because…", open questions,
   a todo list. → *Missing today.*

Writing paragraphs as free-floating canvas text is miserable: no reading
column, text zooms with the canvas, and it clutters the diagram. Notes need
their own home.

### The core distinction (design north star)

| | Lives where | Good for |
|---|---|---|
| **Canvas text block** | In canvas space, zooms with the view | Labels that *are* the diagram — "Auth Service", "rate-limited" |
| **Page note** (this feature) | A docked panel, fixed reading column | Text *about* the diagram — paragraphs, decisions, todos |

One rule of thumb: **text that *is* the diagram → canvas block. Text that is
*about* the diagram → notes.**

---

## 3. Goals

- Write and read long-form notes attached to a page, without leaving the canvas.
- Notes persist reliably and reopen exactly as left.
- Notes are eventually **searchable** and feed the "find what I wrote" goal.
- The writing experience feels like a document, not a form field.

## 4. Non-goals (for v1)

- Real-time multi-user collaboration.
- Element-level / region-anchored notes (a **later phase** — see §8).
- A full block-based editor (tables, embeds, databases). Start focused.
- Replacing canvas text blocks.

---

## 5. The editor: one decision to settle first

We debated three options. **Recommendation: Option C.**

- **A — Plain Markdown textarea.** You type `## hello`, it stays literal `##
  hello`. Simple, portable, but ugly — no visual headings. *(This is what the
  MVP had.)*
- **B — Word-style rich text.** Toolbar buttons for heading/bold/list; WYSIWYG.
  Pretty, but slower to write and risks a proprietary storage format.
- **C — Rich text *with* Markdown shortcuts.** ✅ You type `## ` and it
  *instantly becomes* a styled H2. Notion / Obsidian model.

**Why C wins:** it's the best of both and needs **no mode toggle**.
- *Writes* like Markdown (fast, keyboard-driven).
- *Looks* like Word (real headings, lists, checklists).
- *Stores* as Markdown under the hood → portable, greppable, and it feeds the
  roadmap's "export notes as Markdown" + the search index.

We explicitly **reject** shipping A-vs-B as a user-facing plugin/toggle: two
code paths, a split data model, and a choice users shouldn't have to make.

**Implementation note:** C requires a real editor engine — plan on **TipTap**
(ProseMirror) with StarterKit + Markdown input rules, serializing to Markdown.
A plain `<textarea>` cannot do live styling.

### Formatting supported in v1
Headings (H1–H3), bold/italic, bullet & numbered lists, checklists, inline
`code` and fenced code blocks, links, blockquote/callout. All via Markdown
shortcuts *and* a minimal floating toolbar for discoverability.

---

## 6. Layout & UX

### Placement
- A **docked drawer on the right edge**, full height.
- **Resizable** via a drag handle on its inner edge; width **300–640px**.
- **Remembered width** — persisted, so it reopens at the size you left it.
- Toggled from a pen icon in the top bar.

### Hard layout requirements (learned from the MVP — these were bugs)
1. **Nothing gets covered.** When the drawer is open, the right-side floating
   controls (inspector strip, Beautify, zoom) must shift left to stay visible.
   ⚠️ **The bottom tool bar must NOT be clipped by the drawer** — this was
   broken in the prototype and is a blocker.
2. **No harsh focus ring.** The editor is a borderless document surface — no
   boxed input, no accent-colored ring on focus. *(MVP had an ugly red ring.)*
3. **Mutually exclusive with the left Notebooks drawer** — opening one closes
   the other, so they never overlap.
4. Comfortable reading typography (~15px, relaxed line height, generous side
   padding). It should feel like a page, not a chat box.

### Header / chrome
- Title "Notes", a scope label ("This page"), live word count, close button.
- Footer: save status ("Saved") — quiet, not shouty.

### Empty state
A soft prompt: *"Start writing — decisions, trade-offs, todos, why you chose an
approach."*

### Open UX questions
- Should the notes toggle live on the **left** (grouped with view toggles) or
  the **right** (near where the drawer appears)? MVP had it left, which felt
  disconnected.
- Should opening notes **push** the canvas or **overlay** it? (Push avoids
  covering content but reflows the drawing.)

---

## 7. AI: "Improve my notes"

The **Beautify** button becomes the single AI action on the canvas. It should
be able to:
- Rearrange/clean up the **diagram** layout (exists today).
- **Improve the notes** — tighten wording, structure with headings, turn a
  brain-dump into clean notes.

Behavior:
- No API key set → **toast**: "No Gemini API key set — add one in Settings to
  use AI." *(No redirect — already shipped.)*
- Errors → toast, never a browser `alert()`. *(Already shipped.)*

*Note: the notes-rewrite call is a new capability that depends on the real
editor + data model below; sequence it after those.*

---

## 8. Data model & persistence

### v1
- Add an optional **`note: string`** (Markdown) field to the page schema
  (`CreatePageSchema` / `UpdatePageSchema` in `@repo/schema`).
- Save the note through the existing **autosave** path (`useCanvasSync`),
  alongside `title` and `elements`.
- **Migration:** the MVP stored notes in `localStorage`
  (`sketch-forge:notes:<pageId>`). On first load with the real backend, migrate
  any local note into the page record, then clear the local key.

### Later — element-level (contextual) notes
Add an optional `note` to `SketchElement`. The panel becomes **selection-aware**:
- Nothing selected → the page note.
- A shape selected → that shape's note, with a chip linking back to it.

This is the "anchored notes" idea — powerful, but plumbing selection state up to
the page is non-trivial. **Defer to a later phase.**

---

## 9. Search integration

Notes only pay off if they're findable. Extend `extractSearchableText` (today
it only indexes `tool === "text"` elements) to also index:
- the page `note`,
- (later) each element `note`.

Then a search for "JWT" surfaces the page *and* can deep-link to the note /
element it came from.

---

## 10. Phased rollout

- **Phase 1 — Editor + storage.** TipTap rich-text-with-Markdown editor, page
  `note` in schema, autosave wiring, correct right-drawer layout (all §6 hard
  requirements). Ships the core value.
- **Phase 2 — Search.** Index note text; deep-link from results.
- **Phase 3 — AI improve notes.** Beautify rewrites/structures the note.
- **Phase 4 — Element-level contextual notes.** Selection-aware panel + anchors.

---

## 11. Success criteria

- A user can open a page, write structured notes, close and reopen — content
  and drawer width intact.
- Nothing on the canvas chrome is ever obscured by the drawer (esp. the bottom
  tool bar).
- Notes typed here appear in search results.
- The writing surface reads as a document, not a form.

---

## 12. Open questions (for discussion)

1. Editor engine — TipTap vs Lexical? (Leaning TipTap for Markdown ergonomics.)
2. Toggle placement — left vs right?
3. Push vs overlay for the drawer?
4. Do we want a distraction-free "notes only" full-width mode?
5. How much AI — just cleanup, or also generate notes *from* the diagram?
