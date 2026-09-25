import { useEffect, useState } from "react";

export function useMobileLayout() {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile;
}
