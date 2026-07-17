import type { ChangeEvent } from "react";

export function FormField({
  label,
  name,
  placeholder,
  textarea,
  value,
  onChange,
}: Readonly<{
  label: string;
  name?: string;
  placeholder: string;
  textarea?: boolean;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}>) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
      {textarea ? (
        <textarea
          className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-all duration-300 focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10"
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <input
          className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none transition-all duration-300 focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10"
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          value={value}
        />
      )}
    </label>
  );
}
