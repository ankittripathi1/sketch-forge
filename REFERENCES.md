# Product Reference

Useful products, tools, and UI ideas to study for Sketch Forge.

## Strategic recommendation

Do not rebuild Sketch Forge from the ground up as a general notes app. Craft,
Evernote, Notesnook, and Capacities are already strong in broad note-taking.
Sketch Forge has a better chance if it owns a narrower, more memorable wedge:

**a visual thinking notebook for technical learners, engineers, and builders.**

That can still become a large-audience product, but the entry point should be
specific: people who need to understand, explain, remember, and share complex
ideas with diagrams, handwriting, code snippets, screenshots, and review loops.

## What to include

### 1. Daily capture, but visual-first

Borrow the daily-note habit from Craft and Capacities, but make it canvas-native:

- "Today" opens a blank visual inbox.
- Users can drop sketches, screenshots, snippets, links, and rough notes quickly.
- Later, they can promote any item into a page, folder, concept, or study review.

This is much more aligned with Sketch Forge than a plain rich-text daily journal.

### 2. Objects and backlinks for technical ideas

Capacities' best strategic idea is "objects, not folders." For Sketch Forge,
objects should not be generic "person/book/project" records first. Better object
types would be:

- Concept
- System
- API
- Algorithm
- Bug
- Decision
- Lecture
- Interview problem
- Project

Canvas arrows and text links could become actual relationships. Example:
drawing an arrow from "cache invalidation" to "stale reads" creates a link in
the knowledge graph.

### 3. Search that understands drawings

Evernote's durable value is capture plus retrieval. Sketch Forge already stores
`searchableText`, thumbnails, and page metadata, so the next marketable leap is:

- OCR text from handwriting
- text extracted from shapes and code blocks
- search by tag, folder, status, review state, and visual page title
- "show me the diagram where I explained OAuth refresh tokens"

Search and recall are more valuable than adding more drawing tools.

### 4. Privacy as a trust layer, not the headline

Notesnook makes privacy central with end-to-end encryption, open source, app
lock, encrypted sync, and password-protected sharing. For Sketch Forge, privacy
matters because users may sketch private systems, architecture, notes, and
interview prep.

Recommended path:

- short term: local-first/offline-first, clear export, no surprise AI processing
- medium term: encrypted local storage and app lock
- later: optional end-to-end encrypted sync

Do not lead with encryption until the implementation is real and auditable.

### 5. Shareable outputs

Craft's publishing and Miro/FigJam's collaborative sharing point to a clear need:
people do not just capture ideas, they need to send them somewhere.

Prioritize:

- polished PNG/SVG/PDF export
- public read-only canvas links
- embeddable diagram links for READMEs and docs
- "explain this canvas" AI summary for sharing

### 6. Templates for real use cases

Miro's huge template library is a major market lesson. Sketch Forge should not
start with 6,000 templates, but it should ship with opinionated packs:

- System design interview
- Architecture decision record
- API flow
- Database schema
- Debugging trace
- Lecture notes
- Spaced repetition board
- Product idea map

Templates should create useful canvases, not decorative example files.

## What to avoid

- Do not compete head-on with Evernote as "notes, tasks, calendar, web clipper,
  documents, collaboration, AI, everything."
- Do not copy Capacities' full object model before Sketch Forge has a great
  visual capture loop.
- Do not make privacy claims stronger than the actual architecture supports.
- Do not turn the canvas into a dense enterprise whiteboard too early. Miro and
  FigJam are mature team products; Sketch Forge should first win individual
  clarity and learning.
- Do not make AI ambient or intrusive. The current "AI only when invited"
  positioning is good.

## Product direction

### Current wedge

Visual notebook for technical thinking.

### Stronger wedge

**The canvas notebook that turns rough technical thinking into searchable,
reviewable, shareable knowledge.**

### Likely audience sequence

1. Students learning technical subjects
2. Software engineers preparing for interviews or designing systems
3. Indie builders and technical creators explaining ideas
4. Small engineering/product teams sharing diagrams and decisions

