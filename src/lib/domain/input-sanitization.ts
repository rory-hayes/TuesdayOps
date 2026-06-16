const DANGEROUS_BLOCK_PATTERN = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const EVENT_HANDLER_PATTERN = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL_PATTERN = /\bjavascript\s*:/gi;
const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/gi;
const SCRIPT_CALL_PATTERN = /\b(?:alert|confirm|prompt)\s*\([^)]*\)/gi;

export function sanitizeUserText(value: string): string {
  return value
    .replace(DANGEROUS_BLOCK_PATTERN, " [redacted] ")
    .replace(EVENT_HANDLER_PATTERN, " ")
    .replace(JAVASCRIPT_URL_PATTERN, "")
    .replace(HTML_TAG_PATTERN, " ")
    .replace(SCRIPT_CALL_PATTERN, "[redacted]")
    .replace(/\s+/g, " ")
    .trim();
}
