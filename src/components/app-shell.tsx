import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRightStartOnRectangleIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  Square2StackIcon,
  UsersIcon,
} from "@heroicons/react/20/solid";
import { BrandLogo } from "@/components/brand-logo";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { signOutAction } from "@/lib/auth/actions";
import { createClientAction } from "@/lib/clients/service";
import type { WorkspaceContext } from "@/lib/auth/workspace";

const navigation = [
  { label: "Overview", href: "/", icon: ChartBarSquareIcon },
  { label: "Clients", href: "/clients", icon: UsersIcon },
  { label: "Workflows", href: "/workflows", icon: Square2StackIcon },
  { label: "Checks", href: "/checks", icon: ShieldCheckIcon },
  { label: "Issues", href: "/issues", icon: ExclamationTriangleIcon },
  { label: "Reports", href: "/reports", icon: DocumentTextIcon },
  { label: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

type AppShellProps = {
  children: ReactNode;
  workspace: WorkspaceContext;
  clients: Array<{ id: string; name: string }>;
};

export function AppShell({ children, workspace, clients }: AppShellProps) {
  const agency = workspace.agency;
  const userEmail = workspace.user.email;

  return (
    <div className="min-h-screen bg-white text-zinc-950 lg:bg-zinc-100">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-zinc-950/5 lg:bg-zinc-100">
        <div className="flex h-full flex-col">
          <div className="border-b border-zinc-950/5 px-6 py-5">
            <BrandLogo />
          </div>

          <nav className="flex flex-1 flex-col gap-8 overflow-y-auto px-3 py-5">
            <SidebarSection>
              {navigation.map((item) => (
                <SidebarLink key={item.href} href={item.href} icon={item.icon}>
                  {item.label}
                </SidebarLink>
              ))}
            </SidebarSection>

            <SidebarSection>
              <div className="flex items-center justify-between px-3">
                <p className="text-xs/6 font-medium text-zinc-500">Clients</p>
                <NewClientDialog action={createClientAction} trigger="icon" />
              </div>
              {clients.length ? (
                clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    prefetch={false}
                    className="block truncate rounded-lg px-3 py-2 text-sm/6 font-medium text-zinc-700 transition hover:bg-zinc-950/5 hover:text-zinc-950"
                  >
                    {client.name}
                  </Link>
                ))
              ) : (
                <p className="px-3 py-2 text-sm/6 text-zinc-500">No clients yet</p>
              )}
            </SidebarSection>

          </nav>

          <div className="border-t border-zinc-950/5 p-3">
            <div className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-zinc-900 text-sm font-semibold text-white">
                {agency.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm/5 font-medium text-zinc-950">{agency.name}</p>
                {userEmail ? <p className="truncate text-xs/5 text-zinc-500">{userEmail}</p> : null}
              </div>
            </div>
            <form action={signOutAction} className="mt-1">
              <FormSubmitButton
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                type="submit"
                pendingLabel="Signing out..."
              >
                <ArrowRightStartOnRectangleIcon aria-hidden="true" />
                Sign out
              </FormSubmitButton>
            </form>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-zinc-950/10 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <BrandLogo />
            <form action={signOutAction}>
              <FormSubmitButton variant="ghost" size="sm" type="submit" pendingLabel="Signing out...">
                <ArrowRightStartOnRectangleIcon aria-hidden="true" />
                Sign out
              </FormSubmitButton>
            </form>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm/6 font-medium text-zinc-700 ring-1 ring-zinc-950/10 hover:bg-zinc-950/5 hover:text-zinc-950"
              >
                <item.icon className="size-4 text-zinc-500" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="min-h-screen bg-white px-5 py-8 shadow-sm ring-1 ring-zinc-950/10 lg:m-2 lg:rounded-xl lg:px-10 lg:py-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarSection({ children }: { children: ReactNode }) {
  return <div className="grid gap-1">{children}</div>;
}

function SidebarLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof ChartBarSquareIcon;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm/6 font-medium text-zinc-700 transition hover:bg-zinc-950/5 hover:text-zinc-950"
    >
      <Icon className="size-5 text-zinc-500 group-hover:text-zinc-950" aria-hidden="true" />
      {children}
    </Link>
  );
}
