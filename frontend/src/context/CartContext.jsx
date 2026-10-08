import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

const load = () => {
  try {
    return JSON.parse(localStorage.getItem("gk_cart")) || [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    localStorage.setItem("gk_cart", JSON.stringify(items));
  }, [items]);

  const add = useCallback((product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          slug: product.slug,
          title: product.title,
          price: product.discount_price || product.price,
          type: product.type,
          image: product.cover || (product.images || [])[0] || "",
          qty,
          stock: product.stock,
        },
      ];
    });
    toast.success("Added to cart");
  }, []);

  const remove = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  }, []);

  const setQty = useCallback((productId, qty) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, qty } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const hasPhysical = items.length > 0; // all products are shipped (PDF notes are printed & delivered)

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, count, subtotal, hasPhysical }}>
      {children}
    </CartContext.Provider>
  );
}
