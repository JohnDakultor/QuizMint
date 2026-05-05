import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-option";

import "../globals.css";

import ClientLayout from "../client-layout";
import AppTopbar from "@/components/ui/app-topbar";
import Navigation from "@/components/ui/navigation";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "QuizMintAI | Teacher Workspace",
  description:
    "Plan lessons, generate quizzes, assign class work, review results, and manage follow-up from the QuizMintAI teacher workspace.",
};

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <>
      <div
        id="auth-theme-root"
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased transition-colors dark:bg-zinc-950 dark:text-slate-100`}
      >
        <ClientLayout>
          <Navigation />
          <main
          className="
            app-shell
            min-h-screen
            overflow-x-hidden
            overflow-y-auto
            transition-all duration-300
            px-4 pt-6
            pb-28 sm:pb-6
            ml-0 sm:ml-(--sidebar-width,16rem)
          "
        >
          <AppTopbar />
          {children}
        </main>
        </ClientLayout>
      </div>
    </>
  );
}
