import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function PageFeedback({
  notice,
  error,
}: {
  notice?: string;
  error?: string;
}) {
  if (!notice && !error) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {notice ? (
        <p
          role="status"
          aria-live="polite"
          className="inline-flex items-start gap-2 rounded-lg bg-success-background p-3 text-sm text-success"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="inline-flex items-start gap-2 rounded-lg bg-danger-background p-3 text-sm text-danger"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
