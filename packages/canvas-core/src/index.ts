// Element domain types — re-exported from @repo/element for back-compat.
// Prefer importing directly from "@repo/element/types".
export type {
  Tool,
  ActiveTool,
  FillStyle,
  Point,
  SketchElement,
  TextAlign,
  TextVerticalAlign,
  ArrowBinding,
  AnchorSide,
} from "@repo/element/types";

// Rendering
export {
  drawElement,
  drawGroupSelectionBox,
  drawSelectionBox,
  resolveArrowEndpoints,
} from "./renderElement";
export { renderCanvasToBlob } from "./renderToImage";
export type { RenderOptions } from "./renderToImage";

// Hit detection / bounds — re-exported from @repo/element for back-compat.
export {
  getElementsBoundingBox,
  getBoundingBox,
  hitTestElement,
  hitTestHandle,
  isElementInsideRect,
} from "@repo/element/bounds";

// History — re-exported from @repo/element for back-compat.
export { createHistory } from "@repo/element/history";
export type { HistoryState } from "@repo/element/history";

// Text editing
export { openTextEditor } from "./textEditor";
export type { TextEditorResult } from "./textEditor";
