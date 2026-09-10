import { SEO } from "../components/SEO";

const CONTENT = {
  about: {
    title: "About Us",
    body: [
      "GK GS Masti Store is Bihar's trusted destination for competitive exam preparation material. We serve aspirants of Bihar Daroga (SI), Bihar Police, BPSC Teacher, BSSC, Railway (RRB NTPC/Group D) and SSC GD exams.",
      "We offer carefully curated printed books delivered to your doorstep, and instantly downloadable PDF notes prepared by exam experts and toppers. Every product comes with a free sample preview so you know exactly what you are buying.",
      "Our mission is simple: quality study material at honest prices, with support just a WhatsApp message away.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We collect only the information needed to fulfil your orders: name, mobile number, email and delivery address.",
      "Your data is never sold or shared with third parties except delivery partners who need your address to ship physical books.",
      "Payment information is processed securely by our payment gateway partner (Razorpay). We never store your card or UPI details on our servers.",
      "You may request deletion of your account and data anytime by contacting support@gkgsmasti.com.",
    ],
  },
  refund: {
    title: "Refund & Cancellations",
    body: [
      "Physical Books: Orders can be cancelled before they are shipped for a full refund. Damaged or wrong items can be returned within 7 days of delivery for replacement or refund.",
      "Digital PDFs: Since PDF notes are delivered instantly and cannot be 'returned', all digital sales are final. If you face any issue accessing your PDF, contact us on WhatsApp and we will resolve it within 24 hours.",
      "Failed payments: If money was deducted but the order was not confirmed, the amount is auto-refunded by the payment gateway within 5-7 working days.",
      "For any refund queries, message us on WhatsApp or email support@gkgsmasti.com with your order number.",
    ],
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "By using GK GS Masti Store, you agree to these terms. Products are for personal educational use only.",
      "Digital PDFs are licensed to the purchasing account only. Reselling, sharing or uploading purchased PDFs publicly is strictly prohibited and may lead to account termination.",
      "Prices and offers may change without notice. The price at the time of order confirmation applies.",
      "Delivery timelines for physical books are estimates (typically 3-7 working days within India) and may vary by location.",
      "We reserve the right to cancel orders in case of pricing errors or stock unavailability, with a full refund.",
    ],
  },
};

const StaticPage = ({ page }) => {
  const content = CONTENT[page] || CONTENT.about;
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid={`static-page-${page}`}>
      <SEO title={content.title} />
      <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{content.title}</h1>
      <div className="mt-6 space-y-4">
        {content.body.map((p, i) => (
          <p key={i} className="text-sm sm:text-base text-slate-600 leading-relaxed">{p}</p>
        ))}
      </div>
    </div>
  );
};

export default StaticPage;
