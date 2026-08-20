"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();

  if (
    pathname === "/chat" ||
    pathname.startsWith("/chat-home-main-agent-chat-interface") ||
    pathname === "/login" ||
    pathname === "/signup"
  ) {
    return null;
  }

  return <Footer />;
}
