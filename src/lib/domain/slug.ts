export const SLUG_FORMAT_MESSAGE =
  "Use lowercase letters, numbers, and single hyphens only.";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createSlug(value: string, fallback = "workspace"): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || fallback;
}

type ParseOptionalSlugResult =
  | { success: true; slug: string }
  | { success: false; message: string };

export function parseOptionalSlug({
  value,
  source,
  fallback = "workspace",
}: {
  value?: string;
  source: string;
  fallback?: string;
}): ParseOptionalSlugResult {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return { success: true, slug: createSlug(source, fallback) };
  }

  if (!SLUG_PATTERN.test(trimmed)) {
    return { success: false, message: SLUG_FORMAT_MESSAGE };
  }

  return { success: true, slug: trimmed };
}
