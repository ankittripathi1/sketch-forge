import { Point } from "@repo/canvas-core/types";

interface TextEditorOptions {
  /** Top-left corner in screen (viewport) pixels */
  screenPos: Point;
  /** Corresponding canvas-space position (for onCommit callback) */
  canvasPos: Point;
  /** Font size in canvas units (will be scaled by zoom for display) */
  fontSize: number;
  color: string;
  zoom: number;
  initialText?: string;
  /** For shape labels: canvas-unit dimensions of the container */
  containerSize?: { w: number; h: number };
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  onCommit: (text: string, canvasPos: Point) => void;
}

export function openTextEditor(opts: TextEditorOptions): void {
  const { zoom, containerSize } = opts;
  const isLabel = !!containerSize;
  const fontSize = opts.fontSize;

  const textarea = document.createElement("textarea");
  textarea.dir = "auto";
  textarea.dataset.type = "wysiwyg";
  textarea.wrap = "off";

  // Use a slightly larger line height for better readability, 
  // but we'll account for it during commit/render.
  const LINE_HEIGHT = 1.2;

  const width = isLabel ? containerSize!.w : 20; 
  const height = isLabel ? containerSize!.h : fontSize * LINE_HEIGHT;

  const paddingTopBottom = isLabel
    ? Math.max(0, (containerSize!.h - fontSize * LINE_HEIGHT) / 2)
    : 0;

  Object.assign(textarea.style, {
    position: "fixed",
    left: `${opts.screenPos.x}px`,
    top: `${opts.screenPos.y}px`,
    width: isLabel ? `${width}px` : "20px",
    height: isLabel ? `${height}px` : `${fontSize * LINE_HEIGHT}px`,
    minHeight: `${fontSize * LINE_HEIGHT}px`,
    minWidth: isLabel ? `${width}px` : "20px",

    transformOrigin: "0 0",
    transform: `scale(${zoom})`,

    font: `${opts.fontWeight ?? "normal"} ${fontSize}px ${opts.fontFamily ?? '"Caveat", cursive'}`,
    lineHeight: `${LINE_HEIGHT}`, 
    color: opts.color,
    background: "transparent",
    border: "none",
    outline: "none",
    padding: isLabel ? `${paddingTopBottom}px 4px` : "0",
    margin: "0",
    resize: "none",
    overflow: "hidden",
    boxSizing: "border-box",
    zIndex: "9999",
    textAlign: isLabel ? "center" : "left",
    whiteSpace: isLabel ? "pre-wrap" : "pre",
    wordBreak: isLabel ? "break-word" : "normal",
    caretColor: opts.color,
  });

  if (opts.initialText) {
    textarea.value = opts.initialText;
  }

  function autoExpand() {
    if (isLabel) return;
    // Reset to small size to calculate scrollWidth/Height correctly
    textarea.style.width = "20px";
    textarea.style.height = "auto";
    const newWidth = Math.max(20, textarea.scrollWidth + 10); 
    const newHeight = Math.max(fontSize * LINE_HEIGHT, textarea.scrollHeight);
    textarea.style.width = `${newWidth}px`;
    textarea.style.height = `${newHeight}px`;
  }

  textarea.addEventListener("input", autoExpand);

  let submitted = false;
  function submit() {
    if (submitted) return;
    submitted = true;
    const text = textarea.value;
    if (textarea.parentNode) {
      document.body.removeChild(textarea);
    }
    opts.onCommit(text, opts.canvasPos);
  }

  textarea.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      submit();
    }
    if (e.key === "Enter" && !e.shiftKey && !isLabel) {
      e.preventDefault();
      submit();
    }
  });

  textarea.addEventListener("blur", submit);

  document.body.appendChild(textarea);
  
  // Trigger initial expand
  autoExpand();

  requestAnimationFrame(() => {
    textarea.focus();
    if (opts.initialText) {
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
    }
  });
}
