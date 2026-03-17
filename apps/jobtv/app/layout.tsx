import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";
import JsonLd from "./JsonLd";
import {
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_URL,
  OGP_IMAGE,
  SEO_KEYWORDS,
  TWITTER_HANDLE,
  TWITTER_SITE,
  ROBOTS_CONFIG,
  THEME_COLOR
} from "@/constants/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
});


const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: OGP_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_TITLE
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OGP_IMAGE],
    creator: TWITTER_HANDLE,
    site: TWITTER_SITE
  },
  robots: ROBOTS_CONFIG,
  alternates: {
    canonical: SITE_URL
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable} no-js h-full overflow-x-clip`} suppressHydrationWarning>
      <head>
        <JsonLd />
      </head>
      <body
        className="antialiased min-h-full bg-background text-foreground overflow-x-clip"
      >
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
        )}
        {children}
      </body>
    </html>
  );
}
