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
  title: "QuizMintAI",
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
          <main
          className="
            transition-all duration-300
            px-4 pt-6
            pb-28 sm:pb-6
            ml-0 sm:ml-(--sidebar-width,16rem)
          "
        >
          {children}
        </main>
        </ClientLayout>
      </div>
    </>
  );
}
