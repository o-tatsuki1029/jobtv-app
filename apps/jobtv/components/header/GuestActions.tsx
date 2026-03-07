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
      <Link
        href="/auth/signup"
        className={`px-6 py-2 text-sm xl:px-10 xl:py-2.5 xl:text-sm bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors font-semibold shadow-sm hover:shadow-md`}
      >
        無料登録
      </Link>
      <Link href="/auth/login" className={`${className} ${secondaryButtonClass}`}>
        ログイン
      </Link>
    </div>
  );
}
