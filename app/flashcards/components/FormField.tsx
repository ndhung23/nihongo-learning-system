import type { ChangeEvent } from "react";
import { RomajiKanaInput } from "./RomajiKanaInput";

export function FormField({
  label,
  name,
  placeholder,
  textarea,
  value,
  onChange,
  kanaSuggestions,
  onValueChange,
}: Readonly<{
  label: string;
  name?: string;
  placeholder: string;
  textarea?: boolean;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  kanaSuggestions?: boolean;
  onValueChange?: (value: string) => void;
}>) {
  const inputClassName = textarea
    ? "min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-all duration-300 focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10"
    : "h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none transition-all duration-300 focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10";

  return (
    <div className="mb-4 block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
      {kanaSuggestions && name && onValueChange ? (
        <RomajiKanaInput
          className={inputClassName}
          name={name}
          onValueChange={onValueChange}
          placeholder={placeholder}
          textarea={textarea}
          value={value || ""}
        />
      ) : textarea ? (
        <textarea
          className={inputClassName}
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <input
          className={inputClassName}
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          value={value}
        />
      )}
    </div>
  );
}
