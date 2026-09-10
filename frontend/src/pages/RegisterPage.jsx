import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SEO } from "../components/SEO";
import { formatApiError } from "../lib/api";

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", mobile: "", email: "", address: "", password: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created! Welcome to GK GS Masti Store.");
      navigate("/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    ["name", "Full Name", "text", "Rahul Kumar"],
    ["mobile", "Mobile Number (10 digits)", "tel", "9876543210"],
    ["email", "Email", "email", "you@example.com"],
    ["password", "Password (min 6 chars)", "password", "••••••••"],
  ];

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12" data-testid="register-page">
      <SEO title="Register" />
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <img src="/logo.png" alt="GK GS Masti" className="mx-auto h-16 w-16 rounded-full object-cover ring-2 ring-amber-500/70" />
          <h1 className="font-heading mt-4 text-2xl font-extrabold text-slate-900">Create Account</h1>
          <p className="mt-1 text-sm text-slate-500">Register to buy books and download PDF notes</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {fields.map(([key, label, type, ph]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
              <input
                data-testid={`register-${key}-input`}
                type={type}
                required
                value={form[key]}
                onChange={set(key)}
                placeholder={ph}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Address</label>
            <textarea
              data-testid="register-address-input"
              required
              rows={2}
              value={form.address}
              onChange={set("address")}
              placeholder="House no, street, city, state, pincode"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
          </div>
          <button
            type="submit"
            data-testid="register-submit-btn"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-red-600 hover:text-red-700" data-testid="goto-login-link">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
