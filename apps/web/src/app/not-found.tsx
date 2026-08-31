import Link from "next/link";
import { KnotMark } from "@/components/knot-mark";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <KnotMark size={56} className="opacity-50" />
      <h1 className="mt-6 font-serif text-h1 font-semibold">404 · 结绳已断</h1>
      <p className="mt-3 text-small text-secondary">
        你要找的页面不存在，或已被移动。
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-amber px-6 py-2.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
      >
        回到首页
      </Link>
    </div>
  );
}
