// src/pages/contact-detail-page.tsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  contactType?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
};

// NOTE: wouter passes route params as a prop when using `component={...}`
// so we type it like this:
export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data: contact, isLoading, isError } = useQuery<Contact>({
    queryKey: ["contact", id],
    queryFn: () => fetch(`/api/contacts/${id}`).then((r) => r.json()),
  });

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (isError || !contact) return <div className="p-6">Contact not found.</div>;

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[360px,1fr]">
      {/* Left: Contact info */}
      <aside className="border-r bg-white p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">{contact.name}</h1>
          <p className="text-sm text-slate-500">{contact.contactType ?? "—"}</p>
        </div>
        <dl className="text-sm grid gap-3">
          <Info label="Company" value={contact.company ?? null} />
          <Info label="Email" value={contact.email ?? null} />
          <Info label="Phone" value={contact.phone ?? null} />
          <Info label="City" value={contact.city ?? null} />
          <Info label="State" value={contact.state ?? null} />
          <Info label="Website" value={contact.website ?? null} isLink />
        </dl>
      </aside>

      {/* Right: Activities (tabs) */}
      <section className="p-6">
        <ActivityTabs id={contact.id} />
      </section>
    </div>
  );
}

function Info({ label, value, isLink = false }: { label: string; value?: string | null; isLink?: boolean }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">
        {value
          ? isLink
            ? (
              <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {value}
              </a>
            )
            : value
          : "—"}
      </dd>
    </div>
  );
}

function ActivityTabs({ id }: { id: string }) {
  const [tab, setTab] = React.useState<"notes" | "tasks" | "calls">("notes");

  const notesQ = useQuery<any>({
    queryKey: ["notes", id],
    queryFn: () => fetch(`/api/contacts/${id}/notes`).then((r) => r.json()),
    enabled: tab === "notes",
  });
  const tasksQ = useQuery<any>({
    queryKey: ["tasks", id],
    queryFn: () => fetch(`/api/contacts/${id}/tasks`).then((r) => r.json()),
    enabled: tab === "tasks",
  });
  const callsQ = useQuery<any>({
    queryKey: ["calls", id],
    queryFn: () => fetch(`/api/contacts/${id}/calls`).then((r) => r.json()),
    enabled: tab === "calls",
  });

  return (
    <div className="flex flex-col h-full">
      <div className="border-b mb-4">
        {(["notes", "tasks", "calls"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 -mb-px border-b-2 ${tab === t ? "border-slate-900 font-semibold" : "border-transparent text-slate-500"}`}
          >
{t[0]?.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {tab === "notes" && <List q={notesQ} empty="No notes yet" />}
        {tab === "tasks" && <List q={tasksQ} empty="No tasks yet" />}
        {tab === "calls" && <List q={callsQ} empty="No calls yet" />}
      </div>
    </div>
  );
}

function List({ q, empty }: { q: any; empty: string }) {
  if (q.isLoading) return <div>Loading…</div>;
  const items = q.data?.items ?? [];
  if (!items.length) return <div className="text-slate-500">{empty}</div>;
  return (
    <ul className="space-y-3">
      {items.map((it: any) => (
        <li key={it.id} className="rounded border p-3">
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(it, null, 2)}</pre>
        </li>
      ))}
    </ul>
  );
}
