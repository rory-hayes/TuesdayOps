import { Resend } from "resend";
import { getResendApiKey, getResendFromEmail } from "@/lib/env";

export type SendEmailInput = {
  from?: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string | string[];
  idempotencyKey: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
};

export type SendEmailResult = {
  id: string;
};

export async function sendResendEmail({
  from,
  to,
  subject,
  text,
  html,
  replyTo,
  idempotencyKey,
  attachments,
}: SendEmailInput): Promise<SendEmailResult> {
  const resend = new Resend(getResendApiKey());
  const { data, error } = await resend.emails.send(
    {
      from: from ?? getResendFromEmail(),
      to,
      subject,
      text,
      html,
      replyTo,
      attachments,
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
