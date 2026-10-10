# Test instructions / 测试说明

核对日期：2026-10-06 · 版本：0.1.4。以下是审核员可读的英文模板，**不是已提供可用测试服务**。测试说明栏可选，但本插件完整功能依赖 AI 服务，建议主动提供有效、可复现的审核路径。

## 提交前必须补齐

插件本身没有账号登录。需要的是兼容 Chat Completions 的 AI 服务接入信息，不是 GitHub 登录账号，也不是 Chrome 开发者账号。

- 可从审核环境访问的 **HTTPS Base URL**（含服务所需 `/v1`，不附 `/chat/completions`）。
- 专用测试 API Key（服务明确无需鉴权时才可留空）。
- 至少一个真实可用的模型 ID；要审核多模型功能，建议提供两个。
- 足够的额度、合适的限流、有效期及服务可用时间；不要要求审核员自行付费。
- 如提供独立服务账户，再私下提供它的必要凭据与登录步骤；不要提交私人生产账号或 MFA 恢复码。

**真实凭据仅填写在开发者后台的测试说明/专用凭据栏，或使用 Google 明确支持的审核渠道。不要填入此文件、README、公开 Issues、截图、ZIP 或 Git 提交。** 目前全部保留占位符；填写后台前替换完整，不能直接提交占位值。

## 可粘贴的英文审核说明

