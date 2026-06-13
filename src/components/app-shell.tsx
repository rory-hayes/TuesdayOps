import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  Bell,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  UsersRound,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import type { WorkspaceContext } from "@/lib/auth/workspace";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: UsersRound },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "Checks", href: "/checks", icon: ClipboardCheck },
  { label: "Issues", href: "/issues", icon: LifeBuoy },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

type AppShellProps = {
  children: ReactNode;
  workspace: WorkspaceContext;
};

export function AppShell({ children, workspace }: AppShellProps) {
  const agency = workspace.agency;
  const userEmail = workspace.user.email;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[264px_1fr]">
        <aside className="hidden border-r border-border bg-card px-4 py-5 lg:block">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 px-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold">TuesdayOps</p>
                <p className="text-xs text-muted-foreground">AI workflow maintenance</p>
              </div>
            </div>

            <nav className="mt-8 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <item.icon size={17} aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Workspace</p>
              <p className="mt-1 text-sm font-semibold">{agency.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{agency.plan}</p>
              {userEmail ? <p className="mt-3 truncate text-xs text-muted-foreground">{userEmail}</p> : null}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">Workspace</p>
                <h1 className="truncate text-lg font-semibold">{agency.name}</h1>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                  <Bell size={15} aria-hidden="true" />
                  Alerts
                </Button>
                <Button size="sm" className="w-full sm:w-auto">
                  <BadgeCheck size={15} aria-hidden="true" />
                  Run check
                </Button>
                <form action={signOutAction}>
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto" type="submit">
                    <LogOut size={15} aria-hidden="true" />
                    Sign out
                  </Button>
                </form>
              </div>
            </div>
            <nav className="mt-3 flex flex-wrap gap-2 lg:hidden">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-muted-foreground"
                >
                  <item.icon size={15} aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
