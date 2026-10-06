# Privacy practices / 隐私权规范填写指南

核对日期：2026-10-06 · 基于当前 manifest 与源码。英文代码块可粘贴至相应栏位；中文说明用于开发者核对，**不是已通过审核或合规保证**。实现改变后必须同步修改申报与隐私政策。

## 1. Single purpose / 单一用途

```text
Translate text that the user types or selects, and text/images that the user pastes into the extension, using the user's configured AI service. Optional side-by-side model results help the user compare translations of the same text.
```

## 2. Permission justification / 权限理由

只填写实际 manifest 中列出的权限。不要为不存在的 `tabs`、`history`、`clipboardRead`、`clipboardWrite`、`cookies` 权限编造理由；调用某个 API 不代表 manifest 一定声明了同名权限。

### storage

```text
Save the user's AI endpoint, password-encrypted API key, selected model IDs, translation preferences (target language, Simple/Full mode, selection toggle and custom system prompt), interface language, and consent in chrome.storage.local. The API key is encrypted using AES-256-GCM with a password-derived PBKDF2-SHA-256 key. Passwords and derived keys are never saved. Unlocked API keys are held in trusted-context chrome.storage.session until locked or the browser session ends. chrome.storage.session temporarily holds selected text for the standalone fallback window and removes it when the window reads it. Settings are not stored in Chrome sync. Content scripts cannot directly read local API credentials.
```

### contextMenus

```text
Add a Translate selection command to the webpage context menu. The command sends the user's selected text to the shared translation panel and starts translation using the configured service.
```

### activeTab

```text
When the user opens the toolbar popup, access the active tab to read its current text selection and prefill the source field. Read available page title/description metadata for the translation prompt when applicable. Prefilling does not itself submit a translation. Protected browser pages can still use manual text input. The popup no longer exposes a screenshot capture button; clipboard image translation uses user-initiated paste events instead. Packaged capture/cropping handlers remain in the code, but are not a visible user entry in this release.
```

**提交前最小权限复核**：当前同时申请全站 host access，可能覆盖上述注入所需权限。此说明对应实际用途，但不是证明 `activeTab` 在所有路径均不可替代。若复核后移除权限，应更新 manifest、回归测试、重新打包及同步本文件；本次仅准备材料，不修改权限。

### scripting

```text
Run a packaged selection-reading function when the toolbar popup is opened, and inject the packaged shared translation view into the selected frame for context-menu translation. Also remove legacy per-site content-script registrations during migration. No remotely downloaded scripts are injected.
```

### tts

```text
Read a translated result aloud only when the user clicks its speaker button. The extension selects a matching voice explicitly reported by Chrome as local (remote=false), handles long text in chunks, and coordinates playback and stopping across its views. There is no automatic playback, remote-voice fallback, cloud speech API, microphone access, or stored audio. Translated text is passed to the selected local speech engine for playback and is not additionally persisted for this feature. If no matching local voice is available, the user is prompted to install one.
```

以上说明对应当前语音功能；本次材料更新最后重新生成 package，并核对 ZIP 与源码一致。线上隐私政策仍需运营者同步。

### Host permissions: https://*/* and http://*/*

若后台只有一个 Host permissions 理由框，粘贴以下全文；如分别展示，按同一用途拆分。

```text
Show the selection-translation control on ordinary HTTP/HTTPS webpages without per-site setup, and open the shared on-page translation panel. All-site access also permits API requests to the user-configured AI endpoint, whose hostname is not fixed. Non-local API endpoints must use HTTPS; HTTP API endpoints are accepted only for localhost or 127.0.0.1. Selecting text alone does not upload it. Translation is triggered by user actions, including opening a selected-text panel, editing source text in Simple mode, changing source/target languages or modes, translating, or retrying. Default text prompts may include available page title and description metadata, but not a scrape of the whole webpage. Image requests omit that page context. The extension does not upload entire pages or tab URLs as separate request fields.
```

`http://*/*` 还用于普通 HTTP 网页划词，不应仅解释成“HTTP API 任意访问”。若原文本身含 URL，该 URL 会作为原文的一部分发送。

## 3. Remote code / 远程代码

建议选择 **No, I am not using remote code**。如有说明框：

```text
All executable JavaScript and styles are packaged with the extension. Remote AI endpoints return JSON data for model discovery and translation. Model identifiers and translated text are treated as data, not executed as code. The extension does not load remote scripts, use eval on provider responses, or download executable updates outside the Chrome Web Store.
```

## 4. Data usage / 用户数据处理

### 当前源码新增的数据处理说明（2026-10-06）

