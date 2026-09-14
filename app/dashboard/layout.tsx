import Link from "next/link";
import { Plus, GraduationCap, Home, LogOut } from "lucide-react";
import { requireTeacher } from "@/lib/auth/session";
import { signOutTeacher } from "@/app/actions/auth-actions";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";

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
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <AppBrand />
          <AppHeaderControls />
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r px-4 py-6 md:block">
          <div className="mb-6 px-2">
            <AppBrand />
          </div>
          <nav className="flex flex-col gap-1 text-sm">
            <NavLink href="/dashboard" icon={<Home className="h-4 w-4" />} label="Tests" />
            <NavLink href="/dashboard/new" icon={<Plus className="h-4 w-4" />} label="New test" />
            <NavLink href="/dashboard/classes" icon={<GraduationCap className="h-4 w-4" />} label="Classes" />
          </nav>

          <div className="mt-8 rounded-2xl border bg-card/60 p-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white text-sm font-bold shadow-md dark:from-[var(--brand)] dark:to-[var(--accent)] dark:shadow-[0_0_12px_rgba(0,240,255,0.35)]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{teacher.name}</p>
                <p className="truncate text-xs text-muted-foreground">{teacher.email}</p>
              </div>
            </div>
            <form action={signOutTeacher} className="mt-3">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </form>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <AppHeaderControls />
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
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  );
}
