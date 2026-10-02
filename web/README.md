# 译见 AI 官网

独立的 **Astro + TypeScript** 静态站点，与上层 Chrome 插件共用品牌，不共用构建产物或运行时。当前包含首页和使用指南的三种语言版本，可在此基础上继续设计官网。

## 开发

官网需要 **Node.js 22.12+**（以实际安装的 Astro 引擎要求为准）。在项目根目录运行：

```sh
npm --prefix web ci
npm --prefix web run dev
```

打开 `http://127.0.0.1:4321`。也可以先进入 `web` 再执行对应 npm 命令。

```sh
npm --prefix web run check    # Astro / TypeScript 检查
npm --prefix web run build    # 检查并生成 web/dist
npm --prefix web run preview  # 本地预览生成的静态站点
npm --prefix web test         # 构建 + 语言/路由/链接/SEO 回归测试
```

上层的 `npm run build` 仍然只生成 **插件** `dist/`。不要在 Chrome 中加载 `web/dist/`。

## 路由与语言

| 语言 | 首页 | 使用指南 |
| --- | --- | --- |
| 简体中文 | `/zh-cn/` | `/zh-cn/guide/` |
| 繁體中文 | `/zh-tw/` | `/zh-tw/guide/` |
| English | `/en/` | `/en/guide/` |

- 三种语言均预渲染成完整 HTML，无需 JavaScript 即可阅读和切换语言。
- `/` 先使用语言切换器保存的偏好，再匹配浏览器语言，不支持的语言回退英文。
- 简繁匹配优先识别 `Hans` / `Hant`，再按 `TW` / `HK` / `MO` 等地区匹配。
- 直接访问语言 URL 时，URL 优先，不被浏览器或保存的偏好覆盖。
- 切换语言保留当前页面和锚点，选择保存到 `localStorage`；存储不可用不影响导航。
- 禁用 JavaScript 时，根入口显示语言选择页，不进行自动跳转。

## 目录结构

```text
web/
├── public/                 # 静态资源（品牌图标）
├── src/
│   ├── components/         # 页头、页尾、语言切换器、图标
│   ├── i18n/               # 语言定义、URL 工具、类型化文案
│   ├── layouts/            # 全站布局、meta、canonical、hreflang
│   ├── pages/
│   │   ├── [locale]/       # 多语言首页、使用指南
│   │   ├── index.astro     # 自动语言入口 / 无 JS 降级
│   │   ├── 404.astro       # 静态 404
│   │   └── robots.txt.ts
│   └── styles/global.css   # 设计变量、组件样式、响应式布局
└── checks/                  # 构建产物回归测试
```

## 修改文案与新增语言

1. 修改 `src/i18n/en.ts`、`zh-cn.ts`、`zh-tw.ts`。英文定义字典结构，其他语言通过 `satisfies Dictionary` 检查漏译键。
2. 新增语言时在 `src/i18n/locales.ts` 中增加语言代码与 HTML `lang`，在 `index.ts` 注册新字典。
3. 同步 `astro.config.mjs` 的 `i18n.locales` 和 sitemap 语言映射；按需扩展 `detectLocale`，并更新测试。
4. 所有 `[locale]` 页面会通过 `getStaticPaths()` 自动生成对应版本。
5. 新增页面时扩展 `Page` 类型，在页面中向布局传入对应 `page`，保证切换语言指向同一页面；按需扩展页面 metadata。

## 设计基础

延续插件的深绿色 `#126754` 品牌；暖白背景、衬线标题、系统正文字体、响应式栅格。设计变量集中在 `src/styles/global.css`，无外部字体请求。包含键盘焦点、跳过导航、语义化分区、44px 触摸目标及减少动态效果支持。

首页翻译卡片仅为明确标注的静态示意，不调用 AI。安装按钮指向真实可用的本地安装指南，不伪造商店链接、下载量或评价。

## 部署与 SEO

站点预期部署在独立域名根目录，暂未配置子路径部署。部署平台设置：

- 项目目录：`web`
- 安装命令：`npm ci`
- 构建命令：`npm run build`
- 发布目录：`dist`
- Node.js：满足 `package.json` 的 engines 要求
- 环境变量：`SITE_URL=https://实际官网域名`

例如从仓库根目录执行：

```sh
SITE_URL=https://your-domain.com npm --prefix web run build
```

**必须在正式构建时设置真实 `SITE_URL`**，才会生成 canonical、各语言 hreflang、站点地图和可索引 robots.txt。未设置时按预览环境处理（`noindex` + robots 禁止抓取），避免把示例域名发布给搜索引擎。`.env.example` 仅作说明；配置直接读取进程环境变量，应由命令行或部署平台注入。

每种语言均有独立 title / description / Open Graph 信息。根入口不纳入 sitemap，`x-default` 指向英文对应页。域名之外不需要后端、数据库或 API Key。

使用支持目录 `index.html` 与 `404.html` 的静态托管，**不要启用把所有路径重写到 `/index.html` 的 SPA 回退**。上线前补充正式下载入口、社交分享图片和独立隐私政策（当前只有配置服务的数据流说明）。
