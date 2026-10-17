import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LoadingIndicator from "@/components/LoadingIndicator";
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
  title: { default: "ReLoop AI", template: "ReLoop AI: %s" },
  description: "Predict the return. Choose the right package.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <LoadingIndicator />
      </body>
    </html>
  );
}
