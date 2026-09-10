import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";

export const Footer = () => (
  <footer className="mt-16 border-t border-slate-200 bg-white" data-testid="footer">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-3">
      <div>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="GK GS Masti Store" className="h-14 w-14 rounded-full object-cover ring-2 ring-amber-500/70" />
          <div>
            <p className="font-heading font-extrabold text-red-600 text-lg leading-tight">GK GS MASTI</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Official Store</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500 leading-relaxed">
          India &amp; Bihar's trusted store for competitive exam books and instant PDF notes. Prepare smarter for Bihar Daroga, Bihar Police, BPSC Teacher, BSSC, Railway and SSC GD.
        </p>
      </div>
      <div>
        <h3 className="font-heading font-bold text-slate-900 mb-4">Useful Links</h3>
        <ul className="space-y-2.5 text-sm text-slate-500">
          <li><Link to="/about" className="hover:text-red-600 transition-colors" data-testid="footer-about">About Us</Link></li>
          <li><Link to="/account" className="hover:text-red-600 transition-colors" data-testid="footer-account">My Account</Link></li>
          <li><Link to="/privacy-policy" className="hover:text-red-600 transition-colors" data-testid="footer-privacy">Privacy Policy</Link></li>
          <li><Link to="/refund-policy" className="hover:text-red-600 transition-colors" data-testid="footer-refund">Refund &amp; Cancellations</Link></li>
          <li><Link to="/terms" className="hover:text-red-600 transition-colors" data-testid="footer-terms">Terms &amp; Conditions</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="font-heading font-bold text-slate-900 mb-4">Contact Us</h3>
        <ul className="space-y-3 text-sm text-slate-500">
          <li className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
            <span>GK GS Masti Store, Main Road, Patna, Bihar - 800001, India</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-red-600 shrink-0" />
            <a href="mailto:support@gkgsmasti.com" className="hover:text-red-600" data-testid="footer-email">support@gkgsmasti.com</a>
          </li>
          <li className="flex items-center gap-2.5">
            <Phone className="h-4 w-4 text-red-600 shrink-0" />
            <a href="tel:+919876543210" className="hover:text-red-600" data-testid="footer-phone">+91 98765 43210</a>
          </li>
        </ul>
      </div>
    </div>
    <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
      © {new Date().getFullYear()} GK GS Masti Store. All rights reserved.
    </div>
  </footer>
);
