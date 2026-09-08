import Link from "next/link";
import { BookOpen, Plus, GraduationCap, Home } from "lucide-react";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r px-4 py-6 md:block">
          <Link href="/" className="mb-8 flex items-center gap-2 px-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            <span className="font-semibold tracking-tight">LearnWithMe</span>
          </Link>
          <nav className="flex flex-col gap-1 text-sm">
            <NavLink href="/dashboard" icon={<Home className="h-4 w-4" />} label="Tests" />
            <NavLink href="/dashboard/new" icon={<Plus className="h-4 w-4" />} label="New test" />
            <NavLink href="/dashboard/classes" icon={<GraduationCap className="h-4 w-4" />} label="Classes" />
          </nav>
          <div className="mt-8 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo mode</p>
            <p className="mt-1">Auth is skipped. Everything is saved under a single demo teacher.</p>
          </div>
        </aside>
        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  );
}
