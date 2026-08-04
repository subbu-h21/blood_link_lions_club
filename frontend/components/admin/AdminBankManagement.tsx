"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { AdminBankRow } from "@/lib/db/admin-banks";
import {
  setBankVerifiedAction,
  setBankActiveAction,
  saveBankPolicyNotesAction,
  createBankAction,
  updateBankDetailsAction,
} from "@/lib/actions/admin-banks";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BankDetailsDraft = { name: string; address: string; phone: string; licenceNo: string; pincode: string };

const EMPTY_DETAILS: BankDetailsDraft = { name: "", address: "", phone: "", licenceNo: "", pincode: "" };

// A4 · Bank management (PRD.md §9.1), real data (Unit 43), extended
// 2026-08-04 to add "create a bank" (with its staff login, bundled
// per the user's own explicit decision - a bank with no login can never
// post stock or use B1-B5) and "edit bank details" (name/address/phone/
// licence/PIN - region stays fixed after creation, a separate decision).
// `initialBanks` comes from a server-side read (app/admin/(portal)/
// banks/page.tsx calling loadAdminBanks), already scoped to the acting
// admin's own region. Verify/suspend both call through to real writes on
// `blood_banks` - suspend in particular is the one flag that also gates
// the bank's own portal access (lib/db/bank-portal.ts's
// getActingBankStaff, this same unit) - confirmed as a real, separate
// code path, not assumed to follow automatically from this screen's own
// write succeeding.
export function AdminBankManagement({ initialBanks }: { initialBanks: AdminBankRow[] }) {
  const { t } = useTranslation();
  const [banks, setBanks] = useState<AdminBankRow[]>(initialBanks);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(initialBanks.map((b) => [b.id, b.policyNotes])),
  );
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bank-details edit mode - a second, independent per-bank-id state set
  // from the policy-notes one above (detailsSaved is deliberately its own
  // map, not reusing `saved`, so the two "Saved." messages never get
  // confused with each other).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, BankDetailsDraft>>({});
  const [detailsSaved, setDetailsSaved] = useState<Record<string, boolean>>({});

  // Add-bank form.
  const [addDraft, setAddDraft] = useState<BankDetailsDraft>(EMPTY_DETAILS);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffFullName, setStaffFullName] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // The three server-side validation messages a crafted/direct call could
  // still hit even after this component's own client-side checks below -
  // mapped to real translated strings rather than shown as raw English,
  // since (unlike the /ops-control portal) this screen is not exempt from
  // CLAUDE.md rule 8. The rarer server-only messages (already-registered
  // staff email, no home region) fall back to the existing generic
  // actionError string - not worth two more dedicated keys for edge cases
  // this component's own pre-submit checks already prevent in normal use.
  function translateBankError(message: string): string {
    if (message.includes("Name, address, and phone") || message.includes("Staff full name")) {
      return t("adminPortal.bankManagement.requiredFieldError");
    }
    if (message.includes("valid staff email")) {
      return t("adminPortal.bankManagement.invalidEmailError");
    }
    if (message === "PIN code does not exist.") {
      return t("adminPortal.bankManagement.pincodeNotFoundError");
    }
    return t("adminPortal.bankManagement.actionError");
  }

  async function toggleVerified(bank: AdminBankRow) {
    setPending((p) => ({ ...p, [bank.id]: true }));
    setErrors((e) => ({ ...e, [bank.id]: "" }));
    const result = await setBankVerifiedAction(bank.id, !bank.isVerified);
    setPending((p) => ({ ...p, [bank.id]: false }));
    if (!result.ok) {
      setErrors((e) => ({ ...e, [bank.id]: t("adminPortal.bankManagement.actionError") }));
      return;
    }
    setBanks((prev) => prev.map((b) => (b.id === bank.id ? { ...b, isVerified: !b.isVerified } : b)));
  }

  async function toggleActive(bank: AdminBankRow) {
    setPending((p) => ({ ...p, [bank.id]: true }));
    setErrors((e) => ({ ...e, [bank.id]: "" }));
    const result = await setBankActiveAction(bank.id, !bank.isActive);
    setPending((p) => ({ ...p, [bank.id]: false }));
    if (!result.ok) {
      setErrors((e) => ({ ...e, [bank.id]: t("adminPortal.bankManagement.actionError") }));
      return;
    }
    setBanks((prev) => prev.map((b) => (b.id === bank.id ? { ...b, isActive: !b.isActive } : b)));
  }

  function updateDraft(bankId: string, value: string) {
    setDrafts((prev) => ({ ...prev, [bankId]: value }));
    setSaved((prev) => ({ ...prev, [bankId]: false }));
  }

  async function savePolicyNotes(bankId: string) {
    setPending((p) => ({ ...p, [bankId]: true }));
    setErrors((e) => ({ ...e, [bankId]: "" }));
    const result = await saveBankPolicyNotesAction(bankId, drafts[bankId]);
    setPending((p) => ({ ...p, [bankId]: false }));
    if (!result.ok) {
      setErrors((e) => ({ ...e, [bankId]: t("adminPortal.bankManagement.actionError") }));
      return;
    }
    setBanks((prev) => prev.map((b) => (b.id === bankId ? { ...b, policyNotes: drafts[bankId] } : b)));
    setSaved((prev) => ({ ...prev, [bankId]: true }));
  }

  function startEdit(bank: AdminBankRow) {
    setEditingId(bank.id);
    setEditDrafts((prev) => ({
      ...prev,
      [bank.id]: {
        name: bank.name,
        address: bank.address,
        phone: bank.phone,
        licenceNo: bank.licenceNo ?? "",
        pincode: bank.pincode ?? "",
      },
    }));
    setDetailsSaved((prev) => ({ ...prev, [bank.id]: false }));
    setErrors((e) => ({ ...e, [bank.id]: "" }));
  }

  function updateEditDraft(bankId: string, field: keyof BankDetailsDraft, value: string) {
    setEditDrafts((prev) => ({ ...prev, [bankId]: { ...prev[bankId], [field]: value } }));
  }

  async function saveDetails(bankId: string) {
    const draft = editDrafts[bankId];
    if (!draft.name.trim() || !draft.address.trim() || !draft.phone.trim()) {
      setErrors((e) => ({ ...e, [bankId]: t("adminPortal.bankManagement.requiredFieldError") }));
      return;
    }
    setPending((p) => ({ ...p, [bankId]: true }));
    setErrors((e) => ({ ...e, [bankId]: "" }));
    const result = await updateBankDetailsAction(bankId, {
      name: draft.name,
      address: draft.address,
      phone: draft.phone,
      licenceNo: draft.licenceNo,
      pincode: draft.pincode,
    });
    setPending((p) => ({ ...p, [bankId]: false }));
    if (!result.ok) {
      setErrors((e) => ({ ...e, [bankId]: translateBankError(result.error) }));
      return;
    }
    setBanks((prev) =>
      prev.map((b) =>
        b.id === bankId
          ? {
              ...b,
              name: draft.name.trim(),
              address: draft.address.trim(),
              phone: draft.phone.trim(),
              licenceNo: draft.licenceNo.trim() || null,
              pincode: draft.pincode.trim() || null,
            }
          : b,
      ),
    );
    setEditingId(null);
    setDetailsSaved((prev) => ({ ...prev, [bankId]: true }));
  }

  async function submitAddBank() {
    if (!addDraft.name.trim() || !addDraft.address.trim() || !addDraft.phone.trim()) {
      setAddError(t("adminPortal.bankManagement.requiredFieldError"));
      return;
    }
    if (!EMAIL_PATTERN.test(staffEmail)) {
      setAddError(t("adminPortal.bankManagement.invalidEmailError"));
      return;
    }
    if (!staffFullName.trim()) {
      setAddError(t("adminPortal.bankManagement.requiredFieldError"));
      return;
    }
    setAddError(null);
    setAddPending(true);
    try {
      const result = await createBankAction({
        name: addDraft.name,
        address: addDraft.address,
        phone: addDraft.phone,
        licenceNo: addDraft.licenceNo,
        pincode: addDraft.pincode,
        staffEmail,
        staffFullName,
      });
      if (!result.ok) {
        setAddError(translateBankError(result.error));
        return;
      }
      // Reconstructed client-side from the form's own input, not
      // refetched - defaults (is_verified: false, is_active: true) match
      // blood_banks' own column defaults (Unit 02), same as this screen's
      // read already relies on for every other bank.
      const newBank: AdminBankRow = {
        id: result.bankId,
        name: addDraft.name.trim(),
        address: addDraft.address.trim(),
        phone: addDraft.phone.trim(),
        isVerified: false,
        isActive: true,
        policyNotes: "",
        licenceNo: addDraft.licenceNo.trim() || null,
        pincode: addDraft.pincode.trim() || null,
      };
      setBanks((prev) => [...prev, newBank].sort((a, b) => a.name.localeCompare(b.name)));
      setDrafts((prev) => ({ ...prev, [newBank.id]: "" }));
      setRevealed({ email: result.staffEmail, tempPassword: result.tempPassword });
      setCopied(false);
      setAddDraft(EMPTY_DETAILS);
      setStaffEmail("");
      setStaffFullName("");
    } finally {
      setAddPending(false);
    }
  }

  async function copyPassword() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.tempPassword);
      setCopied(true);
    } catch {
      // Clipboard access can be denied by the browser - the password is
      // still visible on screen to copy by hand, so this isn't fatal.
    }
  }

  const inputClass =
    "rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100";
  const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink-700";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminPortal.bankManagement.title")}</h1>

      <div className="flex max-w-md flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
        <h2 className="font-display text-base font-semibold text-ink-900">
          {t("adminPortal.bankManagement.addBankTitle")}
        </h2>

        {revealed && (
          <div className="flex flex-col gap-2 rounded-xl border border-soil-600 bg-soil-100 p-3 text-sm">
            <p className="font-semibold text-ink-900">
              {t("adminPortal.bankManagement.tempPasswordIntro", { email: revealed.email })}
            </p>
            <code className="break-all rounded-lg bg-white px-2 py-1.5 text-sm text-ink-900">
              {revealed.tempPassword}
            </code>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyPassword}
                className="w-fit rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-white"
              >
                {copied ? t("adminPortal.bankManagement.copiedLabel") : t("adminPortal.bankManagement.copyButton")}
              </button>
              <span className="text-xs text-ink-500">{t("adminPortal.bankManagement.relayPasswordNote")}</span>
            </div>
            <button
              type="button"
              onClick={() => setRevealed(null)}
              className="w-fit text-xs font-medium text-ink-500 underline"
            >
              {t("adminPortal.bankManagement.dismissButton")}
            </button>
          </div>
        )}

        <label className={labelClass} htmlFor="add-bank-name">
          {t("adminPortal.bankManagement.nameLabel")}
          <input
            id="add-bank-name"
            value={addDraft.name}
            onChange={(e) => setAddDraft((d) => ({ ...d, name: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className={labelClass} htmlFor="add-bank-address">
          {t("adminPortal.bankManagement.addressLabel")}
          <input
            id="add-bank-address"
            value={addDraft.address}
            onChange={(e) => setAddDraft((d) => ({ ...d, address: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className={labelClass} htmlFor="add-bank-phone">
          {t("adminPortal.bankManagement.phoneLabel")}
          <input
            id="add-bank-phone"
            value={addDraft.phone}
            onChange={(e) => setAddDraft((d) => ({ ...d, phone: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className={labelClass} htmlFor="add-bank-licence">
          {t("adminPortal.bankManagement.licenceNoLabel")}
          <input
            id="add-bank-licence"
            value={addDraft.licenceNo}
            onChange={(e) => setAddDraft((d) => ({ ...d, licenceNo: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className={labelClass} htmlFor="add-bank-pincode">
          {t("adminPortal.bankManagement.pincodeLabel")}
          <input
            id="add-bank-pincode"
            value={addDraft.pincode}
            onChange={(e) => setAddDraft((d) => ({ ...d, pincode: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className={labelClass} htmlFor="add-bank-staff-email">
          {t("adminPortal.bankManagement.staffEmailLabel")}
          <input
            id="add-bank-staff-email"
            type="email"
            value={staffEmail}
            onChange={(e) => setStaffEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass} htmlFor="add-bank-staff-name">
          {t("adminPortal.bankManagement.staffFullNameLabel")}
          <input
            id="add-bank-staff-name"
            value={staffFullName}
            onChange={(e) => setStaffFullName(e.target.value)}
            className={inputClass}
          />
        </label>
        {addError && <p className="text-sm text-blood-600">{addError}</p>}
        <button
          type="button"
          onClick={submitAddBank}
          disabled={addPending}
          className="w-fit rounded-full bg-blood-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addPending ? t("adminPortal.bankManagement.addingBank") : t("adminPortal.bankManagement.addBankButton")}
        </button>
      </div>

      {banks.length === 0 ? (
        <p className="text-sm text-ink-500">{t("adminPortal.bankManagement.emptyMessage")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {banks.map((bank) => (
            <li
              key={bank.id}
              className="flex max-w-md flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-[var(--shadow-soft)]"
            >
              {editingId === bank.id ? (
                <>
                  <label className={labelClass} htmlFor={`edit-name-${bank.id}`}>
                    {t("adminPortal.bankManagement.nameLabel")}
                    <input
                      id={`edit-name-${bank.id}`}
                      value={editDrafts[bank.id]?.name ?? ""}
                      onChange={(e) => updateEditDraft(bank.id, "name", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass} htmlFor={`edit-address-${bank.id}`}>
                    {t("adminPortal.bankManagement.addressLabel")}
                    <input
                      id={`edit-address-${bank.id}`}
                      value={editDrafts[bank.id]?.address ?? ""}
                      onChange={(e) => updateEditDraft(bank.id, "address", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass} htmlFor={`edit-phone-${bank.id}`}>
                    {t("adminPortal.bankManagement.phoneLabel")}
                    <input
                      id={`edit-phone-${bank.id}`}
                      value={editDrafts[bank.id]?.phone ?? ""}
                      onChange={(e) => updateEditDraft(bank.id, "phone", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass} htmlFor={`edit-licence-${bank.id}`}>
                    {t("adminPortal.bankManagement.licenceNoLabel")}
                    <input
                      id={`edit-licence-${bank.id}`}
                      value={editDrafts[bank.id]?.licenceNo ?? ""}
                      onChange={(e) => updateEditDraft(bank.id, "licenceNo", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass} htmlFor={`edit-pincode-${bank.id}`}>
                    {t("adminPortal.bankManagement.pincodeLabel")}
                    <input
                      id={`edit-pincode-${bank.id}`}
                      value={editDrafts[bank.id]?.pincode ?? ""}
                      onChange={(e) => updateEditDraft(bank.id, "pincode", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  {errors[bank.id] && <p className="text-xs text-blood-600">{errors[bank.id]}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveDetails(bank.id)}
                      disabled={pending[bank.id]}
                      className="w-fit rounded-full bg-blood-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("adminPortal.bankManagement.saveDetailsButton")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={pending[bank.id]}
                      className="w-fit rounded-full border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-sand-100"
                    >
                      {t("adminPortal.bankManagement.cancelButton")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-ink-900">{bank.name}</span>
                    <div className="flex gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${bank.isVerified ? "bg-banyan-100 text-banyan-700" : "bg-sand-100 text-ink-500"}`}
                      >
                        {bank.isVerified
                          ? t("adminPortal.bankManagement.verifiedLabel")
                          : t("adminPortal.bankManagement.unverifiedLabel")}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${bank.isActive ? "bg-banyan-100 text-banyan-700" : "bg-blood-50 text-blood-600"}`}
                      >
                        {bank.isActive
                          ? t("adminPortal.bankManagement.activeLabel")
                          : t("adminPortal.bankManagement.suspendedLabel")}
                      </span>
                    </div>
                  </div>

                  <p>
                    <span className="text-ink-500">{t("adminPortal.bankManagement.addressLabel")}: </span>
                    {bank.address}
                  </p>
                  <p>
                    <span className="text-ink-500">{t("adminPortal.bankManagement.phoneLabel")}: </span>
                    <a href={`tel:${bank.phone}`} className="font-medium text-blood-600 underline">
                      {bank.phone}
                    </a>
                  </p>
                  {bank.licenceNo && (
                    <p>
                      <span className="text-ink-500">{t("adminPortal.bankManagement.licenceNoLabel")}: </span>
                      {bank.licenceNo}
                    </p>
                  )}
                  {bank.pincode && (
                    <p>
                      <span className="text-ink-500">{t("adminPortal.bankManagement.pincodeLabel")}: </span>
                      {bank.pincode}
                    </p>
                  )}

                  {errors[bank.id] && <p className="text-xs text-blood-600">{errors[bank.id]}</p>}
                  {detailsSaved[bank.id] && (
                    <p className="text-xs text-banyan-700">{t("adminPortal.bankManagement.detailsSavedMessage")}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleVerified(bank)}
                      disabled={pending[bank.id]}
                      className="rounded-full border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {bank.isVerified
                        ? t("adminPortal.bankManagement.revokeVerificationButton")
                        : t("adminPortal.bankManagement.verifyButton")}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(bank)}
                      disabled={pending[bank.id]}
                      className={`rounded-full border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${bank.isActive ? "border-blood-600 text-blood-600 hover:bg-blood-50" : "border-ink-200 text-ink-700 hover:bg-sand-100"}`}
                    >
                      {bank.isActive
                        ? t("adminPortal.bankManagement.suspendButton")
                        : t("adminPortal.bankManagement.reactivateButton")}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(bank)}
                      disabled={pending[bank.id]}
                      className="rounded-full border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("adminPortal.bankManagement.editButton")}
                    </button>
                  </div>

                  <label className={labelClass} htmlFor={`policy-notes-${bank.id}`}>
                    {t("adminPortal.bankManagement.policyNotesLabel")}
                    <textarea
                      id={`policy-notes-${bank.id}`}
                      value={drafts[bank.id]}
                      onChange={(e) => updateDraft(bank.id, e.target.value)}
                      className={inputClass}
                      rows={3}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => savePolicyNotes(bank.id)}
                      disabled={pending[bank.id]}
                      className="w-fit rounded-full bg-blood-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("adminPortal.bankManagement.saveButton")}
                    </button>
                    {saved[bank.id] && (
                      <span className="text-xs text-banyan-700">{t("adminPortal.bankManagement.savedMessage")}</span>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
