import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceContext = {
  user: User;
  agency: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
    plan: string;
  };
  role: "owner" | "admin" | "member" | "viewer";
};

type MembershipRow = {
  role: WorkspaceContext["role"];
  agencies:
    | {
        id: string;
        name: string;
        slug: string;
        primary_color: string;
        plan: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
        primary_color: string;
        plan: string;
      }[];
};

export async function getWorkspaceContext(): Promise<{
  user: User | null;
  workspace: WorkspaceContext | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, workspace: null };
  }

  const { data, error } = await supabase
    .from("memberships")
    .select("role, agencies(id, name, slug, primary_color, plan)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load workspace: ${error.message}`);
  }

  if (!data) {
    return { user, workspace: null };
  }

  const membership = data as MembershipRow;
  const agency = Array.isArray(membership.agencies)
    ? membership.agencies[0]
    : membership.agencies;

  if (!agency) {
    return { user, workspace: null };
  }

  return {
    user,
    workspace: {
      user,
      role: membership.role,
      agency: {
        id: agency.id,
        name: agency.name,
        slug: agency.slug,
        primaryColor: agency.primary_color,
        plan: agency.plan,
      },
    },
  };
}

export async function requireWorkspace(): Promise<WorkspaceContext> {
  const { user, workspace } = await getWorkspaceContext();

  if (!user) {
    redirect("/sign-in");
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  return workspace;
}

export async function requireAuthenticatedUser(): Promise<User> {
  const { user } = await getWorkspaceContext();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
