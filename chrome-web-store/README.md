# Transight AI · Chrome Web Store 提交材料

准备日期：2026-10-01；繁体中文材料更新：2026-10-02。当前提交版本：**0.1.0**。

本目录是商店材料目录，与 `dist/` 完全分离。**上传扩展时只选择 `package/transight-0.1.0.zip`，不要把本目录整体压缩上传。** 尚未登录开发者后台，也未提交审核。

## 逐项上传清单

| 项目 | 材料 | 说明 |
| --- | --- | --- |
| 插件安装包 | `package/transight-0.1.0.zip` | ZIP 根目录直接包含 `manifest.json`；仅包含扩展运行文件及 Apache-2.0 许可证 |
| 名称 / 简短描述 / 版本 | ZIP 内 `manifest.json` 和 `_locales/`；便于复制的汇总见 `listing/metadata.json` | 沿用现有版本和国际化配置，没有创建重复 manifest |
| 英文详细介绍 | `listing/description.en.txt` | 可直接粘贴到英文商品介绍 |
| 简体中文详细介绍 | `listing/description.zh-CN.txt` | 可直接粘贴到简体中文商品介绍 |
| 繁体中文详细介绍 | `listing/description.zh-TW.txt` | 可直接粘贴到繁体中文商品介绍 |
| 插件图标 | `icons/icon-128.png` | 128×128 PNG，现有图标主体缩至 96×96，四周透明留白 16px |
| 英文截图 | `screenshots/en/01-multi-model.png` 至 `03-settings.png` | 3 张，每张 1280×800，RGB PNG |
| 简体中文截图 | `screenshots/zh-CN/01-multi-model.png` 至 `03-settings.png` | 3 张，每张 1280×800，RGB PNG |
| 繁体中文截图 | `screenshots/zh-TW/01-multi-model.png` 至 `03-settings.png` | 3 张，每张 1280×800，RGB PNG |
| 小型宣传图 | `promo/small-440x280.png` | 440×280，RGB PNG，英文通用品牌图 |
| 大型宣传图 | `promo/marquee-1400x560.png` | 1400×560，RGB PNG，可选上传 |
| 文件与来源清单 | `inventory.json` | 文件尺寸、SHA-256、素材来源及 ZIP 检查结果 |

## 商品信息建议

- **主要语言：English（英语）**。与现有 `manifest.default_locale = en` 一致，适合全球用户。
- **额外本地化：简体中文、繁体中文**。分别粘贴对应详细介绍、上传该语言的 3 张截图；共 9 张截图，不要将三种语言的图片全部上传进同一个语言栏位。
- **建议分类：Productivity（生产力）**；如果当前后台提供下级分类，可选 Tools（工具）。最终以开发者后台可选项为准。
- 英文名称：**Transight AI**。
- 简体中文名称：**译见 AI · 随手翻译**。
- 繁体中文名称：**譯見 AI · 隨手翻譯**。
- 版本：**0.1.0**。如果后台已有同版本上传记录，请先提升源 `manifest.json` 的版本再打包，勿只重命名 ZIP。
- 英文简短描述：**99** 个字符；简体中文及繁体中文简短描述各 **35** 个字符，均在 132 字符以内。
- `manifest.json` 中的 `__MSG_extensionName__` / `__MSG_extensionDescription__` 是现有国际化引用；对应内容已随 `_locales/` 打包，不需要改成固定英文。

英文简短描述（沿用）：

> Translate text with your own AI service. Select text and right-click to bring understanding closer.

简体中文简短描述（沿用）：

> 用你自己的 AI 服务翻译文本。选中文字，右键翻译，让理解少一点距离。

繁体中文简短描述：

> 用你自己的 AI 服務翻譯文字。選取文字，右鍵翻譯，讓理解少一點距離。

## 素材复用说明

复用现有英文、简体中文截图和品牌素材；为新增繁体中文界面补充真实浏览器测试截图。没有重新设计图标，也没有生成虚构 UI。

