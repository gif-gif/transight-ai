# 需请求 storage 的理由

适用版本：**0.1.2** · 源码核对日期：**2026-10-06**。

## 中文填写内容

```text
用于保存用户的 AI 服务地址、密码加密后的 API Key、模型列表、目标语言、翻译风格、Simple/Full 模式、划词开关、自定义系统提示词、界面语言及同意状态。API Key 使用 AES-256-GCM 和基于密码的 PBKDF2-SHA-256 密钥加密后保存在本地；不保存解锁密码或派生密钥。解锁后的 API Key 仅缓存在受信任扩展上下文可访问的会话存储，锁定后清除。会话存储还临时保存受限页面独立翻译窗口所需的选中文字，窗口读取后删除。不使用 Chrome 同步，不持久保存翻译历史或图片，网页内容脚本不能直接读取 API 凭据。
```

## English — 可直接粘贴到英文后台

```text
Save the user's AI endpoint, password-encrypted API key, selected model IDs, translation preferences (target language, Simple/Full mode, selection toggle and custom system prompt), interface language, and consent in chrome.storage.local. The API key is encrypted using AES-256-GCM with a password-derived PBKDF2-SHA-256 key. Passwords and derived keys are never saved. Unlocked API keys are held in trusted-context chrome.storage.session until locked or the browser session ends. chrome.storage.session temporarily holds selected text for the standalone fallback window and removes it when the window reads it. Settings are not stored in Chrome sync. Content scripts cannot directly read local API credentials.
```

## 提交前注意（不必复制到理由框）

本地设置存储与实际翻译请求是两回事：原文、图片及适用的提示词上下文会在用户触发翻译时发送给其配置的 AI 服务；不能据此声称所有数据永远留在本机。

## 对应实现

- `src/shared/settings.js`
- `src/shared/credentials.js`
- `src/shared/i18n.js`
- `src/shared/context-menu.js`
- `src/background.js`

[返回权限说明目录](README.md)
