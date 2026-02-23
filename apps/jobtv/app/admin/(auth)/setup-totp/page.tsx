import { requireAdminAAL1 } from "@/lib/auth/require-auth";
import { enrollAdminTOTP } from "@/lib/actions/admin-totp-actions";
import SetupTOTPContent from "./SetupTOTPContent";

export default async function SetupTOTPPage() {
  await requireAdminAAL1();

  const { qrCode, secret, factorId, error } = await enrollAdminTOTP();

  return (
    <SetupTOTPContent
      qrCode={qrCode}
      secret={secret}
      factorId={factorId}
      enrollError={error}
    />
  );
}
