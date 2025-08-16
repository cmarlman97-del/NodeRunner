// src/pages/contacts-page.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

type Contact = {
  id: string;
  name: string;
  contactType?: string | null;
};

export default function ContactsPage() {
  const { data, isLoading, isError } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => fetch("/api/contacts").then((r) => r.json()),
  });

  if (isLoading) return <div className="p-6">Loading contacts…</div>;
  if (isError) return <div className="p-6">Failed to load contacts.</div>;

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Contacts</h1>
      {data?.map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <Link href={`/contacts/${c.id}`} className="text-blue-600 hover:underline">
            {c.name}
          </Link>
          <span className="text-sm text-slate-500">· {c.contactType ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}
