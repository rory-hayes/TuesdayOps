"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FieldError } from "@/components/ui/validated-form";
import { cn } from "@/lib/utils";

export const PASSWORD_PATTERN = "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{12,}";

type AuthTextFieldProps = {
  label: string;
  name: string;
  type?: "email" | "text";
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  description?: ReactNode;
};

export function AuthTextField({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  minLength,
  description,
}: AuthTextFieldProps) {
  const inputId = useId();
  const descriptionId = useId();
  const describedBy = description ? descriptionId : undefined;

  return (
    <div className="grid gap-2 text-sm/6 font-medium text-zinc-950">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        required={required}
        name={name}
        type={type}
        minLength={minLength}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        data-field-label={label}
        className={authInputClassName}
      />
      {description ? (
        <span id={descriptionId} className="text-xs/5 font-normal text-zinc-500">
          {description}
        </span>
      ) : null}
      <FieldError name={name} />
    </div>
  );
}

type AuthPasswordFieldProps = {
  label: string;
  name: string;
  autoComplete: string;
  minLength?: number;
  pattern?: string;
  title?: string;
  description?: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  customValidity?: string;
};

export function AuthPasswordField({
  label,
  name,
  autoComplete,
  minLength = 8,
  pattern,
  title,
  description,
  value,
  onValueChange,
  customValidity = "",
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const descriptionId = useId();
  const describedBy = description ? descriptionId : undefined;

  useEffect(() => {
    inputRef.current?.setCustomValidity(customValidity);
  }, [customValidity]);

  return (
    <div className="grid gap-2 text-sm/6 font-medium text-zinc-950">
      <label htmlFor={inputId}>{label}</label>
      <span className="relative">
        <input
          id={inputId}
          ref={inputRef}
          required
          name={name}
          type={visible ? "text" : "password"}
          minLength={minLength}
          pattern={pattern}
          title={title}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          data-field-label={label}
          value={value}
          onChange={(event) => onValueChange?.(event.currentTarget.value)}
          className={cn(authInputClassName, "pr-11")}
        />
        <button
          type="button"
          aria-label={visible ? "Hide entered characters" : "Show entered characters"}
          title={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </span>
      {description ? (
        <span id={descriptionId} className="text-xs/5 font-normal text-zinc-500">
          {description}
        </span>
      ) : null}
      <FieldError name={name} />
    </div>
  );
}

const authInputClassName =
  "h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10 disabled:bg-zinc-50 disabled:text-zinc-500";
