# 需请求 activeTab 的理由

适用版本：**0.1.3** · 源码核对日期：**2026-10-06**。

## 中文填写内容

```text
用户主动打开工具栏弹出窗口时，用于访问当前标签页，读取当前选中的文字并填入原文框；在适用时读取网页标题和 description 元数据，供翻译提示词使用。仅填入原文不会自动提交翻译。在浏览器受保护页面无法读取选区时，仍可手动输入。当前版本没有可见的截图按钮；剪贴板图片来自用户主动粘贴，不能将其描述为依靠 activeTab 读取剪贴板。
```

## English — 可直接粘贴到英文后台

```text
When the user opens the toolbar popup, access the active tab to read its current text selection and prefill the source field. Read available page title/description metadata for the translation prompt when applicable. Prefilling does not itself submit a translation. Protected browser pages can still use manual text input. The popup no longer exposes a screenshot capture button; clipboard image translation uses user-initiated paste events instead. Packaged capture/cropping handlers remain in the code, but are not a visible user entry in this release.
```

## 提交前注意（不必复制到理由框）

重要：当前 manifest 同时声明了所有 HTTP/HTTPS 网站的主机权限，可能已覆盖上述普通网页脚本注入的授权需求。本说明描述用途，不证明 activeTab 在当前权限组合中必不可少。打包代码仍保留使用 captureVisibleTab 的截图处理器，但本版没有可见入口；不要把未开放的截图功能当成面向用户的申请理由。提交前应单独复核是否保留此权限；若移除，需要修改 manifest、测试和重新打包。本次只写说明，不修改权限。

## 对应实现

- `src/popup/popup.js`
- `src/shared/screenshot.js`
- `manifest.json`

[返回权限说明目录](README.md)
