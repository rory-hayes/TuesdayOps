import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { requestPasswordResetAction } from "@/lib/auth/actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const error = readParam(params.error);
  const notice = readParam(params.notice);

  return (
    <AuthLayout>
      <div>
        <h1 className="text-2xl/8 font-semibold text-zinc-950">Reset your password</h1>
        <p className="mt-2 text-sm/6 text-zinc-500">
          Enter your account email and we will send a secure reset link.
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

      <form action={requestPasswordResetAction} className="grid gap-6">
        <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
          Email
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          />
        </label>
        <FormSubmitButton type="submit" className="w-full" pendingLabel="Sending...">
          Send reset link
        </FormSubmitButton>
      </form>

      <p className="text-sm/6 text-zinc-500">
        Remembered it?{" "}
        <Link href="/sign-in" prefetch={false} className="font-semibold text-zinc-950 hover:text-zinc-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
