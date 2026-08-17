import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import LocaleProvider from "@/components/LocaleProvider";
import LanguageToggle from "@/components/LanguageToggle";

export const metadata: Metadata = {
  formatDetection: { telephone: false, date: false, email: false, address: false },
  title: {
    default: "QA Agent AI — AI-Powered End-to-End Testing",
    template: "%s | QA Agent AI",
  },
  description:
    "Paste any live URL and let the AI agent crawl, analyze, and generate production-ready Playwright, Cypress, and Selenium test scripts in seconds.",
  keywords: [
    "QA automation",
    "AI testing",
    "Playwright",
    "Cypress",
    "Selenium",
    "end-to-end testing",
    "test automation",
  ],
  openGraph: {
    title: "QA Agent AI — AI-Powered End-to-End Testing",
    description:
      "Your AI-powered end-to-end testing companion. Generate production-ready test scripts from any live URL.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="mesh-bg min-h-screen">
        <LocaleProvider>
          <div className="relative flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
            <ConditionalFooter />
          </div>
          <LanguageToggle />
        </LocaleProvider>
      </body>
    </html>
  );
}
