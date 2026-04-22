export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Time Tracker
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Project scaffolded. Auth, tasks, and timer features will be wired up
          in upcoming feature branches.
        </p>
      </div>
    </main>
  );
}
