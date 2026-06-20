"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { rotateWorkflowRunLogKeyAction, revokeWorkflowRunLogKeysAction } from "@/lib/run-logs/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PageFeedback } from "@/components/ui/page-feedback";
import type { WorkflowApiKeySummary } from "@/lib/domain/types";
import { formatRelativeTime } from "@/lib/formatting";

export function RunLogKeyPanel({
  workflowId,
  activeKeys,
}: {
  workflowId: string;
  activeKeys: WorkflowApiKeySummary[];
}) {
  const [rotateState, rotateAction] = useActionState(rotateWorkflowRunLogKeyAction, null);
  const [revokeState, revokeAction] = useActionState(revokeWorkflowRunLogKeysAction, null);
  const notice = rotateState?.notice ?? revokeState?.notice;
  const error = rotateState?.error ?? revokeState?.error;

  return (
    <Card>
      <PageFeedback notice={notice} error={error} />
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Run logging API</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Let this workflow post run metadata back to Tuesday.
          </p>
        </div>
        <KeyRound size={18} className="text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Send logs to <code className="font-mono text-xs">POST /api/public/run-log</code> with a bearer key.
          Keys are hashed before storage and shown only once.
        </div>

        {activeKeys.length ? (
          <div className="space-y-2">
            {activeKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Prefix {key.keyPrefix} · {key.lastUsedAt ? `last used ${formatRelativeTime(key.lastUsedAt)}` : `created ${formatRelativeTime(key.createdAt)}`}
                  </p>
                </div>
                <Badge variant="success">active</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            No active run-log API key exists for this workflow.
          </p>
        )}

        {rotateState?.apiKey ? (
          <label className="block text-sm font-medium">
            New API key
            <textarea
              readOnly
              value={rotateState.apiKey}
              rows={2}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none"
            />
          </label>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <form action={rotateAction}>
            <input type="hidden" name="workflowId" value={workflowId} />
            <FormSubmitButton type="submit" size="sm" pendingLabel="Rotating...">
              Rotate key
            </FormSubmitButton>
          </form>
          <form action={revokeAction}>
            <input type="hidden" name="workflowId" value={workflowId} />
            <FormSubmitButton
              type="submit"
              size="sm"
              variant="secondary"
              pendingLabel="Revoking..."
              disabled={!activeKeys.length}
              confirmMessage="Revoke all active run-log API keys for this workflow?"
            >
              Revoke active keys
            </FormSubmitButton>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