- 图片粘贴：用户可在原文输入框主动粘贴图片，以缩略图预览、逐张删除，支持文字与最多 5 张图片一起翻译。仅处理粘贴事件，不增加读取剪贴板权限或后台读取；粘贴不上传，翻译/重试时才发送保留的文字与图片。图片仅在内存处理，不持久保存。
- 区域截图底层代码仍打包保留，但当前 popup 已没有可见的截图入口，不应向用户或审核员描述为可点击功能。现有图片输入路径是用户用系统截图工具复制后主动粘贴；最多 5 张，翻译时才发送。保留的截图处理器使用临时内存、裁剪后交接、不持久保存，但不是本版审核步骤的可见入口。

- 划词开关独立保存在本地，默认启用；关闭不影响工具栏或主动右键翻译。
- 自定义系统提示词保存在本地，翻译时以 system 消息发送到用户配置的服务，不包含在网页内容脚本的设置快照中。
- 默认模板的 `{{title_prompt}}` 和 `{{summary_prompt}}` 会包含当前网页标题（最多 500 字符）及已有 description 元数据（最多 1,500 字符），在主动网页翻译时随原文发送。删除模板中的对应变量即可不发送这些信息。不会抓取整页正文或额外调用 AI 生成摘要；纯手动输入没有页面上下文。
- 目前没有术语表配置入口，`{{terms_prompt}}` 无可用信息时为空。
- 数据申报范围同时包含自定义提示词及可用标题/摘要。材料更新最后重新生成商店 ZIP；线上隐私政策仍需运营者同步。


**不能选择“不收集或使用任何用户数据”**。以下是根据当前实现的建议；在实际后台按字段定义逐项核对。官方 FAQ 将纯本地处理也纳入需要披露的数据处理。

| 后台类别 | 当前代码对应行为 / 建议 |
| --- | --- |
| Website content / 网站内容 | **勾选**：读取用户选中或输入的原文、用户粘贴的图片及适用的标题/description 元数据，处理译文；用户发起翻译时发送至配置的 AI 服务。不会自动上传整页 DOM |
| Authentication information / 身份验证信息 | **勾选**：API Key 本地保存，并通过 Authorization 请求头发送给用户指定的服务；不是插件自己的登录账号 |
| Web history / 浏览活动（或相近字段） | **建议保守勾选并说明仅本地用途**：会读取标签页 URL/来源来判断是否支持网站和检查权限、更新浮窗；不使用 history API，不持久保存浏览记录，也不把标签页 URL 单独上传。不得写成“完全不读取浏览信息” |
| User activity / 用户活动 | 当前没有点击流、键盘记录、鼠标轨迹或分析日志；仅响应划词、拖动、复制等交互。若新增统计需重新申报 |
| Personally identifiable information、Personal communications、Health、Financial/payment、Location | 当前没有专门获取身份、邮件、医疗记录、支付信息或定位的功能；但用户自由输入可能含这些内容，处理仍属于原文传输。不可宣称能过滤这些信息。若产品面向这些数据、接入相关来源或后台定义将输入中的此类内容纳入单独类别，应相应勾选，不能以“用户主动输入”为由隐瞒 |

如后台提供额外说明框，可填写：

```text
The extension processes user-provided source text, translations, AI service settings, and API credentials to provide translation. Source text, model ID, target language, and translation style are sent to the endpoint chosen by the user. The API key is sent to that endpoint for authentication. Model discovery sends connection credentials but no source text. Connection testing sends a short sample translation request. Multiple selected models receive separate requests. Tab URLs/origins are inspected locally for site-permission and panel handling, not sent as separate request fields. There is no built-in analytics or persistent translation history. Provider retention and use of submitted data are governed by the chosen provider's policies.
```

### 数据流与保存期限（用于隐私政策及审核核对）

