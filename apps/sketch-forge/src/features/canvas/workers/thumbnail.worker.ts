import { renderCanvasToBlob } from "@repo/canvas-core/renderToImage";

self.onmessage = async (e: MessageEvent) => {
  const { elements, options } = e.data;
  try {
    const blob = await renderCanvasToBlob(elements, options);

    // Convert Blob to data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      self.postMessage({ thumbnail: reader.result });
    };
    reader.onerror = () => {
      self.postMessage({ error: "FileReader failed" });
    };
    reader.readAsDataURL(blob);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
