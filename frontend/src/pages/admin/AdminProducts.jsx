import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { api, inr, imgSrc, formatApiError } from "../../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const emptyForm = {
  title: "",
  description: "",
  category_id: "",
  type: "physical",
  price: "",
  discount_price: "",
  stock: 0,
  featured: false,
  cover: "",
  sample_pdf: "",
  full_pdf: "",
  spec_language: "Hindi",
  spec_pages: "",
  spec_edition: "2026",
};

const FileInput = ({ label, kind, onUploaded, testid }) => {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const handle = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd);
      onUploaded(data.path);
      setDone(true);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      <label
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-3 text-xs font-semibold transition-colors ${
          done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-500 hover:border-red-400 hover:text-red-600"
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Uploading..." : done ? "Uploaded" : `Choose ${label}`}
        <input type="file" className="hidden" data-testid={testid} onChange={handle} accept={kind === "cover" ? "image/*" : "application/pdf"} />
      </label>
    </div>
  );
};

const AdminProducts = () => {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get("/admin/products").then((r) => setProducts(r.data)).catch(() => setProducts([]));
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description || "",
      category_id: p.category_id,
      type: p.type,
      price: p.price,
      discount_price: p.discount_price || "",
      stock: p.stock,
      featured: !!p.featured,
      cover: p.cover || "",
      sample_pdf: p.sample_pdf || "",
      full_pdf: p.full_pdf || "",
      spec_language: p.specs?.language || "Hindi",
      spec_pages: p.specs?.pages || "",
      spec_edition: p.specs?.edition || "2026",
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category_id: form.category_id,
        type: form.type,
        price: parseFloat(form.price) || 0,
        discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
        stock: parseInt(form.stock) || 0,
        featured: form.featured,
        cover: form.cover,
        images: form.cover ? [form.cover] : [],
        sample_pdf: form.sample_pdf,
        full_pdf: form.full_pdf,
        specs: { language: form.spec_language, pages: form.spec_pages, publisher: "GK GS Masti", edition: form.spec_edition },
      };
      if (editing) {
        await api.put(`/admin/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/admin/products", payload);
        toast.success("Product created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try {
      await api.delete(`/admin/products/${p.id}`);
      toast.success("Product deleted");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const typeLabel = { physical: "Book", digital: "PDF", both: "Book+PDF" };

  const flatCats = (grp) => {
    const list = categories.filter((c) => c.group === grp);
    const out = [];
    const walk = (pid, depth) => {
      list
        .filter((c) => (c.parent_id || null) === pid)
        .forEach((c) => {
          out.push({ ...c, depth });
          walk(c.id, depth + 1);
        });
    };
    walk(null, 0);
    return out;
  };

  return (
    <div data-testid="admin-products-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Manage books, PDF notes, pricing and inventory</p>
        </div>
        <button
          data-testid="admin-add-product-btn"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {products === null ? (
        <p className="py-20 text-center text-slate-400">Loading...</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4">Product</th>
                <th className="p-4">Type</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Featured</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid="admin-product-row">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={imgSrc(p.cover || (p.images || [])[0])}
                        alt=""
                        className="h-11 w-11 rounded-lg object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = imgSrc(""); }}
                      />
                      <span className="font-semibold text-slate-900 line-clamp-1 max-w-56">{p.title}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{typeLabel[p.type]}</td>
                  <td className="p-4 font-semibold text-slate-900">
                    {inr(p.discount_price || p.price)}
                    {p.discount_price ? <span className="ml-1 text-xs text-slate-400 line-through">{inr(p.price)}</span> : null}
                  </td>
                  <td className="p-4 text-slate-600">{p.type === "digital" ? "∞" : p.stock}</td>
                  <td className="p-4">{p.featured ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">YES</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEdit(p)} className="p-2 text-slate-500 hover:text-red-600" data-testid="admin-edit-product-btn" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(p)} className="p-2 text-slate-500 hover:text-red-600" data-testid="admin-delete-product-btn" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-form-modal">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Title</label>
              <input
                data-testid="product-title-input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
              <textarea
                data-testid="product-description-input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Category</label>
                <select
                  data-testid="product-category-select"
                  required
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                >
                  <option value="">Select category</option>
                  <optgroup label="Class Notes">
                    {flatCats("notes").map((c) => (
                      <option key={c.id} value={c.id}>{c.depth > 0 ? "— ".repeat(c.depth) : ""}{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Exam Books">
                    {flatCats("books").map((c) => (
                      <option key={c.id} value={c.id}>{c.depth > 0 ? "— ".repeat(c.depth) : ""}{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Product Type</label>
                <select
                  data-testid="product-type-select"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                >
                  <option value="physical">Physical Book</option>
                  <option value="digital">Digital PDF</option>
                  <option value="both">Both (Book + PDF)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Regular Price (₹)</label>
                <input data-testid="product-price-input" required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Discount Price (₹, optional)</label>
                <input data-testid="product-discount-input" type="number" min="0" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
              </div>
              {form.type !== "digital" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Stock</label>
                  <input data-testid="product-stock-input" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Pages</label>
                <input data-testid="product-pages-input" value={form.spec_pages} onChange={(e) => setForm({ ...form, spec_pages: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FileInput label="Cover Image" kind="cover" testid="product-cover-upload" onUploaded={(path) => setForm((f) => ({ ...f, cover: path }))} />
              {(form.type === "digital" || form.type === "both") && (
                <>
                  <FileInput label="Sample PDF" kind="sample" testid="product-sample-upload" onUploaded={(path) => setForm((f) => ({ ...f, sample_pdf: path }))} />
                  <FileInput label="Full Locked PDF" kind="pdf" testid="product-pdf-upload" onUploaded={(path) => setForm((f) => ({ ...f, full_pdf: path }))} />
                </>
              )}
            </div>
            {form.cover && (
              <img src={imgSrc(form.cover)} alt="cover" className="h-24 w-24 rounded-xl object-cover border border-slate-200" onError={(e) => { e.target.onerror = null; e.target.src = imgSrc(""); }} />
            )}
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} data-testid="product-featured-checkbox" className="h-4 w-4 rounded accent-red-600" />
              Show in Featured sections on homepage
            </label>
            <button
              type="submit"
              data-testid="product-save-btn"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Update Product" : "Create Product"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
