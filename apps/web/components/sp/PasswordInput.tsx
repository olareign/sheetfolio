"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

type Props = Omit<ComponentProps<"input">, "type">;

/**
 * The only way to render a password field. It carries the eye button that shows or hides what was typed,
 * which every password input in the product must have (a test fails if a raw `type="password"` appears elsewhere).
 * Takes the same props as an <input> except `type`, so `id`, `name`, `autoComplete` and `required` pass through.
 */
export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";
  return (
    <div className="sp-password">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Once the text is visible, keep phones from capitalising or autocorrecting it.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={["sp-input", className].filter(Boolean).join(" ")}
      />
      <button
        type="button"
        className="sp-password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
      >
        {visible ? (
          <EyeOff size={18} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Eye size={18} strokeWidth={1.5} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
