"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";

type FormErrors = Record<string, string>;

const FormValidationContext = createContext<FormErrors>({});
const emptyFormErrors: FormErrors = {};
const emptyDismissedNames: Record<string, true> = {};
const emptyDismissedServerErrors = {
  source: emptyFormErrors,
  names: emptyDismissedNames,
};

type ValidatedFormProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  serverErrors?: FormErrors;
};

export function ValidatedForm({
  children,
  onChange,
  onSubmit,
  noValidate = true,
  serverErrors = emptyFormErrors,
  ...props
}: ValidatedFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [clientErrors, setClientErrors] = useState<FormErrors>({});
  const [dismissedServerErrors, setDismissedServerErrors] = useState<{
    source: FormErrors;
    names: Record<string, true>;
  }>(emptyDismissedServerErrors);
  const activeDismissedServerErrors = dismissedServerErrors.source === serverErrors
    ? dismissedServerErrors.names
    : emptyDismissedNames;
  const errors = useMemo(
    () => ({
      ...getVisibleServerErrors(serverErrors, activeDismissedServerErrors),
      ...clientErrors,
    }),
    [activeDismissedServerErrors, clientErrors, serverErrors],
  );

  useEffect(() => {
    if (formRef.current) {
      applyErrorAttributes(formRef.current, errors);
    }
  }, [errors]);

  function handleChange(event: ChangeEvent<HTMLFormElement>) {
    onChange?.(event);

    const form = event.currentTarget;
    const control = getValidatableControl(event.target);

    if (!control || control.form !== form) {
      return;
    }

    setClientErrors((current) => {
      const next = { ...current };

      if (control.validity.valid) {
        delete next[control.name];
      } else if (current[control.name]) {
        next[control.name] = getValidationMessage(control);
      }

      return next;
    });

    setDismissedServerErrors((current) => {
      const currentNames = current.source === serverErrors ? current.names : emptyDismissedNames;

      if (control.validity.valid && serverErrors[control.name]) {
        return {
          source: serverErrors,
          names: { ...currentNames, [control.name]: true },
        };
      }

      if (!control.validity.valid && currentNames[control.name]) {
        const next = { ...currentNames };
        delete next[control.name];
        return {
          source: serverErrors,
          names: next,
        };
      }

      return current.source === serverErrors ? current : { source: serverErrors, names: currentNames };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const nextErrors = collectFormErrors(form);

    applyErrorAttributes(form, nextErrors);
    setClientErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      event.preventDefault();
      focusFirstInvalidField(form, nextErrors);
      return;
    }

    onSubmit?.(event);
  }

  return (
    <FormValidationContext.Provider value={errors}>
      <form {...props} ref={formRef} noValidate={noValidate} onChange={handleChange} onSubmit={handleSubmit}>
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
    return control.dataset.minMessage || `${label} must be at least ${control.min}.`;
  }

  if (validity.rangeOverflow && "max" in control) {
    return control.dataset.maxMessage || `${label} must be ${control.max} or less.`;
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

function getVisibleServerErrors(
  serverErrors: FormErrors,
  dismissedServerErrors: Record<string, true>,
): FormErrors {
  return Object.fromEntries(
    Object.entries(serverErrors).filter(([name]) => !dismissedServerErrors[name]),
  );
}
