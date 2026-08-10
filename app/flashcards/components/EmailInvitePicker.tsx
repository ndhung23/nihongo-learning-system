"use client";

import { KeyboardEvent, useEffect, useState } from "react";
import { FiCheck, FiLoader, FiPlus, FiUser, FiX } from "react-icons/fi";

type FoundUser = { email: string; name: string; avatarUrl?: string };

export function EmailInvitePicker({ emails, onChange }: Readonly<{ emails: string[]; onChange: (emails: string[]) => void }>) {
  const [input, setInput] = useState("");
  const [found, setFound] = useState<FoundUser | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedEmail, setCheckedEmail] = useState("");

  useEffect(() => {
    const email = input.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || emails.includes(email)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setChecking(true);
      void fetch(`/api/users/email-lookup?email=${encodeURIComponent(email)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((payload: { data?: FoundUser | null }) => { setFound(payload.data || null); setCheckedEmail(email); })
        .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setCheckedEmail(email); })
        .finally(() => setChecking(false));
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [emails, input]);

  const currentFound = found?.email === input.trim().toLowerCase() ? found : null;

  function addFound() {
    if (!currentFound || emails.includes(currentFound.email)) return;
    onChange([...emails, currentFound.email]);
    setInput(""); setFound(null); setCheckedEmail("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === ",") && currentFound) { event.preventDefault(); addFound(); }
    if (event.key === "Backspace" && !input && emails.length) onChange(emails.slice(0, -1));
  }

  const normalizedInput = input.trim().toLowerCase();
  const invalid = checkedEmail === normalizedInput && Boolean(normalizedInput) && !currentFound;

  return <div>
    <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 focus-within:border-teal-400">
      {emails.map((email) => <span className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm font-black text-teal-800" key={email}><FiCheck /> {email}<button aria-label={`Xóa ${email}`} className="text-teal-600 hover:text-rose-600" onClick={() => onChange(emails.filter((item) => item !== email))} type="button"><FiX /></button></span>)}
      <input className="h-9 min-w-52 flex-1 bg-transparent px-2 text-sm font-semibold outline-none" onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder={emails.length ? "Thêm email khác..." : "Nhập email tài khoản..."} type="email" value={input} />
      {checking && <FiLoader className="mr-2 animate-spin text-teal-600" />}
    </div>
    {currentFound && <button className="mt-2 flex w-full items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-left hover:bg-teal-100" onClick={addFound} type="button"><span className="grid h-9 w-9 place-items-center rounded-full bg-white text-teal-700"><FiUser /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{currentFound.name}</strong><span className="block truncate text-xs font-semibold text-teal-700">{currentFound.email}</span></span><FiPlus className="text-teal-700" /></button>}
    {invalid && <p className="mt-2 text-sm font-bold text-rose-600">Email này chưa tồn tại trong hệ thống.</p>}
    <p className="mt-2 text-xs font-semibold text-slate-500">Nhập email, chờ tài khoản hiện ra rồi bấm để thêm. Có thể thêm nhiều người.</p>
  </div>;
}
