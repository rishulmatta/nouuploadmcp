/// <reference types="vite/client" />

declare global {
  interface Window {
    modelContext?: {
      registerTool: (spec: unknown) => void;
      tools?: Record<string, unknown>;
    };
  }
}

export {}
