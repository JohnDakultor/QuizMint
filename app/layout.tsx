import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Providers } from "./recaptcha-provider";
import GAPageView from "@/components/analytics/ga-pageview";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.quizmintai.com"),
  title: "QuizMint | AI Quiz and Lesson Plan Generator",
  icons: "/favicon.ico",
  description:
    "Turn text, documents, and lessons into interactive quizzes and structured lesson plans instantly using AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adProvider = (process.env.NEXT_PUBLIC_AD_PROVIDER || "adsense").toLowerCase();
  const monetagScriptSrc = process.env.NEXT_PUBLIC_MONETAG_SCRIPT_SRC || "";
  const monetagZone = process.env.NEXT_PUBLIC_MONETAG_ZONE || "";
  const gaId = process.env.NEXT_PUBLIC_GA_ID || "";

  return (
    <html lang="en">
      <head>
        {adProvider === "monetag" && monetagScriptSrc && (
          <script
            src={monetagScriptSrc}
            data-zone={monetagZone || undefined}
            async
            data-cfasync="false"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-linear-to-b from-white to-zinc-50 dark:from-black dark:to-zinc-900 text-zinc-900 dark:text-zinc-50`}
      >
        {adProvider === "adsense" && (
          <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8981480808378326"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${gaId}', { send_page_view: false });
              `}
            </Script>
          </>
        )}

        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <Providers>
          <GAPageView />
          {children}
        </Providers>
      </body>
    </html>
  );
}
