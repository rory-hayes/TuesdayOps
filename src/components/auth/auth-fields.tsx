"use client";

import { useState, type ChangeEventHandler, type HTMLInputTypeAttribute } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10";

type AuthInputFieldProps = {
  id: string;
  label: string;
  name: string;
  type: HTMLInputTypeAttribute;
  autoComplete: string;
  error?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  minLength?: number;
  description?: string;
};

export function AuthInputField({
  id,
  label,
  name,
  type,
  autoComplete,
  error,
  value,
  onChange,
  required = true,
  minLength,
  description,
}: AuthInputFieldProps) {
  const showDescription = Boolean(description && description !== error);
  const descriptionId = showDescription ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");

  return (
    <div className="grid gap-2 text-sm/6 font-medium text-zinc-950">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        required={required}
        name={name}
        type={type}
        minLength={minLength}
        autoComplete={autoComplete}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy || undefined}
        value={value}
        onChange={onChange}
        className={inputClassName}
      />
      {showDescription ? (
        <span id={descriptionId} className="text-xs/5 font-normal text-zinc-500">
          {description}
        </span>
      ) : null}
      <AuthFieldError id={errorId} error={error} />
    </div>
  );
}

type AuthPasswordFieldProps = Omit<AuthInputFieldProps, "type"> & {
  revealLabel: string;
};

export function AuthPasswordField({
  id,
  label,
  name,
  autoComplete,
  error,
  value,
  onChange,
  required = true,
  minLength,
  description,
  revealLabel,
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const showDescription = Boolean(description && description !== error);
  const descriptionId = showDescription ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");
  const actionLabel = visible ? "Hide entered characters" : "Show entered characters";
  const titleLabel = `${actionLabel} for ${revealLabel}`;

  return (
    <div className="grid gap-2 text-sm/6 font-medium text-zinc-950">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          required={required}
          name={name}
          type={visible ? "text" : "password"}
          minLength={minLength}
          autoComplete={autoComplete}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy || undefined}
          value={value}
          onChange={onChange}
          className={cn(inputClassName, "w-full pr-11")}
        />
        <button
          type="button"
          aria-label={actionLabel}
          aria-controls={id}
          aria-pressed={visible}
          title={titleLabel}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-1 right-1 inline-grid size-8 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {showDescription ? (
        <span id={descriptionId} className="text-xs/5 font-normal text-zinc-500">
          {description}
        </span>
      ) : null}
      <AuthFieldError id={errorId} error={error} />
    </div>
  );
}

function AuthFieldError({ id, error }: { id?: string; error?: string }) {
  if (!error) {
    return null;
  }

  return (
    <p id={id} role="alert" className="text-xs/5 font-normal text-danger">
      {error}
    </p>
  );
}
