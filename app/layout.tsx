import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextAuthProvider from "./provider";
import { Toaster } from "react-hot-toast";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Talking Code",
  description: "",
};

const CustomToaster = () => {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "#111827",
          color: "#fff",
          border: "1px solid #374151",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          padding: "12px",
          fontSize: "14px",
        },
        success: {
          iconTheme: {
            primary: "#4caf50",
            secondary: "#fff",
          },
        },
        error: {
          iconTheme: {
            primary: "#f44336",
            secondary: "#fff",
          },
        },
      }}
    />
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
              {children}
            </ThemeProvider>
          </QueryProvider>
          <CustomToaster />
          <Sonner />
        </NextAuthProvider>
      </body>
    </html>
  );
}
