/** 评分星：只读展示态。输入态（攻略评分面板）在阶段 3 扩展。 */
export function RatingStars({
  rating,
  count,
  size = 14,
}: {
  /** 0–5，对应契约 GuideSummary.rating */
  rating: number;
  count?: number;
  size?: number;
}) {
  const full = Math.round(rating);
  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={`评分 ${rating.toFixed(1)} / 5${count !== undefined ? `，共 ${count} 人评分` : ""}`}
    >
      <span aria-hidden className="flex" style={{ fontSize: size }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < full ? "text-amber" : "text-faint"}>
            ★
          </span>
        ))}
      </span>
      <span className="font-mono text-caption text-secondary">
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-caption text-faint">({count})</span>
      )}
    </span>
  );
}
