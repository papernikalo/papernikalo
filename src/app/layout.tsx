import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AccountSlot } from "@/components/account-slot";
import { AuthProvider } from "@/components/auth-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { governmentJobNames } from "@/lib/content";
import { siteName, siteTagline } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description: `${siteTagline}. ${governmentJobNames.join(", ")}.`,
  keywords: governmentJobNames,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Script
          src="https://www.googletagmanager.com/gtm.js?id=GTM-WQ94CV3G"
          strategy="beforeInteractive"
        />
        <Script id="gtag-init" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`}
        </Script>
        <div className="flex min-h-full flex-1 flex-col bg-[#f3f5f7] font-sans text-[#1c2834]">
          <AuthProvider>
            <SiteHeader mobileAccount={<AccountSlot />} desktopAccount={<AccountSlot />} />
            {children}
            <SiteFooter />
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
