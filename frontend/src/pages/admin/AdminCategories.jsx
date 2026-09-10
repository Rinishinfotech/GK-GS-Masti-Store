import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { api, formatApiError } from "../../lib/api";
import { useCategories } from "../../hooks/useCategories";

const AdminCategories = () => {
  const { notes, books, reload } = useCategories();
  const [name, setName] = useState("");
  const [group, setGroup] = useState("notes");
  const [saving, setSaving] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/admin/categories", { name: name.trim(), group });
      toast.success("Category added");
      setName("");
      await reload();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}" (${c.group})?`)) return;
    try {
      await api.delete(`/admin/categories/${c.id}`);
      toast.success("Category deleted");
      await reload();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const GroupList = ({ title, items }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-heading text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-400">No categories</p>}
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5" data-testid="admin-category-row">
            <div>
              <p className="text-sm font-semibold text-slate-800">{c.name}</p>
              <p className="text-xs text-slate-400">/category/{c.group}/{c.slug}</p>
            </div>
            <button onClick={() => remove(c)} className="p-2 text-slate-400 hover:text-red-600" data-testid="admin-delete-category-btn" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div data-testid="admin-categories-page">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Categories</h1>
      <p className="mt-1 text-sm text-slate-500">Categories appear in the homepage header dropdowns (Notes &amp; Books)</p>

      <form onSubmit={add} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex-1 min-w-48">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Category Name</label>
          <input
            data-testid="category-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bihar Police"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Group</label>
          <select
            data-testid="category-group-select"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
          >
            <option value="notes">Exam Notes</option>
            <option value="books">Exam Books</option>
          </select>
        </div>
        <button
          type="submit"
          data-testid="category-add-btn"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Category
        </button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GroupList title="Exam Notes Categories" items={notes} />
        <GroupList title="Exam Books Categories" items={books} />
      </div>
    </div>
  );
};

export default AdminCategories;
