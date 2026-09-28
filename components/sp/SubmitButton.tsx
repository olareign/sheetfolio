"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonSize, type ButtonVariant } from "./Button";

/** Submit button that disables itself while its form's Server Action is running. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
