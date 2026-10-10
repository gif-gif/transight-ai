# 需请求 contextMenus 的理由

适用版本：**0.1.4** · 源码核对日期：**2026-10-06**。

## 中文填写内容

```text
用于在网页右键菜单中添加“翻译选中文字”命令。用户主动点击该命令后，扩展读取本次选中文字，在共用的页面翻译浮窗中展示，并通过用户配置的 AI 服务发起翻译；在无法显示页面浮窗时使用独立翻译窗口。不会因为用户仅打开右键菜单就提交翻译。
```

## English — 可直接粘贴到英文后台

```text
Add a Translate selection command to the webpage context menu. The command sends the user's selected text to the shared translation panel and starts translation using the configured service.
```

## 提交前注意（不必复制到理由框）

此权限用于创建和处理右键菜单命令，不是读取浏览历史或持续监控网页的权限。

## 对应实现

- `src/background.js`
- `src/shared/context-menu.js`

[返回权限说明目录](README.md)
