import { PhoneOtpFlow } from "@/components/auth/PhoneOtpFlow";

// S4 raise-request (PRD.md §6.1) starts with this shared phone+OTP step,
// same component as donor registration — CLAUDE.md rule 6: only raising a
// request requires OTP, search itself stays public. Blood group/component/
// units/destination bank/urgency fields arrive in Unit 21.
export default function RaiseRequestPage() {
  return (
    <main className="p-6">
      <PhoneOtpFlow />
    </main>
  );
}
