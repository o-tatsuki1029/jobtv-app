import Link from "next/link";
import Image from "next/image";
import { SITE_NAME, LOGO_URL } from "@/constants/site";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    service: [
      { label: "就活Shorts", href: "#short" },
      { label: "就活ドキュメンタリー", href: "#documentary" },
      { label: "企業説明", href: "#company" },
      { label: "採用イベント", href: "#" }
    ],
    about: [
      { label: "運営会社", href: "https://vectorinc.co.jp/company/about" },
      { label: "利用規約", href: "#" },
      {
        label: "プライバシーポリシー",
        href: "https://vectorinc.co.jp/privacy"
      },
      { label: "クッキーポリシー", href: "https://vectorinc.co.jp/cookie" },
      {
        label: "外部送信ポリシー",
        href: "https://vectorinc.co.jp/external-transmission"
      }
    ],
    company: [
      { label: "新卒採用を検討中の法人様", href: "/service" },
      { label: "お問い合わせ", href: "#" }
    ]
  };

  return (
    <>
      <footer className="bg-black border-t border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* サイト情報 */}
            <div>
              <Link href="/" className="inline-block mb-4">
                <Image src={LOGO_URL} alt={SITE_NAME} width={120} height={28} className="h-6 md:h-7 w-auto" />
              </Link>
              <p className="text-gray-400 text-sm mb-4">動画就活で理想の企業と出会う</p>
              <div className="flex gap-4">
                {/* SNSリンク（将来的に追加） */}
                {/* <a
                  href="#"
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a> */}
              </div>
            </div>

            {/* サービス */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">サービス</h4>
              <ul className="space-y-2">
                {footerLinks.service.map((link) => {
                  const isExternal = link.href.startsWith("http");
                  return (
                    <li key={link.label}>
                      {isExternal ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-red-500 transition-colors text-sm flex items-center gap-1"
                        >
                          {link.label}
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : (
                        <Link href={link.href} className="text-gray-400 hover:text-red-500 transition-colors text-sm">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* JOBTVについて */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">JOBTVについて</h4>
              <ul className="space-y-2">
                {footerLinks.about.map((link) => {
                  const isExternal = link.href.startsWith("http");
                  return (
                    <li key={link.label}>
                      {isExternal ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-red-500 transition-colors text-sm flex items-center gap-1"
                        >
                          {link.label}
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : (
                        <Link href={link.href} className="text-gray-400 hover:text-red-500 transition-colors text-sm">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* 企業様向け */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">企業様向け</h4>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => {
                  const isExternal = link.href.startsWith("http");
                  return (
                    <li key={link.label}>
                      {isExternal ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-red-500 transition-colors text-sm flex items-center gap-1"
                        >
                          {link.label}
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : (
                        <Link href={link.href} className="text-gray-400 hover:text-red-500 transition-colors text-sm">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
        <div className="container border-t border-gray-800 flex justify-center items-center py-8 mx-auto">
          <p className="text-gray-400 text-sm">Copyright © {currentYear} VECTOR Inc. All Rights Reserved.</p>
        </div>
      </footer>
    </>
  );
}
