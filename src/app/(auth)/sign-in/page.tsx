import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { signInAction } from "@/lib/auth/actions";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const error = readParam(params.error);
  const notice = readParam(params.notice);

  return (
    <AuthLayout>
      <div>
        <h1 className="text-2xl/8 font-semibold text-zinc-950">Sign in to your account</h1>
        <p className="mt-2 text-sm/6 text-zinc-500">
          Access your agency workflow maintenance workspace.
        </p>
      </div>

      {notice ? (
        <p role="status" aria-live="polite" className="rounded-lg bg-lime-50 p-3 text-sm/6 text-lime-700">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" aria-live="assertive" className="rounded-lg bg-red-50 p-3 text-sm/6 text-red-700">
          {error}
        </p>
      ) : null}

      <form action={signInAction} className="grid gap-6">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
        <FormSubmitButton type="submit" className="w-full" pendingLabel="Signing in...">
          Sign in
        </FormSubmitButton>
      </form>

      <Link
        href="/forgot-password"
        prefetch={false}
        className="text-sm/6 font-semibold text-zinc-950 hover:text-zinc-700"
      >
        Forgot password?
      </Link>

      <p className="text-sm/6 text-zinc-500">
        New to TuesdayOps?{" "}
        <Link href="/sign-up" prefetch={false} className="font-semibold text-zinc-950 hover:text-zinc-700">
          Create an account
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
        minLength={type === "password" ? 8 : undefined}
        autoComplete={autoComplete}
        className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
