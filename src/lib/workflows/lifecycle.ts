import type { WorkflowAuthConfig } from "@/lib/checks/runner";
import type { Workflow } from "@/lib/domain/types";
import { encryptJsonPayload, type EncryptedJsonPayload } from "@/lib/security/secrets";

export function buildWorkflowArchiveUpdate(archivedAt = new Date().toISOString()) {
  return {
    archived_at: archivedAt,
    included_in_reports: false,
  };
}

export type WorkflowAuthUpdateInput = {
  authType: Workflow["authType"];
  authSecret?: string;
  authHeaderName?: string;
  basicUsername?: string;
};

export type CurrentWorkflowAuthState = {
  auth_type: Workflow["authType"];
  endpoint_url?: string;
  encrypted_auth_config: EncryptedJsonPayload | null;
};

export function buildWorkflowAuthUpdate({
  input,
  current,
  nextEndpointUrl,
  encryptPayload = encryptJsonPayload,
}: {
  input: WorkflowAuthUpdateInput;
  current: CurrentWorkflowAuthState;
  nextEndpointUrl?: string;
  encryptPayload?: (payload: WorkflowAuthConfig) => EncryptedJsonPayload;
}): {
  auth_type: Workflow["authType"];
  encrypted_auth_config?: EncryptedJsonPayload | null;
} {
  if (input.authType === "none") {
    return {
      auth_type: "none",
      encrypted_auth_config: null,
    };
  }

  if (!input.authSecret) {
    if (current.auth_type === input.authType && current.encrypted_auth_config) {
      if (hasEndpointOriginChanged(current.endpoint_url, nextEndpointUrl)) {
        throw new Error("Enter a new auth secret before moving saved credentials to a different endpoint host.");
      }

      return {
        auth_type: input.authType,
      };
    }

    throw new Error("Enter a new auth secret before enabling or changing workflow authentication.");
  }

  return {
    auth_type: input.authType,
    encrypted_auth_config: encryptPayload(buildWorkflowAuthConfig(input)),
  };
}

export function buildWorkflowAuthConfig(input: WorkflowAuthUpdateInput): WorkflowAuthConfig {
  if (input.authType === "none") {
    throw new Error("No auth config is stored when authentication is disabled.");
  }

  if (input.authType === "bearer") {
    if (!input.authSecret) {
      throw new Error("Bearer auth requires a token.");
    }

    return { type: "bearer", token: input.authSecret };
  }

  if (input.authType === "api_key_header") {
    if (!input.authHeaderName || !input.authSecret) {
      throw new Error("API key auth requires a header name and secret.");
    }

    return {
      type: "api_key_header",
      headerName: input.authHeaderName,
      value: input.authSecret,
    };
  }

  if (!input.basicUsername || !input.authSecret) {
    throw new Error("Basic auth requires a username and password.");
  }

  return {
    type: "basic",
    username: input.basicUsername,
    password: input.authSecret,
  };
}

export function buildWorkflowSettingsUpdate({
  input,
  endpointUrl,
  authUpdate,
}: {
  input: {
    name: string;
    type: Workflow["type"];
    environment: Workflow["environment"];
    method: Workflow["method"];
    checkFrequencyMinutes: number;
    includedInReports: boolean;
  };
  endpointUrl: string;
  authUpdate: ReturnType<typeof buildWorkflowAuthUpdate>;
}) {
  return {
    name: input.name,
    type: input.type,
    environment: input.environment,
    endpoint_url: endpointUrl,
    method: input.method,
    ...authUpdate,
    check_frequency_minutes: input.checkFrequencyMinutes,
    included_in_reports: input.includedInReports,
  };
}

function hasEndpointOriginChanged(currentEndpointUrl?: string, nextEndpointUrl?: string): boolean {
  if (!currentEndpointUrl || !nextEndpointUrl) {
    return false;
  }

  try {
    return new URL(currentEndpointUrl).origin !== new URL(nextEndpointUrl).origin;
  } catch {
    return true;
  }
}

export function buildPrimaryHealthCheckMutation({
  existingCheckId,
  agencyId,
  workflowId,
  frequencyMinutes,
  configJson,
}: {
  existingCheckId?: string;
  agencyId: string;
  workflowId: string;
  frequencyMinutes: number;
  configJson: unknown;
}) {
  const schedule = `Every ${frequencyMinutes} minutes`;

  if (existingCheckId) {
    return {
      mode: "update" as const,
      checkId: existingCheckId,
      values: {
        config_json: configJson,
        schedule,
        enabled: true,
      },
    };
  }

  return {
    mode: "insert" as const,
    values: {
      agency_id: agencyId,
      workflow_id: workflowId,
      name: "Endpoint health check",
      type: "health" as const,
      config_json: configJson,
      schedule,
      enabled: true,
    },
  };
}
