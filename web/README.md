# 译见 AI / Transight AI 官网

独立的 **Astro + TypeScript** 静态站点，与上层 Chrome 插件共用品牌，不共用构建产物或运行时。当前包含首页、使用指南和隐私政策的五种语言版本，可在此基础上继续设计官网。

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

| 语言 | 首页 | 使用指南 | 隐私权政策 |
| --- | --- | --- | --- |
| 简体中文 | `/zh-cn/` | `/zh-cn/guide/` | `/zh-cn/privacy/` |
| 繁體中文 | `/zh-tw/` | `/zh-tw/guide/` | `/zh-tw/privacy/` |
| English | `/en/` | `/en/guide/` | `/en/privacy/` |
| 日本語 | `/ja/` | `/ja/guide/` | `/ja/privacy/` |
| 한국어 | `/ko/` | `/ko/guide/` | `/ko/privacy/` |

- 五种语言均预渲染成完整 HTML，无需 JavaScript 即可阅读和切换语言。
- 浏览器的 `ja` / `ja-JP` 自动匹配日语，`ko` / `ko-KR` 自动匹配韩语；按浏览器偏好列表顺序选择首个受支持语言。
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
│   ├── config/             # 开源仓库与商店入口
│   ├── i18n/               # 语言定义、URL 工具、类型化文案
│   ├── layouts/            # 全站布局、meta、canonical、hreflang
│   ├── pages/
│   │   ├── [locale]/       # 多语言首页、使用指南、隐私权政策
│   │   ├── index.astro     # 自动语言入口 / 无 JS 降级
│   │   ├── 404.astro       # 静态 404
│   │   └── robots.txt.ts
│   └── styles/global.css   # 设计变量、组件样式、响应式布局
└── checks/                  # 构建产物回归测试
```

## 修改文案与新增语言

1. 修改 `src/i18n/en.ts`、`zh-cn.ts`、`zh-tw.ts`、`ja.ts`、`ko.ts`。英文定义字典结构，其他语言通过 `Dictionary` 类型检查漏译键。
2. 新增语言时在 `src/i18n/locales.ts` 中增加语言代码与 HTML `lang`，在 `index.ts` 注册新字典。
3. 同步 `astro.config.mjs` 的 `i18n.locales` 和 sitemap 语言映射；按需扩展 `detectLocale`，并更新测试。
4. 所有 `[locale]` 页面会通过 `getStaticPaths()` 自动生成对应版本。
5. 新增页面时扩展 `Page` 类型，在页面中向布局传入对应 `page`，保证切换语言指向同一页面；按需扩展页面 metadata。

## 设计基础

延续插件的深绿色 `#126754` 品牌；暖白背景、衬线标题、系统正文字体、响应式栅格。设计变量集中在 `src/styles/global.css`，无外部字体请求。页面品牌图标使用 `public/brand.svg`；标签页使用单独的透明底 `public/favicon.svg`，不带底板或白色外框。包含键盘焦点、跳过导航、语义化分区、44px 触摸目标及减少动态效果支持。

首页翻译卡片仅为明确标注的静态示意，不调用 AI。安装指南面向商店用户，不要求下载源码或构建插件。商店入口直接指向 Transight AI 正式详情页（扩展 ID：`aocmejffpcbcfnmbpiilnlikapmlhocm`），保留 `utm_source=item-ow-cb` 参数，并按当前官网页面语言添加 `hl`（`zh-CN` / `zh-TW` / `en` / `ja` / `ko`），无需 JavaScript；链接集中在 `src/config/site.ts`，开源仓库为 `https://github.com/gif-gif/transight-ai`。首页突出完全开源与「选中文字 → 点击翻译 → 原处读懂」的操作流程，不伪造下载量或评价。

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

使用支持目录 `index.html` 与 `404.html` 的静态托管，**不要启用把所有路径重写到 `/index.html` 的 SPA 回退**。上线前补充社交分享图片，并核实隐私政策中项目维护者身份、联系渠道和实际托管商的访问日志处理方式。

## 许可证

本网站作为 Transight AI 仓库的一部分，采用 [Apache License 2.0](../LICENSE) 开源发布。第三方依赖及其素材保留各自的许可证。

## 隐私权政策维护

