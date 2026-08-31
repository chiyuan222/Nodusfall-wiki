import { promises as fs } from "node:fs";
import path from "node:path";
import type { HomePageContent } from "./home-content";

/**
 * 首页内容配置的服务端加载器（仅服务端组件可用，勿被客户端引用）。
 * 数据源：apps/web/public/content/home-page.json
 */

const CONTENT_FILE = path.join(
  process.cwd(),
  "public",
  "content",
  "home-page.json",
);

/** 读取内容配置；文件缺失或损坏时返回 null，由页面降级为提示 */
export async function loadHomeContent(): Promise<HomePageContent | null> {
  try {
    const raw = await fs.readFile(CONTENT_FILE, "utf8");
    const data = JSON.parse(raw) as HomePageContent;
    if (!data || !Array.isArray(data.sections)) return null;
    return data;
  } catch {
    return null;
  }
}
