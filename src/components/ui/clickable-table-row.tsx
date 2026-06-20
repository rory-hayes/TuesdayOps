"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export const CLICKABLE_ROW_INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "details",
  "[role='button']",
  "[role='link']",
  "[data-clickable-row-ignore='true']",
].join(",");

type ClosestTarget = {
  closest?: (selector: string) => Element | null;
};

export function shouldIgnoreClickableRowEvent(
  target: EventTarget | null,
  currentTarget?: Element | null,
): boolean {
  const interactiveTarget = (target as ClosestTarget | null)?.closest?.(CLICKABLE_ROW_INTERACTIVE_SELECTOR);

  return Boolean(interactiveTarget && interactiveTarget !== currentTarget);
}

export function ClickableTableRow({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function navigate(event?: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) {
    if (event && isModifiedClick(event)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(href);
  }

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      shouldIgnoreClickableRowEvent(event.target, event.currentTarget)
    ) {
      return;
    }

    navigate(event);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (
      event.defaultPrevented ||
      shouldIgnoreClickableRowEvent(event.target, event.currentTarget) ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    event.preventDefault();
    navigate(event);
  }

  return (
    <tr
      aria-label={label}
      className={cn(
        "group cursor-pointer transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none",
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
    >
      {children}
    </tr>
  );
}

function isModifiedClick(event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) {
  return event.metaKey || event.ctrlKey;
}
