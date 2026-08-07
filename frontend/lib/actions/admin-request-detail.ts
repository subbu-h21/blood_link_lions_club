"use server";

import { getActingAdmin } from "@/lib/db/admin-portal";
import {
  getAdminRequestDetail,
  takeOwnership,
  assignProspectToBank,
  unassignProspectFromBank,
  standDownProspectByAdmin,
  transferRequestToRegion,
  closeRequestByAdmin,
  listTransferableRegions,
  fileReportOnRequester,
  fileReportOnProspectDonor,
  type AdminRequestDetailView,
  type AdminActionResult,
  type AdminCloseResult,
  type TransferResult,
  type RegionOption,
  type FileReportResult,
} from "@/lib/db/admin-requests";
import type { CloseReason } from "@/lib/serialise/close-reason";
import type { ReportReason } from "@/lib/serialise/report-reason";

export async function loadAdminRequestDetail(requestId: string): Promise<AdminRequestDetailView | null> {
  const caller = await getActingAdmin();
  return getAdminRequestDetail(caller, requestId);
}

export async function takeOwnershipAction(requestId: string): Promise<AdminActionResult> {
  const caller = await getActingAdmin();
  return takeOwnership(caller, requestId);
}

export async function assignProspectToBankAction(requestId: string, prospectId: string): Promise<AdminActionResult> {
  const caller = await getActingAdmin();
  return assignProspectToBank(caller, requestId, prospectId);
}

export async function unassignProspectFromBankAction(
  requestId: string,
  prospectId: string,
): Promise<AdminActionResult> {
  const caller = await getActingAdmin();
  return unassignProspectFromBank(caller, requestId, prospectId);
}

export async function standDownProspectAction(requestId: string, prospectId: string): Promise<AdminActionResult> {
  const caller = await getActingAdmin();
  return standDownProspectByAdmin(caller, requestId, prospectId);
}

export async function loadTransferableRegionsAction(requestId: string): Promise<RegionOption[] | null> {
  const caller = await getActingAdmin();
  return listTransferableRegions(caller, requestId);
}

export async function transferRequestAction(requestId: string, targetRegionId: string): Promise<TransferResult> {
  const caller = await getActingAdmin();
  return transferRequestToRegion(caller, requestId, targetRegionId);
}

export async function closeRequestAction(
  requestId: string,
  closeReason: CloseReason,
): Promise<AdminCloseResult> {
  const caller = await getActingAdmin();
  return closeRequestByAdmin(caller, requestId, closeReason);
}

export async function fileReportOnRequesterAction(
  requestId: string,
  reason: ReportReason,
  details: string | null,
): Promise<FileReportResult> {
  const caller = await getActingAdmin();
  return fileReportOnRequester(caller, requestId, reason, details);
}

export async function fileReportOnProspectDonorAction(
  requestId: string,
  prospectId: string,
  reason: ReportReason,
  details: string | null,
): Promise<FileReportResult> {
  const caller = await getActingAdmin();
  return fileReportOnProspectDonor(caller, requestId, prospectId, reason, details);
}
