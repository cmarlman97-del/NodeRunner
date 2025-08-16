import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Contact } from "@shared/schema";
import Header from "@/components/header";
import ContactForm from "@/components/contact-form";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus, X } from "lucide-react";
import { Link } from "wouter"; // ✅ NEW

// --- API helper for PATCH ---
async function patchContact(id: string, data: Partial<Contact>) {
  const res = await fetch(`/api/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update contact");
  return (await res.json()) as Contact;
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  const [newType, setNewType] = useState("");

  // slide-over state (mounted for exit animation)
  const [formMounted, setFormMounted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const openForm = () => {
    setFormMounted(true);
    requestAnimationFrame(() => setFormOpen(true)); // allow transition
  };
  const closeForm = () => {
    setFormOpen(false);
    setTimeout(() => setFormMounted(false), 300); // match duration classes
  };

  // Esc closes panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && formOpen) closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  const qc = useQueryClient(); // ✅ for prefetch below

  const { data: contacts = [], isLoading, error } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  // Contact types (defaults + from data)
  const contactTypes = useMemo(() => {
    const set = new Set<string>(["Broker", "Owner", "Lender", "Investor", "Vendor"]);
    contacts.forEach((c) => {
      const t = (c as any).contactType as string | undefined;
      if (t && t.trim()) set.add(t.trim());
    });
    return Array.from(set);
  }, [contacts]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) =>
      patchContact(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contacts"] });
      setEditingId(null);
      setEditForm({});
      setNewType("");
    },
  });

  // Search
  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    const has = (v?: string | null) => (v ?? "").toLowerCase().includes(q);
    return contacts.filter((c) =>
      has(c.name) ||
      has((c as any).contactType) ||
      has(c.email) ||
      has(c.phone) ||
      has(c.company) ||
      has((c as any).city) ||
      has((c as any).state)
    );
  }, [contacts, searchQuery]);

  // Inline edit handlers
  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name,
      email: c.email,
      phone: c.phone ?? "",
      company: c.company ?? "",
      contactType: (c as any).contactType ?? "",
      city: (c as any).city ?? "",
      state: (c as any).state ?? "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setNewType("");
  };
  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, data: editForm });
  };

  const bind = (key: keyof Contact | "contactType" | "city" | "state") => ({
    value: (editForm as any)[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEditForm((prev) => ({ ...prev, [key]: e.target.value })),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") saveEdit(editingId!);
      if (e.key === "Escape") cancelEdit();
    },
  });

  const addNewType = () => {
    const t = newType.trim();
    if (!t) return;
    setEditForm((prev) => ({ ...prev, contactType: t }));
    setNewType("");
  };

  // Called when ContactForm successfully creates a contact
  const handleCreated = () => {
    qc.invalidateQueries({ queryKey: ["/api/contacts"] });
    closeForm();
  };

  // ✅ Prefetch detail for snappier nav
  const prefetchContact = (id: string) => () =>
    qc.prefetchQuery({
      queryKey: ["contact", id],
      queryFn: () => fetch(`/api/contacts/${id}`).then((r) => r.json()),
      staleTime: 10_000,
    });

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header contactCount={contacts.length} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Contacts</h2>
            <p className="text-gray-600">Manage and organize your contact list</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search contacts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Filters (coming soon)"
            >
              <Filter className="h-4 w-4" />
            </button>

            {/* Open slide-over */}
            <button
              onClick={openForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add New Contact
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact Type</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3 w-32">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-6 text-gray-500">Loading…</td></tr>
              )}
              {error && !isLoading && (
                <tr><td colSpan={8} className="px-4 py-6 text-red-600">Failed to load contacts.</td></tr>
              )}
              {!isLoading && !error && filteredContacts.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-gray-500">No contacts match your search.</td></tr>
              )}

              {!isLoading && !error && filteredContacts.map((c) => {
                const isEditing = editingId === c.id;

                if (!isEditing) {
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      {/* ✅ Name is now a link that prefetches */}
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/contacts/${c.id}`}
                          onMouseEnter={prefetchContact(c.id)}
                          className="text-blue-600 hover:underline cursor-pointer"
                        >
                          {c.name}
                        </Link>
                      </td>

                      <td className="px-4 py-3">{(c as any).contactType ?? ""}</td>
                      <td className="px-4 py-3">
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="text-primary-600 hover:underline">
                            {c.email}
                          </a>
                        ) : ""}
                      </td>
                      <td className="px-4 py-3">{c.phone ?? ""}</td>
                      <td className="px-4 py-3">{c.company ?? ""}</td>
                      <td className="px-4 py-3">{(c as any).city ?? ""}</td>
                      <td className="px-4 py-3">{(c as any).state ?? ""}</td>
                      <td className="px-4 py-3 space-x-2">
                        <button
                          className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                          onClick={() => startEdit(c)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                }

                // Editing row
                return (
                  <tr key={c.id} className="bg-yellow-50">
                    <td className="px-4 py-2">
                      <input className="w-full border rounded px-2 py-1" {...bind("name")} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <select className="w-full border rounded px-2 py-1" {...(bind("contactType") as any)}>
                          <option value="">— Select —</option>
                          {contactTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input
                          className="w-32 border rounded px-2 py-1"
                          placeholder="New type"
                          value={newType}
                          onChange={(e) => setNewType(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addNewType()}
                        />
                        <button
                          type="button"
                          className="px-2 py-1 border rounded bg-white hover:bg-gray-50"
                          onClick={addNewType}
                          title="Add and select new type"
                        >
                          Add
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2"><input className="w-full border rounded px-2 py-1" {...bind("email")} /></td>
                    <td className="px-4 py-2"><input className="w-full border rounded px-2 py-1" {...bind("phone")} /></td>
                    <td className="px-4 py-2"><input className="w-full border rounded px-2 py-1" {...bind("company")} /></td>
                    <td className="px-4 py-2"><input className="w-full border rounded px-2 py-1" {...bind("city")} /></td>
                    <td className="px-4 py-2"><input className="w-full border rounded px-2 py-1" {...bind("state")} /></td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        className="px-3 py-1 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                        onClick={() => saveEdit(c.id)}
                        disabled={updateMutation.isLoading}
                      >
                        {updateMutation.isLoading ? "Saving…" : "Save"}
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={cancelEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500">
          Showing {filteredContacts.length} of {contacts.length}
        </div>
      </div>

      {/* Slide-over (overlay) */}
      {formMounted && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            aria-label="Close"
            className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${formOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeForm}
          />
          {/* Panel */}
          <div
            className={`absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl transition-transform duration-300
                        ${formOpen ? "translate-x-0" : "translate-x-full"}`}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold">Add New Contact</h3>
              <button className="p-2 rounded hover:bg-gray-100" onClick={closeForm} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
              {/* IMPORTANT: ContactForm must call onCreated() on success, onCancel() when cancel is clicked */}
              <ContactForm onCreated={handleCreated} onCancel={closeForm} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
