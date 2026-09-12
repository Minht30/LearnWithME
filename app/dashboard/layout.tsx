import Link from "next/link";
import { BookOpen, Plus, GraduationCap, Home, LogOut } from "lucide-react";
import { requireTeacher } from "@/lib/auth/session";
import { signOutTeacher } from "@/app/actions/auth-actions";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const teacher = await requireTeacher();
  const initials = teacher.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || teacher.email[0].toUpperCase();

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

          <div className="mt-8 flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-sm font-semibold dark:bg-amber-950 dark:text-amber-300">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{teacher.name}</p>
              <p className="truncate text-xs text-muted-foreground">{teacher.email}</p>
            </div>
          </div>
          <form action={signOutTeacher} className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </form>
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
