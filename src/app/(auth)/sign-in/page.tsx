import Link from "next/link";
import { AuthDivider, GoogleAuthForm } from "@/components/auth/google-auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignInForm } from "@/components/auth/sign-in-form";
import { PageFeedback } from "@/components/ui/page-feedback";
import { signInAction, signInWithGoogleAction } from "@/lib/auth/actions";

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

      <PageFeedback notice={notice} error={error} variant="inline" />

      <GoogleAuthForm action={signInWithGoogleAction} source="sign-in" />

      <AuthDivider />

      <SignInForm action={signInAction} />

      <Link
        href="/forgot-password"
        prefetch={false}
        className="text-sm/6 font-semibold text-zinc-950 hover:text-zinc-700"
      >
        Forgot password?
      </Link>

      <p className="text-sm/6 text-zinc-500">
        New to Maintain Flow?{" "}
        <Link href="/sign-up" prefetch={false} className="font-semibold text-zinc-950 hover:text-zinc-700">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