| 数据 | 去向 / 保存 |
| --- | --- |
| 原文、模型 ID、源/目标语言、系统提示词、翻译风格 | POST 到配置 Base URL 的 `/chat/completions`；Full 每个已选模型分别请求，Simple 仅第一个。点击划词/右键翻译、翻译、重试、修改语言/模式、Simple 停止输入约 0.6 秒均可能发起请求 |
| 网页上下文 | 可用的标题和 description 元数据通过提示词变量发送；没有整页抓取或额外 AI 摘要。纯手动输入与图片请求不附带页面上下文；删除提示词变量可不使用相应信息 |
| 粘贴图片 | 用户主动粘贴到原文框；最多 5 张，处理为最长边不超过 2,048px 的静态 JPEG。预览不上传，翻译时随文字发给配置的服务。仅存在内存，无 local/session storage 或历史保存；第三方服务留存需另行确认 |
| 朗读内容 | 点击扬声器后传递给 Chrome 标记为本地的匹配语音；无云端语音回退，无自动播放、音频存储或话筒权限 |
| API Key | 密文保存在本地 `chrome.storage.local`；解锁后明文只暂存受限 `chrome.storage.session`；服务请求中通过 Bearer header 发送，不交给内容脚本或硬编码的开发者服务器 |
| 解锁密码 | 至少 6 个字符；仅用于本地派生解密密钥，不持久保存、不发送给 AI 服务。页面浮窗使用扩展来源的独立 iframe 收集密码，通过扩展内部消息发送给后台；父页面仅收到高度通知，不收到密码 |
| 模型列表 | GET `/models` 返回的数据供设置页选择；选中的模型 ID 会保存。获取模型可在勾选翻译同意前执行，仍会发送 API Key，不要宣称同意前绝无网络请求 |
| 连接测试 | 对每个已选模型发送 `Hello, world!`，目标语言为简体中文 |
| 原文与译文 | 主要存在当前界面内存；没有持久翻译历史。关闭界面或清空输入可移除当前展示，但已发出的请求不能保证从服务端撤回 |
| 备用窗口原文 | 临时写入 `chrome.storage.session.contextDraft`，读取后删除；窗口未读取时可能保留到当前浏览器会话结束 |
| 偏好、同意状态、API 配置 | 保留在本地直到用户修改、清除扩展数据或卸载；不经 Chrome sync。当前没有专用“一键删除全部数据”按钮 |
| 复制的译文 | 用户点击复制后写入系统剪贴板，之后由操作系统/其他剪贴板工具管理；扩展不主动读取剪贴板；仅在用户向原文框粘贴时接收粘贴事件中的图片/文字 |

外部服务通常能接触请求网络元信息，例如来源 IP；当前代码不主动请求地理位置或附加用户身份。若开发者提供托管测试服务，它产生的访问日志和数据留存也必须如实补充。

## 5. Limited use / 数据使用声明

只有开发者确认实际运营与第三方安排均符合时，才勾选后台的各项认证。当前代码没有广告、数据出售或信用评估功能，但代码检查不能替代对服务提供方的核实。

核对要点：不出售数据；不为与单一用途无关的目的使用/转移数据；不用于信用评估或放贷。用户选择的 AI 服务是接收方，不能写“绝不向第三方传输”。不要替所有提供方保证零留存、不训练或跨境处理方式。

## 6. Privacy policy URL / 隐私政策地址：待提供

需要公开、稳定、免登录的隐私政策页面。现有仓库主页、开源 LICENSE、商品介绍和这份后台草稿不能自动当作已完成的隐私政策。发布前至少补齐：开发者/运营者及联系渠道、数据类型与处理目的、第三方接收方、存储与删除、安全措施、提供方留存条款和政策更新日期。

**安全核对项（与实现保持一致，仍需核实实际服务和部署）：**

- API Key 已使用 AES-256-GCM + PBKDF2-SHA-256（600,000 次迭代、随机盐和新 IV）进行应用层加密。密码及派生密钥不保存；解锁后 Key 暂存受限的 `chrome.storage.session`。重启浏览器或重载/更新扩展后需解锁；支持立即锁定和删除凭据。锁定无法撤回服务端已接收的请求，不能防御已被控制的浏览器或系统。旧版明文 Key 在完成密码加密前禁止用于请求；密文成功保存后才移除旧明文，以防止迁移中断导致丢失。完成前旧 Key 仍是明文，需提示用户及时迁移。
- 工具栏弹窗及页面浮窗均可直接解锁，成功后继续等待中的翻译。密码表单使用扩展来源 iframe；消息权限按打包页面精确校验，iframe 仅可查询凭据状态和解锁。页面高度通知不含密码或 API Key。忘记密码只能删除凭据后重新配置。最少 6 字符是输入限制，不代表密码强度保证，建议使用更长的独立密码。
- 非本地 API 强制 HTTPS，但 localhost / 127.0.0.1 明文 HTTP 例外必须如实说明；审核与实际部署时优先 HTTPS。
- 已有翻译同意确认，但模型发现会独立发送凭据，需核对相应操作前的告知是否足够明确。

## 源码核对入口

`manifest.json`；`src/shared/settings.js`；`src/shared/credentials.js`；`src/shared/credential-access.js`；`src/unlock/unlock.html`；`src/unlock/unlock.js`；`src/shared/translator.js`；`src/shared/models.js`；`src/background.js`；`src/popup/popup.js`；`src/options/options.js`；`src/shared/context-menu.js`；`src/shared/selection-background.js`；`src/shared/translation-view.js`。

## 官方参考

- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