- 图标来自现有 `assets/icon-128.png`。仅为满足商店的留白规范缩放原图，没有重画。提交 ZIP 内的 `assets/icon-128.png` 使用此商店版；源文件和 `dist/` 的开发图标不变，16/32/48px 工具栏图标不变。
- 多模型截图来自现有 `artifacts/screenshots/{en-US,zh-CN,zh-TW}/popup-multi.png`。
- 页面浮窗截图来自现有 `artifacts/screenshots/{en-US,zh-CN,zh-TW}/context-multi.png`。
- 设置截图来自现有 `artifacts/screenshots/{en-US,zh-CN,zh-TW}/options-multi.png`。
- 原截图不是商店规定尺寸，因此只对真实截图做裁切、等比缩放和 1280×800 全幅介绍排版；无外部透明边框或信箱式黑边，不修改界面文字、不伪造模型结果。
- 截图沿用本地测试服务与示例模型；图中已注明测试回复，不代表实际模型的翻译质量。设置截图中的测试密钥已遮挡，未包含实际凭据。
- 两张宣传图沿用此前准备的必要/可选素材，复用现有图标、绿色品牌风格和英文品牌名称。官方文档说明宣传图目前不按语言本地化，因此仅准备一套英文图，不重复制作中文宣传图。

## 提交前还需你确认

本次准备的是上述商品材料，**不代表已完成审核要求或保证审核通过**。

1. 开发者账号、注册及后台要求的身份/联系信息。
2. 可公开访问的隐私政策地址，以及你希望公开的支持邮箱或支持页面。当前没有提供这些信息，因此没有编造 URL、开发者身份或联系方式。
3. 在 Privacy practices 栏目中如实说明：用户提供的文本发送到其配置的 AI 服务；API Key 存在浏览器本地；多模型会分别请求，第三方服务可能收费。不要因为没有自建服务器，就宣称“数据从不离开设备”。
4. 核对全部 HTTP/HTTPS 网站访问权限的理由：普通网页划词翻译，以及访问用户自定义的 AI API。可参考下面的英文权限说明；它们是提交辅助草稿，需按实际后台问题确认。
5. 如审核要求测试方法，提供你认可的可用测试服务与必要说明；不要把真实密钥放进商店图片、公开介绍或安装包。
6. 上传后检查图片裁切和本地化展示，确认版本号和商品名称后再提交审核。

### 单一用途说明（英文草稿）

> Translate user-provided or selected text using the user’s configured AI service, with optional comparison of multiple translation models.

### 权限用途（英文草稿）

| 权限 | 说明 |
| --- | --- |
| storage | Store the user's endpoint, API key, selected models, language preferences and consent locally. Session storage temporarily transfers selected text when a standalone fallback window is needed. |
| contextMenus | Add a command to translate selected text from the webpage context menu. |
| activeTab | Read selected text from the active tab after the user invokes the extension. |
| scripting | Read the current selection and inject the shared translation panel when the user invokes context-menu translation. |
| http://*/* and https://*/* | Provide selection-translation controls on ordinary webpages without per-site setup, and send translation/model-discovery requests to the AI endpoint configured by the user. Text is sent for translation in response to translation actions, not by automatically uploading whole pages. |

## 以后如何重新生成

从项目根目录执行：

```sh
npm run package
```

该命令先执行静态检查及单元测试，再从当前源码白名单打包，并包含根目录 `LICENSE`；ZIP 输出到本目录的 `package/`，**不写入、不清理 `dist/`**。`npm run build` 仍只构建开发者模式加载目录，不生成 ZIP。

只有在更新现有图标或截图之后，才需要重新做尺寸适配（Python 3 + Pillow，字体路径按 macOS 编写）：

```sh
python3 chrome-web-store/tools/prepare-images.py
npm run package
python3 chrome-web-store/tools/validate.py
```

版本、介绍或素材变化后，也应同步更新 `listing/metadata.json` 与本清单。验证脚本会检查版本与描述是否一致，防止误交旧材料。

## 官方要求参考

以下页面于 2026-10-01 读取核对，最终以提交时后台和官方规范为准：

- 图片规格、图标留白、宣传图、截图：https://developer.chrome.com/docs/webstore/images
- 商店商品信息、分类和语言：https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- 上传与发布流程：https://developer.chrome.com/docs/webstore/publish
