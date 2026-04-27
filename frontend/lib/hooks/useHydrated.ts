import { useEffect, useState } from "react";

/**
 * Hook to ensure content only renders after hydration is complete
 * Prevents React hydration mismatch errors (#418)
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
