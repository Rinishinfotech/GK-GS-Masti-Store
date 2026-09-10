import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

let cache = null;

export function useCategories() {
  const [categories, setCategories] = useState(cache || []);

  useEffect(() => {
    if (cache) return;
    api.get("/categories").then((r) => {
      cache = r.data;
      setCategories(r.data);
    }).catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    const { data } = await api.get("/categories");
    cache = data;
    setCategories(data);
  }, []);

  return {
    categories,
    notes: categories.filter((c) => c.group === "notes"),
    books: categories.filter((c) => c.group === "books"),
    reload,
  };
}
