"use server";

import {
  getRequestStatus,
  cancelRequest,
  confirmStillNeeded,
  type RequestStatusView,
  type CancelRequestResult,
  type ConfirmStillNeededResult,
} from "@/lib/db/requests";
import type { CloseReason } from "@/lib/serialise/close-reason";

// requestId is a client-supplied value in both actions below, not resolved
// from a session - deliberate (see lib/db/requests.ts's getRequestStatus
// doc comment and prompts/README.md's Unit 30 entry): there is no
// requester session anywhere in this codebase, and the unguessable UUID
// itself is the access model, confirmed with the project owner rather
// than assumed.
export async function loadRequestStatus(requestId: string): Promise<RequestStatusView> {
  return getRequestStatus(requestId);
}

export async function cancelRequestAction(requestId: string, closeReason: CloseReason): Promise<CancelRequestResult> {
  return cancelRequest(requestId, closeReason);
}

export async function confirmStillNeededAction(requestId: string): Promise<ConfirmStillNeededResult> {
  return confirmStillNeeded(requestId);
}
