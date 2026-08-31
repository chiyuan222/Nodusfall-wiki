"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <h1 className="font-serif text-h1 font-semibold text-danger">出了点问题</h1>
      <p className="mt-3 max-w-reading text-small text-secondary">
        {error.message || "页面加载失败，请重试。"}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md border border-border-subtle bg-raised px-6 py-2.5 text-small text-primary transition-colors duration-fast hover:border-amber-soft"
      >
        重试
      </button>
    </div>
  );
}
