"use client";

import {
  createContext,
  useContext,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";

type FormErrors = Record<string, string>;

const FormValidationContext = createContext<FormErrors>({});

type ValidatedFormProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
};

export function ValidatedForm({
  children,
  onChange,
  onSubmit,
  noValidate = true,
  ...props
}: ValidatedFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});

  function handleChange(event: ChangeEvent<HTMLFormElement>) {
    onChange?.(event);

    const form = event.currentTarget;
    const control = getValidatableControl(event.target);

    if (!control || control.form !== form || !errors[control.name]) {
      return;
    }

    const nextErrors = { ...errors };

    if (control.validity.valid) {
      delete nextErrors[control.name];
    } else {
      nextErrors[control.name] = getValidationMessage(control);
    }

    applyErrorAttributes(form, nextErrors);
    setErrors(nextErrors);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const nextErrors = collectFormErrors(form);

    applyErrorAttributes(form, nextErrors);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      event.preventDefault();
      focusFirstInvalidField(form, nextErrors);
      return;
    }

    onSubmit?.(event);
  }

  return (
    <FormValidationContext.Provider value={errors}>
      <form {...props} noValidate={noValidate} onChange={handleChange} onSubmit={handleSubmit}>
        {children}
      </form>
    </FormValidationContext.Provider>
  );
}

export function FieldError({ name, id = `${name}-error` }: { name: string; id?: string }) {
  const error = useFieldError(name);

  if (!error) {
    return null;
  }

  return (
    <p id={id} role="alert" className="text-xs/5 font-normal text-danger">
      {error}
    </p>
  );
}

export function useFieldError(name: string) {
  return useContext(FormValidationContext)[name];
}

function collectFormErrors(form: HTMLFormElement): FormErrors {
  const errors: FormErrors = {};

  for (const control of getValidatableControls(form)) {
    if (control.validity.valid) {
      continue;
    }

    errors[control.name] = getValidationMessage(control);
  }

  return errors;
}

function getValidatableControls(form: HTMLFormElement) {
  return Array.from(form.elements)
    .map((element) => getValidatableControl(element))
    .filter((element): element is ValidatableControl => Boolean(element));
}

function getValidatableControl(element: EventTarget | Element | null): ValidatableControl | null {
  if (
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    )
  ) {
    return null;
  }

  if (!element.name || !element.willValidate) {
    return null;
  }

  return element;
}

function getValidationMessage(control: ValidatableControl): string {
  const label = control.dataset.fieldLabel || humanizeFieldName(control.name);
  const validity = control.validity;

  if (validity.valueMissing) {
    return `${label} is required.`;
  }

  if (validity.typeMismatch) {
    return control.type === "email"
      ? `Enter a valid email address for ${label}.`
      : `Enter a valid URL for ${label}.`;
  }

  if (validity.tooShort) {
    return `${label} must be at least ${getMinLength(control)} characters.`;
  }

  if (validity.tooLong) {
    return `${label} must be ${getMaxLength(control)} characters or fewer.`;
  }

  if (validity.rangeUnderflow && "min" in control) {
    return `${label} must be at least ${control.min}.`;
  }

  if (validity.rangeOverflow && "max" in control) {
    return `${label} must be ${control.max} or less.`;
  }

  if (validity.patternMismatch) {
    return control.title || `${label} format is invalid.`;
  }

  if (validity.badInput) {
    return `Enter a valid value for ${label}.`;
  }

  return control.validationMessage || `Check ${label} and try again.`;
}

function applyErrorAttributes(form: HTMLFormElement, errors: FormErrors) {
  for (const control of getValidatableControls(form)) {
    const baseDescription = control.dataset.baseDescribedBy ?? control.getAttribute("aria-describedby") ?? "";
    control.dataset.baseDescribedBy = baseDescription;

    if (!errors[control.name]) {
      control.removeAttribute("aria-invalid");
      setDescribedBy(control, baseDescription);
      continue;
    }

    control.setAttribute("aria-invalid", "true");
    setDescribedBy(control, [baseDescription, `${control.name}-error`].filter(Boolean).join(" "));
  }
}

function setDescribedBy(control: ValidatableControl, value: string) {
  if (value) {
    control.setAttribute("aria-describedby", value);
  } else {
    control.removeAttribute("aria-describedby");
  }
}

function focusFirstInvalidField(form: HTMLFormElement, errors: FormErrors) {
  const firstInvalid = getValidatableControls(form).find((control) => errors[control.name]);
  firstInvalid?.focus();
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type ValidatableControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function getMinLength(control: ValidatableControl): number {
  return control instanceof HTMLSelectElement ? 0 : control.minLength;
}

function getMaxLength(control: ValidatableControl): number {
  return control instanceof HTMLSelectElement ? 0 : control.maxLength;
}
