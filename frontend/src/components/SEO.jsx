import { useEffect } from "react";

function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export const SEO = ({ title, description, image }) => {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | GK GS Masti Store`
      : "GK GS Masti Store | Competitive Exam Books & PDF Notes";
    document.title = fullTitle;
    const desc =
      description ||
      "Buy competitive exam books and instant PDF notes for Bihar Daroga, Bihar Police, BPSC Teacher, BSSC, Railway and SSC GD.";
    setMeta("name", "description", desc);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "website");
    if (image) setMeta("property", "og:image", image);
  }, [title, description, image]);
  return null;
};
