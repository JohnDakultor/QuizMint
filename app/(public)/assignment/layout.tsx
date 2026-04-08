export default function PublicAssignmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="min-h-screen w-full bg-white">{children}</main>;
}
