"use client";

import { useId, useState, type TextareaHTMLAttributes } from "react";

type JsonTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const jsonValidationMessage = "Enter valid JSON or leave this field blank.";

export function JsonTextArea({ onInput, ...props }: JsonTextAreaProps) {
  const generatedId = useId();
  const errorId = props.id ? `${props.id}-error` : `${generatedId}-error`;
  const [error, setError] = useState("");
  const describedBy = [props["aria-describedby"], error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <>
      <textarea
        {...props}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? "true" : undefined}
        onInvalid={(event) => {
          setError(event.currentTarget.validationMessage || jsonValidationMessage);
          props.onInvalid?.(event);
        }}
        onInput={(event) => {
          const value = event.currentTarget.value.trim();

          if (value) {
            try {
              JSON.parse(value);
              event.currentTarget.setCustomValidity("");
              setError("");
            } catch {
              event.currentTarget.setCustomValidity(jsonValidationMessage);
              setError(jsonValidationMessage);
            }
          } else {
            event.currentTarget.setCustomValidity("");
            setError("");
          }

          onInput?.(event);
        }}
      />
      {error ? (
        <span id={errorId} role="alert" className="mt-1 block text-xs/5 font-normal text-danger">
          {error}
        </span>
      ) : null}
    </>
  );
}
