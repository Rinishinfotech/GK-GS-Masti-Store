import { useState } from "react";
import { MapPin, Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";
import { api, inr, formatApiError } from "../lib/api";

export const PincodeChecker = ({ items, cod = false, onQuote, compact = false }) => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const check = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setResult({ serviceable: false, message: "Enter a valid 6-digit pincode" });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/shipping/check", { pincode: pin, items, cod });
      setResult(data);
      onQuote?.(data);
    } catch (err) {
      setResult({ serviceable: false, message: formatApiError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="pincode-checker">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            data-testid="pincode-input"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && check()}
            placeholder="Enter delivery pincode"
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </div>
        <button
          data-testid="pincode-check-btn"
          onClick={check}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Check
        </button>
      </div>

      {result && (
        <div
          data-testid="pincode-result"
          className={`mt-2.5 rounded-xl px-3.5 py-3 text-xs ${
            result.serviceable ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {result.digital_only ? (
            <p className="flex items-center gap-1.5 font-semibold">
              <Zap className="h-3.5 w-3.5" /> Digital order — instant PDF access, no delivery needed.
            </p>
          ) : result.serviceable ? (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Delivery available to {pin}
              </p>
              <p>
                {result.courier_name} • Shipping:{" "}
                <span className="font-bold">{result.shipping_fee === 0 ? "FREE" : inr(result.shipping_fee)}</span>
                {result.free_shipping && <span className="ml-1 font-semibold">(free shipping applied)</span>}
              </p>
              {(result.etd || result.estimated_days) && (
                <p>
                  Estimated delivery: <span className="font-semibold">{result.etd || `${result.estimated_days} days`}</span>
                </p>
              )}
              {!compact && result.weight && (
                <p className="text-emerald-600">
                  Package: {result.weight} kg • {result.dimensions.length}×{result.dimensions.breadth}×{result.dimensions.height} cm
                </p>
              )}
              {result.fallback && <p className="text-[10px] text-emerald-600">Standard rate applied</p>}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 font-semibold">
              <XCircle className="h-3.5 w-3.5" /> {result.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
