"use client";

import type { TextareaHTMLAttributes } from "react";

type JsonTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function JsonTextArea({ onInput, ...props }: JsonTextAreaProps) {
  return (
    <textarea
      {...props}
      onInput={(event) => {
        const value = event.currentTarget.value.trim();

        if (value) {
          try {
            JSON.parse(value);
            event.currentTarget.setCustomValidity("");
          } catch {
            event.currentTarget.setCustomValidity("Enter valid JSON or leave this field blank.");
          }
        } else {
          event.currentTarget.setCustomValidity("");
        }

        onInput?.(event);
      }}
    />
  );
}
