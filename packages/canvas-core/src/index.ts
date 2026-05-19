// Types
export type {
  Tool,
  FillStyle,
  Point,
  SketchElement,
  TextAlign,
  TextVerticalAlign,
  ArrowBinding,
  AnchorSide,
} from "./types.js";

// Rendering
export {
  drawElement,
  drawSelectionBox,
  resolveArrowEndpoints,
} from "./renderElement.js";
export { renderCanvasToBlob } from "./renderToImage.js";
export type { RenderOptions } from "./renderToImage.js";

// Hit detection
export {
  getBoundingBox,
  hitTestElement,
  hitTestHandle,
  isElementInsideRect,
} from "./hitDetection.js";

// History
export { createHistory } from "./history.js";
export type { HistoryState } from "./history.js";

// Color utilities
export {
  isColorDark,
  DEFAULT_LIGHT_STROKE,
  DEFAULT_DARK_STROKE,
} from "./colorUtils.js";

// Text editing
export { openTextEditor } from "./textEditor.js";
export type { TextEditorResult } from "./textEditor.js";
