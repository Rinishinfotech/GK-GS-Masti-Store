import { useState, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, CornerDownRight, ArrowUp, ArrowDown } from "lucide-react";
import { api, formatApiError } from "../../lib/api";
import { useCategories } from "../../hooks/useCategories";

const AdminCategories = () => {
  const { notes, books, reload } = useCategories();
  const [name, setName] = useState("");
  const [group, setGroup] = useState("notes");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/admin/categories", { name: name.trim(), group, parent_id: parentId || null });
      toast.success(parentId ? "Sub-category added" : "Category added");
      setName("");
      setParentId("");
      await reload();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const startSubCategory = (c) => {
    setGroup(c.group);
    setParentId(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => nameRef.current?.focus(), 300);
  };

  const remove = async (c) => {
    const hasChildren = [...notes, ...books].some((x) => x.parent_id === c.id);
    const msg = hasChildren
      ? `Delete category "${c.name}" and all its sub-categories?`
      : `Delete category "${c.name}" (${c.group})?`;
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/admin/categories/${c.id}`);
      toast.success("Category deleted");
      await reload();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const parentOptions = (group === "notes" ? notes : books).filter((c) => !c.parent_id);

  const move = async (siblings, idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= siblings.length) return;
    const ids = siblings.map((c) => c.id);
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    try {
      await api.post("/admin/categories/reorder", { ordered_ids: ids });
      await reload();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const MoveButtons = ({ siblings, idx }) => (
    <span className="flex flex-col">
      <button
        onClick={() => move(siblings, idx, -1)}
        disabled={idx === 0}
        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
        data-testid="category-move-up-btn"
        aria-label="Move up"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => move(siblings, idx, 1)}
        disabled={idx === siblings.length - 1}
        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
        data-testid="category-move-down-btn"
        aria-label="Move down"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
    </span>
  );

  const GroupList = ({ title, items }) => {
    const parents = items.filter((c) => !c.parent_id);
    const childrenOf = (pid) => items.filter((c) => c.parent_id === pid);
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-slate-900">{title}</h2>
        <div className="mt-3 space-y-2">
          {parents.length === 0 && <p className="text-sm text-slate-400">No categories</p>}
          {parents.map((c, idx) => (
            <div key={c.id}>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5" data-testid="admin-category-row">
                <div className="flex items-center gap-2">
                  <MoveButtons siblings={parents} idx={idx} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">/category/{c.group}/{c.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startSubCategory(c)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50"
                    data-testid="add-subcategory-btn"
                  >
                    <Plus className="h-3.5 w-3.5" /> Sub Category
                  </button>
                  <button onClick={() => remove(c)} className="p-2 text-slate-400 hover:text-red-600" data-testid="admin-delete-category-btn" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {childrenOf(c.id).map((s, sIdx) => (
                <div key={s.id} className="ml-6 mt-2 flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-2" data-testid="admin-subcategory-row">
                  <div className="flex items-center gap-2">
                    <MoveButtons siblings={childrenOf(c.id)} idx={sIdx} />
                    <CornerDownRight className="h-3.5 w-3.5 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{s.name}</p>
                      <p className="text-xs text-slate-400">/category/{s.group}/{s.slug}</p>
                    </div>
                  </div>
                  <button onClick={() => remove(s)} className="p-2 text-slate-400 hover:text-red-600" data-testid="admin-delete-subcategory-btn" aria-label="Delete sub-category">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="admin-categories-page">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Categories</h1>
      <p className="mt-1 text-sm text-slate-500">Categories and sub-categories appear in the homepage header dropdowns (Notes &amp; Books)</p>

      <form onSubmit={add} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex-1 min-w-48">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {parentId ? "Sub Category Name" : "Category Name"}
          </label>
          <input
            ref={nameRef}
            data-testid="category-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={parentId ? "e.g. Previous Year Papers" : "e.g. Bihar Police"}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Group</label>
          <select
            data-testid="category-group-select"
            value={group}
            onChange={(e) => { setGroup(e.target.value); setParentId(""); }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
          >
            <option value="notes">Exam Notes</option>
            <option value="books">Exam Books</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Parent Category (optional)</label>
          <select
            data-testid="category-parent-select"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
          >
            <option value="">None (top-level)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          data-testid="category-add-btn"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {parentId ? "Add Sub Category" : "Add Category"}
        </button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GroupList title="Class Notes" items={notes} />
        <GroupList title="Exam Books" items={books} />
      </div>
    </div>
  );
};

export default AdminCategories;
