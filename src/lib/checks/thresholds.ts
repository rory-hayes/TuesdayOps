export const healthCheckThresholds = {
  checkFrequencyMinutes: {
    min: 5,
    max: 10080,
  },
  expectedStatus: {
    min: 100,
    max: 599,
  },
  maxLatencyMs: {
    min: 100,
    max: 60000,
  },
  timeoutMs: {
    min: 1000,
    max: 60000,
  },
} as const;

export type HealthCheckThresholdField = keyof typeof healthCheckThresholds;

export const healthCheckThresholdMessages: Record<HealthCheckThresholdField, string> = {
  checkFrequencyMinutes: "Frequency must be 5-10080 minutes.",
  expectedStatus: "Expected status must be 100-599.",
  maxLatencyMs: "Max latency must be 100-60000 ms.",
  timeoutMs: "Timeout must be 1000-60000 ms.",
};

export function getHealthCheckThresholdMessage(field: HealthCheckThresholdField): string {
  return healthCheckThresholdMessages[field];
}
