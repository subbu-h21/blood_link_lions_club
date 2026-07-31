import { PhoneOtpFlow } from "@/components/auth/PhoneOtpFlow";

// D1 registration (PRD.md §7.1) starts with this shared phone+OTP step.
// Full name / DOB / blood group / PIN / consent fields arrive in Unit 19;
// real Supabase auth wiring arrives in Unit 04.
export default function DonorRegisterPage() {
  return (
    <main className="p-6">
      <PhoneOtpFlow />
    </main>
  );
}
