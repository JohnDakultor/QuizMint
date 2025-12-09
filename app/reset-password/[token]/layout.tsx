import React from "react";
import "../../globals.css";

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-700 text-white min-h-screen">{children}</body>
    </html>
  );
}