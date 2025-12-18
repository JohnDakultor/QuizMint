"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import "@/app/globals.css";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-800 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md rounded-2xl bg-white/10 p-10 text-center shadow-2xl backdrop-blur"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-6xl font-extrabold text-white">404</h1>
        <h2 className="mt-3 text-xl font-semibold text-gray-200">
          Page Not Found
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          The page you’re looking for doesn’t exist, was removed, or is temporarily unavailable.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-gray-200"
        >
          Back to Home
        </Link>

        <p className="mt-4 text-xs text-gray-500">
          If you believe this is a mistake, please contact support.
        </p>
      </motion.div>
    </main>
  );
}