```text
Transight AI 0.1.4 — reviewer instructions

Purpose: translate user-provided text using the user's configured AI service. No Transight AI account or extension login is required. AI service access is needed for successful translations.

Reviewer-only service details (complete privately before submission):
API Base URL: <REVIEW_HTTPS_BASE_URL>
API key: <REVIEW_ONLY_API_KEY_OR_EXPLICITLY_NO_AUTH_REQUIRED>
Model ID 1: <AVAILABLE_MODEL_ID_1>
Model ID 2: <AVAILABLE_MODEL_ID_2_OR_NOT_PROVIDED>
Service availability / expiry: <REVIEW_ACCESS_WINDOW>
Quota and rate limits: <REVIEW_QUOTA_DETAILS>
Support contact: <REVIEW_SUPPORT_CONTACT>

1. Install the submitted extension in Chrome 114 or later. Pin it to the toolbar if desired. Open the toolbar popup and click the Settings gear. The globe button beside Settings lets you choose English for these instructions; Simplified Chinese, Traditional Chinese, Japanese, and Korean are also available.

2. Enter the Base URL and API key above. Do not append /chat/completions. Click Fetch models if the service supports GET /models; otherwise enter the exact model ID manually. Choose one or two of the provided models (maximum supported: five). If using an API key, create and confirm a local unlock password of at least 6 characters before saving. This password is separate from the API key and is not sent to the AI service. Unauthenticated services do not need a password. Review and accept the data-sharing notice, select a target language and translation style, and save the settings. Fetching models itself contacts the configured service with the API key, but does not send source text.

3. Click Test connection after saving. It sends 'Hello, world!' to each selected model and requests Simplified Chinese. Expect a successful connection message. If settings were edited, save again before testing.

4. Open the toolbar popup. Enter 'A little understanding brings us closer.', select Simplified Chinese, and click Translate. Expect one translation card for each configured model. Wording varies by model. Click a card's copy icon: it changes to a check mark briefly, then returns to the copy icon.

5. Visit an ordinary HTTPS webpage, such as https://example.com, and refresh it after installation. Select a short passage outside an editable field. A small translation control appears near the selection and disappears after about 2.5 seconds. Click it before it disappears; reselect the text if needed. Expect an on-page translation panel and translated result cards. Selecting text alone does not send a translation request.

6. Select text again and use the right-click command 'Translate selection with Transight AI'. Expect the same shared floating translation layout. Pin the panel, click elsewhere on the page, and verify it stays open. Drag its top header to reposition it. Close it with the close button or Esc.

7. In an active on-page panel, change the target language; this requests new translations. Change interface language in the toolbar popup globe menu or Settings (not the page panel) to Japanese, Korean, and Traditional Chinese, then back to English. The interface language changes without changing the selected translation target or existing translations. Choose Follow browser to restore automatic detection: ja/ja-JP selects Japanese, ko/ko-KR selects Korean, Chinese variants select the matching script, and unsupported languages fall back to English. The compact unlock form and any open Settings page also follow the chosen interface language.

8. Optional multi-model check: if two valid model IDs were provided, select both and save. Expect independent result cards for the same source text. With three or more configured models, results beyond the first two are scrollable, subject to available viewport space.

9. Credential protection check: click Lock now in Settings. Translation must ask you to unlock, and model discovery and connection testing are disabled. An incorrect password must not unlock the key; expect a visible error below the compact form, with no clipped input or error text. Enter your password directly in the toolbar popup or on-page translation panel; waiting translations resume after unlock, and other views unlock too. Settings also supports unlocking. Restarting Chrome or reloading/updating the extension also locks it. Forgot password / remove saved key deletes the key after confirmation, keeping other settings; re-enter the review key and set a password afterward. Do not share your local unlock password.

10. Optional retry check: open the popup, temporarily disconnect the network, and translate the sample text. Expect an error card. Restore connectivity and click that card's Retry link; only that model is retried. If the key is locked before retrying, unlock within the panel; only that pending model retry should resume. Provider errors, unavailable models, or quota limits may also produce error cards. Do not change real credentials for this check.

11. Simple mode: turn on Use Simple Translate in Settings, then select text and click its icon. Expect only the first selected model, editable source and result, source/target dropdowns, copy and speaker controls, and no Translate button. Edit the source: after about 0.6 seconds without typing, expect a new request; IME composition does not send partial input. Changing either language also translates. Use the layout icon to switch back to Full and restore all selected models; switch back again to verify preference persistence. The toolbar popup always remains Full.

12. Full source language and cancellation: choose an explicit source language from its dropdown and translate. In a page panel, changing source or target language requests translation again. Verify the target preference in Settings and the toolbar popup. For a long-running request, click Cancel next to Translate; a canceled batch must not overwrite newer results. Cancel cannot retract data already received by the provider.

13. Local speech: after a translation completes, click the speaker next to Copy, then click it again to stop. Playback must not start automatically. Start speech in another result/view and verify the old speech stops. All target languages use a local Chinese voice (prefer zh-CN, otherwise another Chinese locale) without rewriting the result. Test both Chinese and non-Chinese results. If no local Chinese voice is installed, expect installation guidance rather than remote or non-Chinese fallback. Copy changes to a check mark for about 1.5 seconds.

14. Clipboard images: using the system screenshot tool, copy an image. Paste it in the toolbar popup source field or a Full page panel. Paste a second image, enter text beneath the single-row thumbnails, remove one with its hover/focus close button, and translate. Use a model that supports image inputs; otherwise expect an independent model error. Pasting alone must not send requests. Maximum 5 images; Simple does not support image paste. No screenshot entry remains in the popup header.

15. Selection toggle and prompt: disable selection translation in Settings. Its automatic icon and panel disappear, but toolbar and explicit right-click translation still work. Re-enable it. Edit the system prompt, save, translate, then restore the default and save again. Source/target language, text, available page title/description, and style placeholders are supported. The terms placeholder is empty because no glossary UI is implemented. Keep credentials out of prompts. Default text requests may include page title/description when available; image requests omit them.

Limitations: on-page controls cannot run on chrome:// pages, the Chrome Web Store, or other protected pages. Use manual input in the toolbar popup there. Automatic selection controls are intended for ordinary webpage text, not editable fields. Allow the extension's requested site access for on-page tests. Model discovery depends on provider support; manual model entry is supported. There is no phonetic transcription, full-page translation, or persistent translation-history feature. Speech requires an installed local Chinese voice; foreign-language pronunciation depends on that engine. The popup no longer has a screenshot capture entry; test images by pasting them into Full mode.

Data handling: submitted text, pasted images, applicable prompt/page metadata, and credentials go to the configured endpoint. Editing in Simple mode and changing languages or modes can start new translations. Models receive separate requests; quota usage can therefore increase with the number of selected models. There is no built-in analytics or persistent translation history. API configuration is saved locally; API keys are encrypted with AES-256-GCM and a PBKDF2-SHA-256 password-derived key. Unlocked keys are cached only in restricted session storage. Passwords and derived keys are not persisted.
```

## 测试服务与凭据维护

1. 使用专用低权限、限额凭据，不使用生产主密钥。确保额度能支持模型发现、连接测试与多模型翻译。
2. 从干净 Chrome 配置实际按以上步骤跑通，验证网络可达、模型 ID、额度与过期日期。此文档生成时**未验证真实提供方服务**。
3. 保持服务与凭据贯穿审核和可能的复核期，不要提交后立刻撤销；凭据轮换后及时更新后台。
4. 本地自动化测试中的 loopback mock 服务和 `mock-translator` 不是可供远程审核的真实服务。不得将演示回复冒充真实 AI 翻译，也不能把开发者电脑的 localhost 当作审核员可访问的服务器。
5. 若必须审核本地模型方案，另补完整安装、模型下载和启动步骤；当前模板优先提供已就绪的 HTTPS 服务，减少审核前置条件。

官方参考：https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions
