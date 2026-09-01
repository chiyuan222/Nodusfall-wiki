export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border-subtle pb-20 lg:pb-0">
      <div className="mx-auto max-w-page px-6 py-8 text-caption text-faint">
        <p>
          源神小窝是《源初之结》（Nodusfall）玩家自发建立的非官方粉丝项目，与米哈游 /
          HoYoverse 没有隶属、合作或赞助关系。游戏名称、标志与素材权利归各自权利方所有。
        </p>
        <p className="mt-2">
          官方渠道：
          <a
            href="https://nodusfall.mihoyo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary underline-offset-4 hover:text-amber hover:underline"
          >
            官方网站
          </a>
        </p>
      </div>
    </footer>
  );
}
