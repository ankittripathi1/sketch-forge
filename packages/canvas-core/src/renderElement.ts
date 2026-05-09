import rough from "roughjs";
import { DrawingElement } from "./types";

export function drawElement(
  rc: ReturnType<typeof rough.canvas>,
  el: DrawingElement,
) {
  if (el.tool === "rectangle") {
    rc.rectangle(el.x1, el.y1, el.x2 - el.x1, el.y2 - el.y1);
  } else if (el.tool === "ellipse") {
    rc.ellipse(
      (el.x1 + el.x2) / 2,
      (el.y1 + el.y2) / 2,
      Math.abs(el.x2 - el.x1),
      Math.abs(el.y2 - el.y1),
    );
  } else if (el.tool === "line") {
    rc.line(el.x1, el.y1, el.x2, el.y2);
  } else if (el.tool === "freehand" && el.points && el.points.length > 1) {
    const path = el.points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
      .join(" ");
    rc.path(path);
  }
}
