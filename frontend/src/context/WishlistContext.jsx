import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState([]);

  useEffect(() => {
    if (!user) {
      setIds([]);
      return;
    }
    api.get("/wishlist").then((r) => setIds(r.data.map((p) => p.id))).catch(() => {});
  }, [user]);

  const has = useCallback((productId) => ids.includes(productId), [ids]);

  const toggle = useCallback(
    async (productId) => {
      if (!user) {
        toast.error("Please login to use wishlist");
        return false;
      }
      if (ids.includes(productId)) {
        setIds((prev) => prev.filter((i) => i !== productId));
        await api.delete(`/wishlist/${productId}`).catch(() => {});
        toast.success("Removed from wishlist");
      } else {
        setIds((prev) => [...prev, productId]);
        await api.post("/wishlist", { product_id: productId }).catch(() => {});
        toast.success("Added to wishlist");
      }
      return true;
    },
    [ids, user]
  );

  const refresh = useCallback(async () => {
    if (!user) return [];
    const { data } = await api.get("/wishlist");
    setIds(data.map((p) => p.id));
    return data;
  }, [user]);

  return (
    <WishlistContext.Provider value={{ ids, has, toggle, refresh, count: ids.length }}>
      {children}
    </WishlistContext.Provider>
  );
}
