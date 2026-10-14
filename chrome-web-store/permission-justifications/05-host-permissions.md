# 需请求主机权限的理由

源码核对日期：**2026-10-14**。

## 中文填写内容

```text
用于在普通 HTTP/HTTPS 网页显示划词翻译入口和页面浮窗，无需用户逐站设置；同时允许连接用户自行配置的 AI 服务，以拉取模型列表、测试连接和翻译。用户服务域名不固定，因此不能预先限定为某个供应商。远程 API 必须使用 HTTPS；HTTP API 只允许 localhost 或 127.0.0.1。仅选中文字或粘贴图片不上传；用户打开选区翻译、点击翻译或重试，以及 Simple 模式编辑原文、切换语言或模式时，可能发起请求。文字/选区翻译可能包含可用的页面标题和 description 元数据，不为这些提示词抓取整页正文；图片请求不携带该页面上下文。AI 请求不将标签页 URL 作为独立字段发送。用户点击 Google 整页翻译时，会将原网页 URL 与目标语言带到 Google 新标签页；点击 Google 免费文字翻译则传递原文与语言。不会附带 AI 凭据、图片或自定义提示词。AI 原位网页翻译仅在明确确认后扫描普通可见文本，并分批发送至配置的第一个模型；授权会话内新增或新显示的文本也会处理。这些请求不上传整页 HTML/DOM、页面网址或 Cookie。即使跳过表单、编辑器和代码，普通文本仍可能包含敏感信息。Google 链接可能保留在浏览器历史记录中。
```

## English — 可直接粘贴到英文后台

```text
Show the selection-translation control on ordinary HTTP/HTTPS webpages without per-site setup, and open the shared on-page translation panel. Host access also permits model discovery, connection tests, and translation at the user-configured AI endpoint, whose hostname is not fixed. Non-local API endpoints must use HTTPS; HTTP API endpoints are accepted only for localhost or 127.0.0.1. Selecting text alone does not upload it. Translation is triggered by user actions, including opening a selected-text panel, editing source text in Simple mode, changing source/target languages or modes, translating, or retrying. Text/selection prompts may include available page title and description metadata, without scanning the whole webpage for those prompt fields. Image requests omit that page context. AI requests do not send the tab URL as a separate field. Google entries open a normal browser tab only when clicked: free text translation sends the source text and selected languages; whole-page translation sends the original HTTP/HTTPS page URL and target language. They do not send AI credentials, passwords, images, or custom prompts. Google navigation URLs may remain in browser history; Google website policies and normal cookie behavior apply. AI webpage translation scans ordinary rendered text only after explicit confirmation, sends it in batches to the configured first model, and processes newly revealed text during that authorized session. These requests do not upload whole HTML/DOM, page URLs or cookies. Page text can contain sensitive information even though forms, editors and code are skipped.
```

## 提交前注意（不必复制到理由框）

若后台只有一个主机权限理由框，填写合并理由即可。https://*/* 对应普通 HTTPS 网页及用户自定义 HTTPS API；http://*/* 同时用于普通 HTTP 网页和受限制的本地 HTTP API，并非允许任意远程 HTTP API。原文本身包含 URL 时，该 URL 会随原文发送。广泛主机权限的范围应与实际用途一致，不能声称仅在点击时才具有全部网站访问权。

## 对应实现

- `src/shared/page-background.js`
- `src/content/page-translation.js`
- `src/content/page-engine.js`

- `manifest.json`
- `src/content/selection.js`
- `src/shared/settings.js`
- `src/shared/models.js`
- `src/shared/translator.js`

[返回权限说明目录](README.md)
