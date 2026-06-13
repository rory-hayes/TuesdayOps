import { Resend } from "resend";
import { getResendApiKey, getResendFromEmail } from "@/lib/env";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type SendEmailResult = {
  id: string;
};

export async function sendResendEmail({
  to,
  subject,
  text,
  html,
  idempotencyKey,
}: SendEmailInput): Promise<SendEmailResult> {
  const resend = new Resend(getResendApiKey());
  const { data, error } = await resend.emails.send(
    {
      from: getResendFromEmail(),
      to,
      subject,
      text,
      html,
    },
    { idempotencyKey },
  );

  if (error) {
    throw new Error(`Resend alert failed: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Resend alert failed without a delivery id.");
  }

  return { id: data.id };
}
