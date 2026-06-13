import Link from "next/link";
import { Activity } from "lucide-react";
import { signUpAction } from "@/lib/auth/actions";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const error = readParam(params.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">TuesdayOps</p>
            <p className="text-xs text-muted-foreground">AI workflow maintenance</p>
          </div>
        </div>

        <div className="mt-8">
          <h1 className="text-2xl font-semibold tracking-normal">Create your account</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start with an agency workspace, then add clients, workflows, and endpoint checks.
          </p>
        </div>

        {error ? <p className="mt-5 rounded-md bg-danger-background p-3 text-sm text-danger">{error}</p> : null}

        <form action={signUpAction} className="mt-6 space-y-4">
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field label="Password" name="password" type="password" autoComplete="new-password" />
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[#6d5ee0]"
          >
            Create account
          </button>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
