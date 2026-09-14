import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "../globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/QueryProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000"),
  title: {
    default: "DrGodly",
    template: "%s | DrGodly",
  },
  description: "Your personal health companion",
  applicationName: "DrGodly",
};

export const viewport: Viewport = {
  themeColor: "#102F2A",
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
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${dmSans.className} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <QueryProvider>
            <NextIntlClientProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </NextIntlClientProvider>
            <Toaster />
            <NextTopLoader showSpinner={false} color="var(--progress-bar)" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
