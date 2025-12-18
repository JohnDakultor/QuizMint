import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-option";

import "../globals.css";

import ClientLayout from "../client-layout";
import Navigation from "@/components/ui/navigation";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "QuizMint",
  description: "Instant quizzes, payments, and account management",
};

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <>
      <div
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900 flex flex-col min-h-screen`}
      >
        <ClientLayout>
          <Navigation />
          <main className="grow max-w-7xl mx-auto w-full px-4 pb-20 sm:pb-0 mt-6">
            {children}
          </main>
        </ClientLayout>
      </div>
    </>
  );
}
