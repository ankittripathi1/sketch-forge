"use client";

import { create } from "zustand";
import type { FillStyle } from "@repo/element/types";

type FontWeight = "normal" | "bold";
type TextAlign = "left" | "center" | "right";
type TextVerticalAlign = "top" | "middle" | "bottom";
type RecognitionBackend = "tesseract" | "gemini";

export type CanvasUIState = {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: FontWeight;
  textAlign: TextAlign;
  textVerticalAlign: TextVerticalAlign;
  scribbleEnabled: boolean;
  recognitionBackend: RecognitionBackend;
  recognitionApiKey: string;

  setStrokeColor: (c: string) => void;
  setFillColor: (c: string) => void;
  setFillStyle: (s: FillStyle) => void;
  setStrokeWidth: (w: number) => void;
  setFontFamily: (f: string) => void;
  setFontSize: (n: number) => void;
  setFontWeight: (w: FontWeight) => void;
  setTextAlign: (a: TextAlign) => void;
  setTextVerticalAlign: (v: TextVerticalAlign) => void;
  setScribbleEnabled: (b: boolean) => void;
  setRecognitionBackend: (b: RecognitionBackend) => void;
  setRecognitionApiKey: (k: string) => void;
};

export const useCanvasUI = create<CanvasUIState>((set) => ({
  strokeColor: "#1a1a2e",
  fillColor: "none",
  fillStyle: "none",
  strokeWidth: 1.5,
  fontFamily: "Kalam, cursive",
  fontSize: 16,
  fontWeight: "normal",
  textAlign: "center",
  textVerticalAlign: "middle",
  scribbleEnabled: false,
  recognitionBackend: "tesseract",
  recognitionApiKey: "",

  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setFillStyle: (fillStyle) => set({ fillStyle }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontWeight: (fontWeight) => set({ fontWeight }),
  setTextAlign: (textAlign) => set({ textAlign }),
  setTextVerticalAlign: (textVerticalAlign) => set({ textVerticalAlign }),
  setScribbleEnabled: (scribbleEnabled) => set({ scribbleEnabled }),
  setRecognitionBackend: (recognitionBackend) => set({ recognitionBackend }),
  setRecognitionApiKey: (recognitionApiKey) => set({ recognitionApiKey }),
}));
