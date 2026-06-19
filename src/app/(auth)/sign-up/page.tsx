import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { PageFeedback } from "@/components/ui/page-feedback";
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

      <PageFeedback error={error} />

      <SignUpForm action={signUpAction} />

      <p className="text-sm/6 text-zinc-500">
        Already have an account?{" "}
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
