import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import LoadingIndicator from "@/components/LoadingIndicator";
import AccountDeletedToast from "@/components/AccountDeletedToast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "ReLoop AI", template: "ReLoop AI: %s" },
  description: "Predict the return. Choose the right package.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <LoadingIndicator />
        <Suspense fallback={null}><AccountDeletedToast /></Suspense>
      </body>
    </html>
  );
}
