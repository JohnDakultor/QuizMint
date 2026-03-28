export default function PublicQuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen w-full bg-white">
      {children}
    </main>
  );
}
