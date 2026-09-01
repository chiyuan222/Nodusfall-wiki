import { promises as fs } from "node:fs";
import path from "node:path";
import { API_BASE_URL } from "./api-client";
import { normalizeWorldContent, type WorldPageContent } from "./world-content";

/**
 * /world 内容配置的服务端加载器（仅服务端组件可用，勿被客户端引用）。
 * 数据源优先级：CMS 接口 GET /content/pages/world → 本地兜底 apps/web/public/content/world-page.json
 */

const CONTENT_FILE = path.join(
  process.cwd(),
  "public",
  "content",
  "world-page.json",
);

async function loadFromApi(): Promise<WorldPageContent | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/content/pages/world`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: WorldPageContent };
    const data = json.data;
    if (!data || !Array.isArray(data.sections)) return null;
    return data;
  } catch {
    return null;
  }
}

async function loadFromFile(): Promise<WorldPageContent | null> {
  try {
    const raw = await fs.readFile(CONTENT_FILE, "utf8");
    const data = JSON.parse(raw) as WorldPageContent;
    if (!data || !Array.isArray(data.sections)) return null;
    return data;
  } catch {
    return null;
  }
}

/** 读取内容配置；接口不可用时回退本地文件，再不行返回 null 由页面降级为提示 */
export async function loadWorldContent(): Promise<WorldPageContent | null> {
  const data = (await loadFromApi()) ?? (await loadFromFile());
  return data ? normalizeWorldContent(data) : null;
}