- 英文页面标题为 `Privacy Policies`，政策通过全站页脚和安装指南进入；五种语言均为独立静态页面，无需登录或 JavaScript。发布后可将 `https://实际官网域名/en/privacy/` 填入商店隐私政策地址，不要填写 localhost。
- 文案集中在 `src/i18n/privacy/`，按 `chrome-web-store/dashboard/02-privacy-practices.md` 和当前扩展源码核对。修改实现时同步更新文案、`privacyUpdated`、各语言日期和商店申报；各语言 section ID 必须一致，以便切换语言保留锚点。
- 覆盖请求触发、原文与密钥去向、模型发现和连接测试、本地存储及删除、权限、安全限制、第三方处理、官网语言偏好和联系渠道。明确披露密码加密保存、会话解锁、旧版迁移和锁定/删除方式，不承诺第三方零留存或不训练。
- 当前联系渠道为项目 GitHub Issues（`src/config/site.ts`），页面提醒其公开性。发布前由维护者确认实际运营主体与联系安排；如有专用隐私邮箱，应补充该私密渠道。代码无法证明托管商日志留存或第三方的运营行为，需按真实部署核实，不能据此声称已通过商店审核或完成法律合规认证。

## 本地化截图

当前官网截图基于扩展 v0.1.6，于 2026-10-14 重新拍摄，统一使用无版本号素材，覆盖五种语言。同步前核对 `artifacts/screenshots/{locale}/capture-info.json` 中的版本与根目录 `manifest.json` 一致；除 README 引用的图片外，也需更新繁体中文的 Simple / 多图 / 设置等原图及各语言 `selection-trigger.png`，避免混用旧截图。

安装指南展示对应语言的十张扩展截图：AI 网页翻译确认栏、AI 网页原位翻译效果、Simple 精简浮窗、Full 模式 AI / Google 网页与文字入口、工具栏 Simple 模式、多图粘贴、网页内翻译、多模型对比、服务与密钥设置、划词面板解锁。图片来自 `docs/screenshots/` 中的本地演示环境，页面明确说明模型名和译文为测试示例，不代表实时 AI 响应。截图可点击查看完整尺寸。

- 发布图片：`public/screenshots/{zh-cn,zh-tw,en,ja,ko}/*.webp`，使用 WebP、延迟加载及明确宽高。
- 使用 `scripts/store-screenshots.mjs` 拍摄发布素材：仅截图期间隐藏 `.version`，设置页仅移除品牌后的版本后缀，截图后恢复界面。闭合 Shadow DOM 内的版本标签也会处理；不修改扩展实际版本号或产品界面。素材元数据保留真实版本，并记录 `versionWatermarks: "hidden"`，商店素材生成会校验此标记。
- `chrome-web-store/tools/prepare-images.py` 同步所有已存在的五语言文档原图（包括官网独用截图），再运行官网截图同步；不要用普通回归测试截图覆盖发布素材。
- 原图更新后执行 `npm --prefix web run screenshots:sync`，生成图片和尺寸清单 `src/config/screenshots.json`，并把拍摄版本、时间及裁切边界保存到 `src/config/screenshots-capture.json`，供测试使用（不依赖被忽略的 `artifacts/`）。不自动运行扩展测试，也不修改原始截图。
- 截图标题、替代文本和演示说明集中在 `src/i18n/screenshots.ts`。
- 官网日/韩语桌面与移动端验收截图保存在 `docs/screenshots/website/`；浏览器验收脚本为 `web/scripts/browser-smoke.mjs`，可通过 `PLAYWRIGHT_MODULE` 指定外部 Playwright 模块，通过 `CHROMIUM_EXECUTABLE` 指定已安装的 Chromium 可执行文件，通过 `SITE_PREVIEW_URL` 指定已启动的本地站点（默认 `http://127.0.0.1:4321`）。

### 划动选中文字后的图标效果

首页和使用指南的 `#selection-trigger` 展示点击翻译前的真实选区截图，并用三步说明「按住鼠标拖动选中 → 松开显示图标 → 点击图标打开翻译」。五种语言文案集中在 `src/i18n/selection-trigger.ts`，组件为 `src/components/SelectionTrigger.astro`。同时说明图标约 2.5 秒后消失、重新选中可再次显示，以及仅选中文字不会发送内容。

