import { z } from "zod";
import {
  getHealthCheckThresholdMessage,
  healthCheckThresholds,
  type HealthCheckThresholdField,
} from "@/lib/checks/thresholds";

function boundedIntegerSchema(field: HealthCheckThresholdField) {
  const bounds = healthCheckThresholds[field];
  const message = getHealthCheckThresholdMessage(field);

  return z.coerce.number()
    .int(message)
    .min(bounds.min, message)
    .max(bounds.max, message);
}

export const checkFrequencyMinutesSchema = boundedIntegerSchema("checkFrequencyMinutes");
export const expectedStatusSchema = boundedIntegerSchema("expectedStatus");
export const maxLatencyMsSchema = boundedIntegerSchema("maxLatencyMs");
export const timeoutMsSchema = boundedIntegerSchema("timeoutMs");

export const healthCheckThresholdSchema = z.object({
  checkFrequencyMinutes: checkFrequencyMinutesSchema,
  expectedStatus: expectedStatusSchema.default(200),
  maxLatencyMs: maxLatencyMsSchema.default(5000),
  timeoutMs: timeoutMsSchema.default(10000),
});
