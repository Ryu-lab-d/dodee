import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AttendanceProvider } from "@/lib/attendance";
import { ConfirmProvider } from "@/components/ConfirmDialog";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "DoDee - ระบบจัดการหอพัก",
  description: "Property Management System",
};

export const viewport: Viewport = {
  themeColor: "#0e7490",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-sky-50 font-sans">
        <AuthProvider>
          <AttendanceProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </AttendanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
