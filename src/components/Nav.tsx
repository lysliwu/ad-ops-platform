"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Dashboard" },
  { href: "/performance", label: "Performance" },
  { href: "/keyword-quality", label: "Keyword Quality" },
  { href: "/sitelinks", label: "Sitelinks" },
  { href: "/image-assets", label: "Image Assets" },
  { href: "/token-usage", label: "Token Usage" },
  { href: "/health-check", label: "Health Check" },
  { href: "/keyword-planning", label: "Keyword Planning" },
  { href: "/review-status", label: "Review Status" },
  { href: "/klook-roi", label: "ROI" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-4">
        <span className="mr-4 shrink-0 py-3 text-sm font-semibold text-gray-900">
          Ad Ops Platform
        </span>
        <nav className="flex shrink-0 gap-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-blue-50 font-medium text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
