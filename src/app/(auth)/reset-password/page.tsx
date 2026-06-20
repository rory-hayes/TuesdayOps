import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PageFeedback } from "@/components/ui/page-feedback";
import { updatePasswordAction } from "@/lib/auth/actions";

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

      <PageFeedback error={error} variant="inline" />

      <ResetPasswordForm action={updatePasswordAction} />

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
