import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { api } from "../lib/api";

export const WhatsAppButton = () => {
  const [number, setNumber] = useState("919876543210");

  useEffect(() => {
    api.get("/config").then((r) => {
      if (r.data.support_whatsapp) setNumber(r.data.support_whatsapp);
    }).catch(() => {});
  }, []);

  const text = encodeURIComponent(
    "Hi GK GS Masti Store! I need help with a product / order / payment. Please assist."
  );

  return (
    <a
      data-testid="floating-whatsapp-btn"
      href={`https://wa.me/${number}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-white font-medium shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:shadow-xl hover:scale-105 transition-all"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline text-sm">Ask on WhatsApp</span>
    </a>
  );
};
