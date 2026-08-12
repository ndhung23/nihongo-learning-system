"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { FiArrowLeft, FiBookOpen, FiCheckSquare, FiEdit3, FiFolder, FiPlay, FiPlus, FiSearch, FiSquare, FiTrash2, FiX } from "react-icons/fi";
import { FuriganaText } from "../components/FuriganaText";
import { EmailInvitePicker } from "../components/EmailInvitePicker";

type AccessMode = "public" | "private" | "password" | "invite";
type PersonalDeck = { _id: string; title: string; description?: string; level?: string; coinPrice?: number; vocabularyCount: number; accessMode?: AccessMode; invitedEmails?: string[]; canEdit?: boolean; canAdd?: boolean };
type PersonalVocabulary = { _id: string; term: string; kana?: string; romaji?: string; meaningVi: string; examples?: Array<{ ja: string; vi?: string }> };

export function PersonalDecksClient() {
  const router = useRouter();
  const deckId = useSearchParams().get("deckId") || "";
  const [decks, setDecks] = useState<PersonalDeck[]>([]);
  const [communityDecks, setCommunityDecks] = useState<PersonalDeck[]>([]);
  const [items, setItems] = useState<PersonalVocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState("");
  const [accessMode, setAccessMode] = useState<AccessMode>("public");
  const [password, setPassword] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [level, setLevel] = useState("other");
  const [coinPrice, setCoinPrice] = useState("0");
  const [searchQuery, setSearchQuery] = useState("");
  const selectedDeck = decks.find((deck) => deck._id === deckId);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("vi");

  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/flashcards/my-vocabulary?deckId="]');
    links.forEach((link) => {
      const card = (link.closest("article") || link) as HTMLElement;
      card.hidden = Boolean(normalizedSearch) && !card.innerText.toLocaleLowerCase("vi").includes(normalizedSearch);
    });
  }, [normalizedSearch, decks, communityDecks]);

  useEffect(() => {
    let active = true;
    const url = deckId ? `/api/vocabulary?scope=mine&deckId=${encodeURIComponent(deckId)}` : "/api/personal-decks";
    void fetch(url, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as { data?: PersonalDeck[] | PersonalVocabulary[]; message?: string };
      if (!response.ok) throw new Error(payload.message || "Không thể tải dữ liệu.");
      if (!active) return;
      setError("");
      if (deckId) setItems((payload.data || []) as PersonalVocabulary[]);
      else setDecks((payload.data || []) as PersonalDeck[]);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deckId]);

  useEffect(() => {
    if (deckId) return;
    void fetch("/api/personal-decks?scope=community", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: PersonalDeck[] }) => setCommunityDecks(payload.data || []))
      .catch(() => setCommunityDecks([]));
  }, [deckId]);

  useEffect(() => {
    if (!deckId || selectedDeck) return;
    let active = true;
    void fetch(`/api/personal-decks?deckId=${encodeURIComponent(deckId)}`, { cache: "no-store" }).then((response) => response.json()).then((payload: { data?: PersonalDeck[] }) => {
      if (active) setDecks(payload.data || []);
    });
    return () => { active = false; };
  }, [deckId, selectedDeck]);

  async function createDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCreating(true); setError("");
    try {
      const response = await fetch(editingId ? `/api/personal-decks/${editingId}` : "/api/personal-decks", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, level, coinPrice: Number(coinPrice) || 0, accessMode, password: password || undefined, invitedEmails }) });
      const payload = await response.json() as { data?: PersonalDeck; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Không thể tạo bộ từ.");
      setDecks((current) => editingId ? current.map((deck) => deck._id === editingId ? payload.data! : deck) : [payload.data!, ...current]);
      closeForm();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Không thể tạo bộ từ."); }
    finally { setCreating(false); }
  }

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  function preparePractice(ids: string[]) { window.sessionStorage.setItem("nihongo-personal-study-selection", JSON.stringify(ids)); }
  function openCreate() { setEditingId(""); setTitle(""); setDescription(""); setLevel("other"); setCoinPrice("0"); setAccessMode("public"); setPassword(""); setInvitedEmails([]); setCreateOpen(true); }
  function openEdit(deck: PersonalDeck) { setEditingId(deck._id); setTitle(deck.title); setDescription(deck.description || ""); setLevel(deck.level === "custom" ? "other" : deck.level || "other"); setCoinPrice(String(deck.coinPrice || 0)); setAccessMode(deck.accessMode || "private"); setPassword(""); setInvitedEmails(deck.invitedEmails || []); setCreateOpen(true); }
  function closeForm() { setCreateOpen(false); setEditingId(""); setTitle(""); setDescription(""); setPassword(""); setInvitedEmails([]); }

  async function deleteDeck() {
    if (!editingId || !window.confirm(`Xóa bộ từ "${title}" và toàn bộ từ vựng bên trong?`)) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/personal-decks/${editingId}`, { method: "DELETE" });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Không thể xóa bộ từ.");
      setDecks((current) => current.filter((deck) => deck._id !== editingId));
      closeForm();
      if (deckId === editingId) router.push("/flashcards/my-vocabulary");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa bộ từ.");
    } finally {
      setDeleting(false);
    }
  }

  return <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Cá nhân</p><h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{deckId ? selectedDeck?.title || "Bộ từ vựng" : "Bộ từ của tôi"}</h1><p className="mt-3 max-w-2xl text-slate-500">{deckId ? selectedDeck?.description || "Thêm và luyện các từ trong bộ này." : "Tạo từng bộ theo chủ đề, sau đó mở bộ để thêm từ vựng."}</p></div>
      <div className="flex w-full flex-wrap items-center gap-3">{deckId ? <><Link className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 font-black text-slate-700" href="/flashcards/my-vocabulary"><FiArrowLeft /> Các bộ từ</Link><div className="ml-auto flex flex-wrap justify-end gap-3">{selectedDeck?.canEdit && <button className="inline-flex h-12 items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-5 font-black text-teal-800" onClick={() => openEdit(selectedDeck)} type="button"><FiEdit3 /> Sửa bộ</button>}{items.length > 0 && <Link className="inline-flex h-12 items-center gap-2 rounded-2xl bg-teal-600 px-5 font-black text-white" href={`/flashcards/study?scope=mine&mode=flashcard&deckId=${encodeURIComponent(deckId)}`} onClick={() => preparePractice(selectedIds.length ? selectedIds : items.map((item) => item._id))}><FiPlay /> {selectedIds.length ? `Luyện ${selectedIds.length} từ` : "Luyện cả bộ"}</Link>}{selectedDeck?.canEdit && <Link className="inline-flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-5 font-black text-white" href={`/flashcards/add?deckId=${encodeURIComponent(deckId)}`}><FiPlus /> Thêm từ</Link>}</div></> : <button className="ml-auto inline-flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-5 font-black text-white" onClick={openCreate} type="button"><FiPlus /> Thêm bộ mới</button>}</div>
    </div>
    {!deckId && <div className="mt-8 flex h-14 items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-lg shadow-slate-900/[0.03] focus-within:border-teal-400"><FiSearch className="shrink-0 text-slate-400"/><input className="ml-3 min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:text-slate-400" onChange={(event)=>setSearchQuery(event.target.value)} placeholder="Tìm bộ từ theo tên, mô tả hoặc cấp độ..." type="search" value={searchQuery}/>{searchQuery&&<button aria-label="Xóa tìm kiếm" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100" onClick={()=>setSearchQuery("")} type="button"><FiX/></button>}</div>}
    {loading && <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-10 text-center font-bold text-slate-500">Đang tải...</section>}
    {!loading && error && <section className="mt-8 rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-center font-bold text-rose-700">{error}</section>}
    {!loading && !error && !deckId && <><section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{decks.map((deck) => <article className="group relative rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.04] transition hover:-translate-y-1 hover:border-teal-300" key={deck._id}>{deck.canEdit && <button aria-label={`Sửa ${deck.title}`} className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-teal-100 hover:text-teal-700" onClick={() => openEdit(deck)} type="button"><FiEdit3 /></button>}<Link className="block" href={`/flashcards/my-vocabulary?deckId=${deck._id}`}><span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-2xl text-teal-700 group-hover:bg-teal-600 group-hover:text-white"><FiFolder /></span><h2 className="mt-5 text-xl font-black">{deck.title}</h2><p className="mt-2 min-h-10 text-sm text-slate-500">{deck.description || "Bộ từ vựng cá nhân"}</p><div className="mt-4 flex items-center justify-between"><p className="flex items-center gap-2 font-black text-teal-700"><FiBookOpen /> {deck.vocabularyCount} từ</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{accessModeLabel(deck.accessMode || "private")}</span></div></Link></article>)}{decks.length === 0 && <button className="min-h-64 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8" onClick={openCreate} type="button"><FiPlus className="mx-auto text-4xl text-teal-600" /><h2 className="mt-4 text-xl font-black">Tạo bộ từ đầu tiên</h2><p className="mt-2 text-sm text-slate-500">Bạn cần tạo bộ trước khi thêm từ.</p></button>}</section><CommunityDeckSection decks={communityDecks}/></>}
    {!loading && !error && deckId && <>{items.length > 0 && <div className="mt-8 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><button className="flex items-center gap-2 font-black" onClick={() => setSelectedIds(allSelected ? [] : items.map((item) => item._id))} type="button">{allSelected ? <FiCheckSquare /> : <FiSquare />} {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</button><span className="text-sm font-bold text-slate-500">Đã chọn {selectedIds.length}/{items.length} từ</span></div>}<section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => { const selected = selectedIds.includes(item._id); return <article className={`relative cursor-pointer rounded-[1.5rem] border bg-white p-5 shadow-xl ${selected ? "border-teal-500 ring-4 ring-teal-500/10" : "border-slate-200"}`} key={item._id} onClick={() => setSelectedIds((current) => current.includes(item._id) ? current.filter((id) => id !== item._id) : [...current, item._id])}>{selectedDeck?.canEdit&&<Link aria-label={`Sửa ${item.term}`} className="absolute right-12 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100" href={`/flashcards/add?deckId=${encodeURIComponent(deckId)}&vocabularyId=${encodeURIComponent(item._id)}`} onClick={(event)=>event.stopPropagation()}><FiEdit3/></Link>}<span className={`absolute right-4 top-4 text-xl ${selected ? "text-teal-600" : "text-slate-300"}`}>{selected ? <FiCheckSquare /> : <FiSquare />}</span><FuriganaText as="h2" className="pr-20 text-2xl font-black" text={item.term} reading={item.kana} />{(item.kana || item.romaji) && <p className="mt-1 text-sm font-bold text-slate-500">{[item.kana, item.romaji].filter(Boolean).join(" · ")}</p>}<p className="mt-4 font-black text-teal-700">{item.meaningVi}</p>{item.examples?.[0]?.ja && <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="font-bold">{item.examples[0].ja}</p>{item.examples[0].vi && <p className="mt-1 text-sm text-slate-500">{item.examples[0].vi}</p>}</div>}</article>; })}</section>{items.length === 0 && <section className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center"><FiBookOpen className="mx-auto text-4xl text-teal-600" /><h2 className="mt-4 text-2xl font-black">Bộ này chưa có từ</h2><p className="mt-2 text-slate-500">Nhấn “Thêm từ” để bắt đầu xây dựng bộ.</p></section>}</>}
    {createOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"><form className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl" onSubmit={createDeck}><div className="flex justify-between"><div><p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">Bộ từ cá nhân</p><h2 className="mt-2 text-3xl font-black">{editingId ? "Sửa bộ từ" : "Tạo bộ mới"}</h2></div><button className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" onClick={closeForm} type="button"><FiX /></button></div><label className="mt-6 block"><span className="mb-2 block text-sm font-black">Tên bộ</span><input autoFocus className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-teal-400" onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Từ vựng đi du lịch" required value={title} /></label><label className="mt-4 block"><span className="mb-2 block text-sm font-black">Mô tả</span><textarea className="min-h-20 w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-teal-400" onChange={(event) => setDescription(event.target.value)} value={description} /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-black">Cấp độ</span><select className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold" onChange={(event)=>setLevel(event.target.value)} value={level}><option value="n5">N5</option><option value="n4">N4</option><option value="n3">N3</option><option value="n2">N2</option><option value="n1">N1</option><option value="other">Khác</option></select></label><label className="block"><span className="mb-2 block text-sm font-black">Giá (xu)</span><input className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold" inputMode="numeric" min="0" onChange={(event)=>setCoinPrice(event.target.value.replace(/\D/g,""))} step="1" type="number" value={coinPrice}/><span className="mt-1 block text-xs font-semibold text-slate-400">Nhập 0 nếu muốn chia sẻ miễn phí.</span></label></div><label className="mt-4 block"><span className="mb-2 block text-sm font-black">Quyền truy cập</span><select className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold" onChange={(event) => setAccessMode(event.target.value as AccessMode)} value={accessMode}><option value="public">Công khai</option><option value="private">Riêng tư</option><option value="password">Bằng mật khẩu</option><option value="invite">Chia sẻ qua email</option></select></label>{accessMode === "password" && <label className="mt-4 block"><span className="mb-2 block text-sm font-black">Mật khẩu {editingId && "(để trống nếu giữ mật khẩu cũ)"}</span><input className="h-12 w-full rounded-2xl border border-slate-200 px-4" minLength={editingId ? undefined : 4} onChange={(event) => setPassword(event.target.value)} required={!editingId} type="password" value={password} /></label>}{accessMode === "invite" && <div className="mt-4"><span className="mb-2 block text-sm font-black">Người được truy cập</span><EmailInvitePicker emails={invitedEmails} onChange={setInvitedEmails} /></div>}<div className="mt-6 flex flex-wrap justify-between gap-3">{editingId ? <button className="inline-flex h-12 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60" disabled={creating || deleting} onClick={deleteDeck} type="button"><FiTrash2 /> {deleting ? "Đang xóa..." : "Xóa bộ"}</button> : <span />}<div className="flex gap-3"><button className="h-12 rounded-2xl border px-5 font-black" disabled={deleting} onClick={closeForm} type="button">Hủy</button><button className="h-12 rounded-2xl bg-rose-600 px-6 font-black text-white disabled:opacity-60" disabled={creating || deleting} type="submit">{creating ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo bộ"}</button></div></div></form></div>}
  </div>;
}

function accessModeLabel(mode: AccessMode) { return { public: "Công khai", private: "Riêng tư", password: "Mật khẩu", invite: "Theo email" }[mode]; }

function CommunityDeckSection({decks}:{decks:PersonalDeck[]}){return <section className="mt-14 border-t border-slate-200 pt-9"><div><p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">Cộng đồng</p><h2 className="mt-2 text-3xl font-black text-slate-950">Từ vựng cộng đồng</h2><p className="mt-2 text-sm font-semibold text-slate-500">Các bộ từ công khai được chia sẻ bởi những người học khác.</p></div>{decks.length?<div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{decks.map(deck=><Link className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.04] transition hover:-translate-y-1 hover:border-teal-300" href={`/flashcards/my-vocabulary?deckId=${deck._id}`} key={deck._id}><span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-2xl text-teal-700 group-hover:bg-teal-600 group-hover:text-white"><FiBookOpen/></span><div className="mt-5 flex items-start justify-between gap-3"><h3 className="text-xl font-black">{deck.title}</h3><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{deck.coinPrice?`${deck.coinPrice.toLocaleString("vi-VN")} xu`:"Miễn phí"}</span></div><p className="mt-2 min-h-10 text-sm text-slate-500">{deck.description||"Bộ từ vựng cộng đồng"}</p><div className="mt-4 flex items-center justify-between text-sm font-black"><span className="text-teal-700">{deck.vocabularyCount} từ</span><span className="uppercase text-slate-500">{deck.level==="custom"?"Khác":deck.level||"Khác"}</span></div></Link>)}</div>:<div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center font-bold text-slate-500">Chưa có bộ từ công khai từ cộng đồng.</div>}</section>}
