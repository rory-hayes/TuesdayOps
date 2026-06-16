const DANGEROUS_BLOCK_PATTERN =
  /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const DANGEROUS_TAG_PATTERN =
  /<\/?(?:script|style|iframe|object|embed|svg|math|img|link|meta|base|form|input|button|textarea|select|option|video|audio|source)\b[^>]*>/gi;
const EVENT_HANDLER_PATTERN = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL_PATTERN = /\bjavascript\s*:/gi;
const SCRIPT_CALL_PATTERN = /\b(?:alert|confirm|prompt)\s*\([^)]*\)/gi;

export function sanitizeReportText(value: string): string {
  return value
    .replace(DANGEROUS_BLOCK_PATTERN, " [redacted] ")
    .replace(DANGEROUS_TAG_PATTERN, " ")
    .replace(EVENT_HANDLER_PATTERN, " ")
    .replace(JAVASCRIPT_URL_PATTERN, "")
    .replace(SCRIPT_CALL_PATTERN, "[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^,\s)]+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .trim();
}
