import { navLinkClass, primaryButtonClass, secondaryButtonClass } from "@/constants/navigation";
import Link from "next/link";

interface GuestActionsProps {
  className?: string;
}

export default function GuestActions({ className = "" }: GuestActionsProps) {
  return (
    <div className={"flex items-center gap-4"}>
      <Link href="/service" className={`${className} ${navLinkClass} mr-4`}>
        採用ご検討中の法人様
      </Link>
      <Link href="/auth/signup" className={`${primaryButtonClass}`}>
        無料登録
      </Link>
      <Link href="/auth/login" className={`${className} ${secondaryButtonClass}`}>
        ログイン
      </Link>
    </div>
  );
}
