import { create } from "zustand";
import type { EditorLocation } from "../components/editor/editorNavigation";

export interface EditorNavigationRequest extends EditorLocation {
  readonly requestId: number;
}

interface EditorNavigationState {
  readonly request: EditorNavigationRequest | null;
  requestNavigation(location: EditorLocation): void;
}

export const useEditorNavigationStore = create<EditorNavigationState>((set, get) => ({
  request: null,

  requestNavigation: (location) =>
    set({
      request: {
        ...location,
        requestId: (get().request?.requestId ?? 0) + 1
      }
    })
}));
