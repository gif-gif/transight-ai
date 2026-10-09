# 需请求主机权限的理由

适用版本：**0.1.3** · 源码核对日期：**2026-10-06**。

## 中文填写内容

```text
用于在普通 HTTP/HTTPS 网页显示划词翻译入口和页面浮窗，无需用户逐站设置；同时允许连接用户自行配置的 AI 服务，以拉取模型列表、测试连接和翻译。用户服务域名不固定，因此不能预先限定为某个供应商。远程 API 必须使用 HTTPS；HTTP API 只允许 localhost 或 127.0.0.1。仅选中文字或粘贴图片不上传；用户打开选区翻译、点击翻译或重试，以及 Simple 模式编辑原文、切换语言或模式时，可能发起请求。文字翻译可能包含可用的页面标题和 description 元数据，不抓取整页正文；图片请求不携带该页面上下文。不将标签页 URL 作为独立请求字段上传。
```

## English — 可直接粘贴到英文后台

```text
Show the selection-translation control on ordinary HTTP/HTTPS webpages without per-site setup, and open the shared on-page translation panel. Host access also permits model discovery, connection tests, and translation at the user-configured AI endpoint, whose hostname is not fixed. Non-local API endpoints must use HTTPS; HTTP API endpoints are accepted only for localhost or 127.0.0.1. Selecting text alone does not upload it. Translation is triggered by user actions, including opening a selected-text panel, editing source text in Simple mode, changing source/target languages or modes, translating, or retrying. Default text prompts may include available page title and description metadata, but not a scrape of the whole webpage. Image requests omit that page context. The extension does not upload entire pages or tab URLs as separate request fields.
```

## 提交前注意（不必复制到理由框）

若后台只有一个主机权限理由框，填写合并理由即可。https://*/* 对应普通 HTTPS 网页及用户自定义 HTTPS API；http://*/* 同时用于普通 HTTP 网页和受限制的本地 HTTP API，并非允许任意远程 HTTP API。原文本身包含 URL 时，该 URL 会随原文发送。广泛主机权限的范围应与实际用途一致，不能声称仅在点击时才具有全部网站访问权。

## 对应实现

- `manifest.json`
- `src/content/selection.js`
- `src/shared/settings.js`
- `src/shared/models.js`
- `src/shared/translator.js`

[返回权限说明目录](README.md)
