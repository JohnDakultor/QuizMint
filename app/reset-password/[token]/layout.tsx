import React from "react";
import "../../globals.css";

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="bg-neutral-700 text-white min-h-screen">{children}</div>
    </>
  );
}