import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import { updatePasswordAction } from "@/lib/auth/actions";
import { PASSWORD_REQUIREMENTS } from "@/lib/auth/password";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const error = readParam(params.error);

  return (
    <AuthLayout>
      <div>
        <h1 className="text-2xl/8 font-semibold text-zinc-950">Choose a new password</h1>
        <p className="mt-2 text-sm/6 text-zinc-500">
          Use the reset link from your email, then set a new password for this account.
        </p>
      </div>

      <PageFeedback error={error} />

      <form
        action={updatePasswordAction}
        aria-label="Update TuesdayOps password"
        noValidate
        className="grid gap-6"
      >
        <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
          New password
          <input
            required
            minLength={12}
            name="password"
            type="password"
            autoComplete="new-password"
            aria-describedby="password-help"
            className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          />
          <span id="password-help" className="text-xs/5 font-normal text-zinc-500">
            {PASSWORD_REQUIREMENTS}
          </span>
        </label>
        <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
          Confirm password
          <input
            required
            minLength={12}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          />
        </label>
        <FormSubmitButton type="submit" className="w-full" pendingLabel="Updating...">
          Update password
        </FormSubmitButton>
      </form>

      <p className="text-sm/6 text-zinc-500">
        Need a fresh link?{" "}
        <Link
          href="/forgot-password"
          prefetch={false}
          className="font-semibold text-zinc-950 hover:text-zinc-700"
        >
          Request another reset
        </Link>
      </p>
    </AuthLayout>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
