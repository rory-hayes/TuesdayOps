import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { signUpAction } from "@/lib/auth/actions";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const error = readParam(params.error);

  return (
    <AuthLayout>
      <div>
        <h1 className="text-2xl/8 font-semibold text-zinc-950">Create your account</h1>
        <p className="mt-2 text-sm/6 text-zinc-500">
          Start with an agency workspace, then add clients, workflows, and endpoint checks.
        </p>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm/6 text-red-700">{error}</p> : null}

      <form action={signUpAction} className="grid gap-6">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="new-password" />
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>

      <p className="text-sm/6 text-zinc-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-zinc-950 hover:text-zinc-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
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
    <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
      {label}
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
