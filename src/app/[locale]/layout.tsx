import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "../globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";

const dmSans = DM_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DrGodly",
  description: "Your personal health companion",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${dmSans.className} antialiased`}
      suppressHydrationWarning
      data-theme="zinc-light"
    >
      <head>
        {/* Reads localStorage before first paint — eliminates theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('app-theme');if(t){document.documentElement.setAttribute('data-theme',t);}else{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',d?'zinc-dark':'zinc-light');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <NextIntlClientProvider>
            <TooltipProvider>
              <Navbar />
              {children}
            </TooltipProvider>
          </NextIntlClientProvider>
          <NextTopLoader showSpinner={false} color="var(--progress-bar)" />
        </ThemeProvider>
      </body>
    </html>
  );
}