### Roadmap bets

1. Make capture effortless: quick capture, daily canvas inbox, paste anything.
2. Make retrieval excellent: OCR, canvas-aware search, tags, backlinks.
3. Make learning sticky: review queue, status, spaced repetition, concept pages.
4. Make sharing polished: exports, public links, README/docs embedding.
5. Make organization more human: object types and graph only after the above is
   useful.

## Reviewed

- [x] Craft - https://www.craft.do/
  - Good ideas:
    - Beautiful product storytelling around notes, tasks, calendar, whiteboards,
      daily notes, publishing, and AI.
    - Flexible organization with spaces, folders, tags, and collections.
    - Strong ecosystem angle with MCP connections, API integrations, and
      community templates.
  - What we should avoid:
    - Becoming a broad "everything workspace" before the core canvas loop is
      excellent.
    - Copying calendar/tasks as generic productivity features.
  - Possible roadmap items:
    - Daily canvas inbox.
    - Templates for technical workflows.
    - Publish/share flow for clean read-only pages.
    - Later: an API/MCP layer for creating or searching canvases.

- [x] Evernote - https://evernote.com/
  - Good ideas:
    - Clear broad promise: notes, tasks, schedule, search, web clipper,
      document scanning, collaboration, and AI in one place.
    - Search/retrieval is central to the value proposition.
    - Templates and web capture lower friction for mainstream users.
  - What we should avoid:
    - General note-taking parity race.
    - Adding unrelated productivity features before Sketch Forge owns a unique
      visual workflow.
  - Possible roadmap items:
    - Better search over canvas text, handwriting, tags, and page metadata.
    - Web/screenshot capture into canvas.
    - Template gallery for common technical pages.

- [x] Notesnook - https://notesnook.com/
  - Good ideas:
    - Strong privacy promise: data encrypted before leaving the device, encrypted
      storage, app lock, open source, self-hostable sync server, and
      password-protected sharing.
    - Web clipper and bidirectional linking support serious note workflows.
  - What we should avoid:
    - Marketing encryption before implementing it correctly.
    - Building a generic markdown notes editor as the primary experience.
  - Possible roadmap items:
    - Privacy page explaining local-first behavior and AI boundaries.
    - App lock for private notebooks.
    - Password-protected public share links.
    - Longer term: optional end-to-end encrypted sync.

- [x] Capacities - https://capacities.io/
  - Good ideas:
    - Strong critique of folders as the default mental model.
    - Object-based knowledge model with backlinks and related content.
    - Daily note as low-friction inbox.
    - Clear promise around connected thinking rather than file management.
  - What we should avoid:
    - Building a complex object database before the canvas has enough real usage.
    - Replacing folders entirely too early; folders are already implemented and
      useful.
  - Possible roadmap items:
    - Typed canvas pages: concept, system, bug, project, lecture, algorithm.
    - Backlinks between canvases/pages.
    - Related-content suggestions from searchable text and arrows.
    - Graph view only after links have real meaning.

## Useful adjacent products to keep watching

- Miro - https://miro.com/
  - Watch for: AI workflows, intelligent canvas, docs/tables/slides/diagrams,
    templates, integrations, and enterprise trust.
  - Lesson: the large market is not "drawing"; it is moving from messy ideas to
    decisions, plans, and shared outcomes.

- FigJam - https://www.figma.com/figjam/
  - Watch for: real-time collaboration, brainstorming, diagramming, meetings,
    agile workflows, strategy/planning, and integrations.
  - Lesson: teams need facilitation primitives, but Sketch Forge can delay this
    until the individual product is lovable.

- Excalidraw - https://excalidraw.com/
  - Watch for: fast hand-drawn diagrams and low-friction sharing.
  - Lesson: a delightful drawing feel can carry a product surprisingly far.

- tldraw - https://www.tldraw.com/
  - Watch for: instant collaborative whiteboarding and developer platform.
  - Lesson: extensibility matters if Sketch Forge later wants plugins or custom
    technical objects.
