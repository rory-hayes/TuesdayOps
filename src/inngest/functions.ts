import { executeCheckRun } from "@/lib/checks/execution";
import { loadSchedulableChecks } from "@/lib/checks/scheduled-runner";
import { getScheduledWindowStart, selectDueChecks } from "@/lib/checks/scheduler";
import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "./client";

const scheduledCheckEventName = "checks/scheduled.run";

export const scheduledCheckSweep = inngest.createFunction(
  {
    id: "scheduled-check-sweep",
    name: "Scheduled check sweep",
    retries: 2,
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }) => {
    const now = new Date();
    const scheduledFor = getScheduledWindowStart(now).toISOString();
    const dueChecks = await step.run("load due checks", async () => {
      const supabase = createAdminClient();
      const checks = await loadSchedulableChecks({ supabase });

      return selectDueChecks(checks, now, 50).map((check) => ({
        name: scheduledCheckEventName,
        data: {
          agencyId: check.agencyId,
          checkId: check.id,
          scheduledFor,
        },
      }));
    });

    if (!dueChecks.length) {
      return { queued: 0, scheduledFor };
    }

    await step.sendEvent("queue due scheduled checks", dueChecks);

    return { queued: dueChecks.length, scheduledFor };
  },
);

export const runScheduledCheck = inngest.createFunction(
  {
    id: "run-scheduled-check",
    name: "Run scheduled check",
    retries: 3,
    triggers: [{ event: scheduledCheckEventName }],
  },
  async ({ event, step }) => {
    return step.run("execute check", async () => {
      const supabase = createAdminClient();

      return executeCheckRun({
        supabase,
        agencyId: event.data.agencyId,
        checkId: event.data.checkId,
        trigger: "scheduled",
        scheduledFor: event.data.scheduledFor,
      });
    });
  },
);

export const functions = [scheduledCheckSweep, runScheduledCheck];
