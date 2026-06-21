import { z } from "zod";
import {
  checkFrequencyMinutesSchema,
  expectedStatusSchema,
  maxLatencyMsSchema,
  timeoutMsSchema,
} from "@/lib/checks/validation";
import {
  getHealthCheckThresholdMessage,
  type HealthCheckThresholdField,
} from "@/lib/checks/thresholds";

export type WorkflowCreateActionState = {
  status: "error";
  message: string;
  fieldErrors: Record<string, string>;
} | null;

export const workflowBaseFormSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  type: z.enum(["http_endpoint", "webhook", "n8n", "make", "zapier", "mcp_server", "custom_api", "manual_log"]),
  environment: z.enum(["production", "staging", "development"]),
  endpointUrl: z.string().trim().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH"]),
  authType: z.enum(["none", "bearer", "api_key_header", "basic"]),
  authSecret: z.string().trim().optional(),
  authHeaderName: z.string().trim().optional(),
  basicUsername: z.string().trim().optional(),
  checkFrequencyMinutes: checkFrequencyMinutesSchema,
  expectedStatus: expectedStatusSchema.default(200),
  maxLatencyMs: maxLatencyMsSchema.default(5000),
  timeoutMs: timeoutMsSchema.default(10000),
  requestBody: z.string().trim().optional(),
  responseContains: z.string().trim().max(200).optional(),
  jsonFieldPath: z.string().trim().max(120).optional(),
  fieldNotEmptyPath: z.string().trim().max(120).optional(),
  notContainsValue: z.string().trim().max(200).optional(),
  matchesRegexPattern: z.string().trim().max(500).optional(),
  requireValidJson: z.enum(["on"]).optional(),
});

export const workflowFormSchema = workflowBaseFormSchema
  .superRefine((value, context) => {
    if (value.authType === "none") {
      return;
    }

    if (!value.authSecret) {
      context.addIssue({
        code: "custom",
        path: ["authSecret"],
        message: "Enter the auth secret for this workflow.",
      });
    }

    if (value.authType === "api_key_header" && !value.authHeaderName) {
      context.addIssue({
        code: "custom",
        path: ["authHeaderName"],
        message: "API key header name is required.",
      });
    }

    if (value.authType === "basic" && !value.basicUsername) {
      context.addIssue({
        code: "custom",
        path: ["basicUsername"],
        message: "Basic auth username is required.",
      });
    }
  });

export const importWorkflowFormSchema = z.object({
  clientId: z.string().uuid(),
  importSource: z.enum(["url", "curl", "openapi", "postman"]),
  workflowType: workflowBaseFormSchema.shape.type.optional(),
  importedWorkflowName: z.string().trim().max(120).optional(),
  importText: z.string().trim().min(8),
  rawImportText: z.string().trim().optional(),
});

export const workflowUpdateFormSchema = workflowBaseFormSchema
  .omit({
    clientId: true,
  })
  .extend({
    id: z.string().uuid(),
    includedInReports: z.enum(["on"]).optional(),
    returnTab: z.enum(["overview", "checks", "api", "endpoint", "settings"]).optional(),
  })
  .superRefine((value, context) => {
    if (value.authType === "api_key_header" && value.authSecret && !value.authHeaderName) {
      context.addIssue({
        code: "custom",
        path: ["authHeaderName"],
        message: "API key header name is required when rotating API key auth.",
      });
    }

    if (value.authType === "basic" && value.authSecret && !value.basicUsername) {
      context.addIssue({
        code: "custom",
        path: ["basicUsername"],
        message: "Basic auth username is required when rotating basic auth.",
      });
    }
  });

export const workflowIdFormSchema = z.object({
  id: z.string().uuid(),
});

export function buildWorkflowFormFieldErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");

    if (!field || errors[field]) {
      continue;
    }

    errors[field] = formatWorkflowFieldIssue(field, issue.message);
  }

  return errors;
}

export function formatWorkflowFormValidationSummary(fieldErrors: Record<string, string>): string {
  const messages = [...new Set(Object.values(fieldErrors))];

  if (messages.length) {
    return messages.join(" ");
  }

  return "Check the client, workflow name, endpoint URL, auth settings, and check thresholds before saving.";
}

function formatWorkflowFieldIssue(field: string, fallback: string): string {
  if (isHealthCheckThresholdField(field)) {
    return getHealthCheckThresholdMessage(field);
  }

  if (field === "clientId") {
    return "Choose a client.";
  }

  if (field === "name") {
    return "Workflow name must be 2-120 characters.";
  }

  if (field === "type") {
    return "Choose a valid workflow type.";
  }

  if (field === "environment") {
    return "Choose a valid environment.";
  }

  if (field === "endpointUrl") {
    return "Enter a valid endpoint URL.";
  }

  if (field === "method") {
    return "Choose a valid HTTP method.";
  }

  if (field === "authType") {
    return "Choose a valid auth type.";
  }

  return fallback;
}

function isHealthCheckThresholdField(field: string): field is HealthCheckThresholdField {
  return field === "checkFrequencyMinutes" ||
    field === "expectedStatus" ||
    field === "maxLatencyMs" ||
    field === "timeoutMs";
}
