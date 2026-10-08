// Tiny external store to carry "edit this measurement" intent across tabs,
// independent of navigation/URL params (which don't reliably change when
// navigating to an already-mounted tab).
//
// We expose a stable snapshot object { id, token }. `token` increments on every
// requestEdit() call so even re-requesting the SAME id is an observable
// transition. Consumers gate on `token` with a ref (one-shot) instead of
// mutating the store from inside an effect (which drops transitions on web).

import { useSyncExternalStore } from "react";

export interface EditRequest {
  id: string | null;
  token: number;
}

let state: EditRequest = { id: null, token: 0 };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function requestEdit(id: string) {
  state = { id, token: state.token + 1 };
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useEditRequest(): EditRequest {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
