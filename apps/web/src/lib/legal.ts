import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * 法律文档读取（服务端）：内容唯一事实源为仓库 docs/legal/*.md（PR #64 入库）。
 * 构建/请求时直读文件，管理员改 docs/legal 后重新部署即生效。
 * 读取失败返回 null，页面降级为提示而非 500。
 */

export type LegalDocKey = "terms" | "privacy";

const FILE_MAP: Record<LegalDocKey, string> = {
  terms: "terms.md",
  privacy: "privacy.md",
};

export function readLegalDoc(key: LegalDocKey): string | null {
  try {
    // process.cwd() = apps/web；docs/legal 在仓库根
    const file = path.join(process.cwd(), "..", "..", "docs", "legal", FILE_MAP[key]);
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}
