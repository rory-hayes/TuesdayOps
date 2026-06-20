import { afterEach, describe, expect, it } from "vitest";
import { buildReportEmailIdentity } from "@/lib/reports/email-identity";

const originalEnv = { ...process.env };

describe("report email identity", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses the verified MaintainFlow sender with a Gmail reply-to", () => {
    process.env.RESEND_FROM_EMAIL = "MaintainFlow Reports <reports@maintainflow.io>";
    process.env.RESEND_VERIFIED_SENDER_DOMAIN = "maintainflow.io";

    expect(
      buildReportEmailIdentity({
        name: "MaintainFlow",
        reportSenderName: "Rory at MaintainFlow",
        reportSenderEmail: "reports@maintainflow.io",
        reportReplyToEmail: "roryh1@gmail.com",
        reportSenderDomainStatus: "verified",
      }),
    ).toMatchObject({
      from: "Rory at MaintainFlow <reports@maintainflow.io>",
      fromEmail: "reports@maintainflow.io",
      replyTo: "roryh1@gmail.com",
      usingFallbackSender: false,
    });
  });

  it("treats the default MaintainFlow sender as verified when no agency setting exists yet", () => {
    process.env.RESEND_FROM_EMAIL = "MaintainFlow Reports <reports@maintainflow.io>";
    process.env.RESEND_VERIFIED_SENDER_DOMAIN = "maintainflow.io";

    expect(
      buildReportEmailIdentity({
        name: "MaintainFlow",
      }),
    ).toMatchObject({
      from: "MaintainFlow <reports@maintainflow.io>",
      fromEmail: "reports@maintainflow.io",
      senderDomainStatus: "verified",
      usingFallbackSender: false,
    });
  });


  it("falls back to the platform sender when the configured sender is not verified", () => {
    process.env.RESEND_FROM_EMAIL = "MaintainFlow Reports <reports@maintainflow.io>";
    process.env.RESEND_VERIFIED_SENDER_DOMAIN = "maintainflow.io";

    expect(
      buildReportEmailIdentity({
        name: "Client Agency",
        reportSenderName: "Client Agency",
        reportSenderEmail: "reports@client-agency.example",
        reportSenderDomainStatus: "pending",
      }),
    ).toMatchObject({
      from: "Client Agency <reports@maintainflow.io>",
      fromEmail: "reports@maintainflow.io",
      replyTo: "reports@client-agency.example",
      usingFallbackSender: true,
    });
  });
});
