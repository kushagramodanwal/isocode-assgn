import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TITLES: [RegExp, string][] = [
  [/^\/login/, "Sign in"],
  [/^\/shop\/cart/, "Cart"],
  [/^\/shop\/orders\/.+/, "Order"],
  [/^\/shop\/orders/, "Orders"],
  [/^\/shop\/capture/, "Type order"],
  [/^\/shop/, "Catalogue"],
  [/^\/desk\/capture\/new/, "Paste a message"],
  [/^\/desk\/capture/, "Check message"],
  [/^\/desk\/orders\/.+/, "Order"],
  [/^\/desk\/orders/, "Orders"],
  [/^\/desk\/export/, "Tally export"],
  [/^\/desk\/loading/, "Van loading"],
  [/^\/desk\/retailers/, "Quiet shops"],
  [/^\/desk/, "Inbox"],
];

/** Keeps the browser tab title in step with the route (screen readers announce it too). */
export function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const t = TITLES.find(([re]) => re.test(pathname))?.[1];
    document.title = t ? `${t} · Company A Orders` : "Company A Orders";
  }, [pathname]);
  return null;
}
