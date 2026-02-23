import { requireAdminAAL1 } from "@/lib/auth/require-auth";
import VerifyTOTPContent from "./VerifyTOTPContent";

export default async function VerifyTOTPPage() {
  await requireAdminAAL1();

  return <VerifyTOTPContent />;
}
