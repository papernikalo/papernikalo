import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { AccountSlot } from "@/components/account-slot";
import { AuthProvider } from "@/components/auth-provider";
import { PracticeCatalogWarmup } from "@/components/practice-catalog-warmup";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ChromeGate, ChromeProvider } from "@/components/test-chrome";
import { rootMetadata, siteJsonLd } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = rootMetadata();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <JsonLd data={siteJsonLd()} />
        <Script
          src="https://www.googletagmanager.com/gtm.js?id=GTM-WQ94CV3G"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`}
        </Script>
        <div className="flex min-h-full flex-1 flex-col bg-[#F6F7F9] font-sans text-[#111827]">
          <PracticeCatalogWarmup />
          <AuthProvider>
            <ChromeProvider>
              <ChromeGate>
                <SiteHeader mobileAccount={<AccountSlot />} desktopAccount={<AccountSlot />} />
              </ChromeGate>
              {children}
              <ChromeGate>
                <SiteFooter />
              </ChromeGate>
            </ChromeProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
