export type SchedulableCheck = {
  id: string;
  agencyId: string;
  workflowId: string;
  workflowEndpointUrl: string | null;
  workflowFrequencyMinutes: number;
  enabled: boolean;
  latestCompletedAt: string | null;
};

export function getScheduledWindowStart(now = new Date(), windowMinutes = 5): Date {
  const windowMs = windowMinutes * 60 * 1000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

export function isCheckDue({
  now,
  latestCompletedAt,
  frequencyMinutes,
}: {
  now: Date;
  latestCompletedAt: string | null;
  frequencyMinutes: number;
}): boolean {
  if (!latestCompletedAt) {
    return true;
  }

  const latestTime = new Date(latestCompletedAt).getTime();

  if (Number.isNaN(latestTime)) {
    return true;
  }

  return now.getTime() - latestTime >= frequencyMinutes * 60 * 1000;
}

export function selectDueChecks(
  checks: SchedulableCheck[],
  now = new Date(),
  limit = 50,
): SchedulableCheck[] {
  return checks
    .filter((check) => {
      if (!check.enabled || !check.workflowEndpointUrl) {
        return false;
      }

      return isCheckDue({
        now,
        latestCompletedAt: check.latestCompletedAt,
        frequencyMinutes: check.workflowFrequencyMinutes,
      });
    })
    .slice(0, limit);
}