截图同步脚本从 `chrome-web-store/screenshots/{zh-CN,zh-TW,en,ja,ko}/05-selection-trigger.png` 生成完整说明图；网页区域特写从 `docs/screenshots/` 下对应语言的 `selection-trigger.png` 裁切生成（左上角 424×160），不依赖商店海报排版。清单为 `src/config/selection-trigger.json`。商店说明图原尺寸应为 1280×800；原始截图布局变更时必须复查特写裁切位置。页面图片为静态截图，点击可查看对应语言完整说明图，不会触发翻译。浏览器验收覆盖五种语言的首页和指南、1440/390/320px 宽度，并保存首页新模块的截图。


## 最新功能内容维护

首页与使用指南共用 `src/components/Capabilities.astro`，五语言文案集中在 `src/i18n/capabilities.ts`。首页展示摘要与 AI 网页翻译确认 / 结果预览，指南提供对应锚点的详细说明：

- **Simple / Full**：默认 Full；Simple 使用首个模型，编辑停顿约 0.6 秒或更改语言自动重译。工具栏 popup、划词与右键浮窗都支持模式切换，偏好立即保存并同步。
- **图片翻译**：工具栏与 Full 原文框支持最多 5 张粘贴图片，预览不上传；需支持图片输入的模型。当前没有可见的内置截图按钮，应使用系统截图后粘贴；Simple 仅支持文字。
- **本地朗读**：统一使用 Chrome 标记为本地的中文语音（优先 zh-CN），不随翻译目标语言切换，长译文分段朗读，无云端回退、自动播放或麦克风访问。
- **Google 免费文字翻译**：默认开启，可独立关闭并即时同步；最多 5,000 字符，点击后通过新标签页 URL 发送文字，不发送图片，不回填结果。
- **Google 整页翻译**：Simple / Full 的工具栏、划词和右键浮窗均支持；点击后通过新标签页将当前 HTTP/HTTPS URL（含查询参数）发给 Google，无需 AI 配置，不是原页内嵌翻译。两个 Google 入口在 Full 中位于 AI 按钮右侧，在 Simple 中位于语言选择下方。
- **翻译控制**：目标语言记忆、源语言选择、取消请求、划词开关与自定义系统提示词；默认网页文字翻译可能附带页面标题及描述，图片请求不附带页面上下文。

隐私政策于 2026-10-14 同步上述实际数据流、图片压缩与内存留存、用户粘贴事件、朗读权限和 Simple 自动请求行为；补充 Google 的接收方、普通浏览器导航 Cookie/登录行为、URL 与历史留存，并保留原有 API Key 加密说明。不要恢复为「每次都必须点击按钮才发送」的笼统承诺。

截图同步读取拍摄元数据中的 `cropBoxes` / `inputBoxes`，保留完整 Simple 面板和多图输入、发送按钮区域，不再使用固定像素裁切，避免新 Google 入口被裁掉。缺失边界、版本不匹配或缺少无水印标记时拒绝同步。原始演示布局变更后需目视检查。浏览器脚本同时验证五语言功能卡片、指南锚点、截图加载及 1440/390/320px 布局，并保存 `capabilities-{width}.png`。


### AI 网页原位翻译同步（2026-10-14）

- 首页与指南新增 `#capability-ai-page`，说明单模型、独立确认、动态文字、原文切换 / 恢复、页面兼容范围和费用边界；Google 整页翻译仍单独说明为新标签页导航。
- 隐私政策新增 `#ai-page`，区分页面文本批次与划词 / 图片请求，披露临时 session 授权、不持久保存网页正文、动态内容和登录页敏感文字风险。专用结构化提示词不使用自定义纯文字提示词。
- `scripts/page-translation-screenshot-fixture.mjs` 提供本地示例文章与固定译文；`scripts/store-screenshots.mjs` 捕获真实确认栏和处理完成的页面，验证确认前零页面请求、第一个模型、链接保留与恢复原文。五种界面语言分别拍摄，英文界面示例目标语言为简体中文，其余与界面语言相同。
- 新增 `ai-page-confirm.png` / `ai-page-result.png`，经原图准备脚本与 `screenshots:sync` 转为 WebP。同步时要求 capture-info 中包含 `features: ["ai-page-translation"]`；所有素材继续隐藏版本号，而不是修改运行时界面。
- 截图和说明对应当前源码构建，不代表 Chrome Web Store 已完成审核或上线；安装仍引导用户从商店下载，不要求构建。
