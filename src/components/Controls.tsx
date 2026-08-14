import type { ReactNode } from "react";
import { Check } from "lucide-react";

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  optional?: boolean;
  suffix?: string;
  help?: string;
  min?: number;
  step?: number;
}

export function NumberField({
  label,
  value,
  onChange,
  optional = false,
  suffix,
  help,
  min = 0,
  step = 1,
}: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {optional && <span className="field-optional">Optional</span>}
      </span>
      <span className="input-wrap">
        <input
          type="number"
          min={min}
          step={step}
          value={value ?? ""}
          placeholder={optional ? "No limit" : "0"}
          onChange={(event) => {
            if (optional && event.target.value === "") {
              onChange(null);
              return;
            }
            onChange(Math.max(min, Number(event.target.value) || 0));
          }}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </span>
      {help && <span className="field-help">{help}</span>}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}

export function TextField({ label, value, onChange, help }: TextFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      {help && <span className="field-help">{help}</span>}
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  help?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  help,
}: SelectFieldProps<T>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {help && <span className="field-help">{help}</span>}
    </label>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string; description?: string }>;
}

export function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <fieldset className="segmented-field">
      <legend>{label}</legend>
      <div className="segmented" style={{ "--segments": options.length } as React.CSSProperties}>
        {options.map((option) => (
          <label key={option.value} className={value === option.value ? "segment active" : "segment"}>
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
            {option.description && <small>{option.description}</small>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ label, checked, onChange, description, disabled = false }: ToggleProps) {
  return (
    <label className={disabled ? "toggle-row disabled" : "toggle-row"}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb"><Check size={12} strokeWidth={3} /></span>
      </span>
    </label>
  );
}

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}

export function SectionHeading({ eyebrow, title, description, aside }: SectionHeadingProps) {
  return (
    <header className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside}
    </header>
  );
}
