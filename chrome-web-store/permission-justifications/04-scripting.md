# 需请求 scripting 的理由

适用版本：**0.1.2** · 源码核对日期：**2026-10-06**。

## 中文填写内容

```text
用户打开工具栏弹窗时，执行扩展包内的选区读取函数，获取当前选中文字和适用的页面标题、description 元数据；用户选择右键翻译时，在目标框架中注入扩展包内的共用翻译界面代码，以打开页面浮窗。升级迁移时还用于移除旧版按网站注册的内容脚本。仅执行随扩展发布的代码，不下载或执行远程脚本，不执行 AI 返回内容。
```

## English — 可直接粘贴到英文后台

```text
Run a packaged selection-reading function when the toolbar popup is opened, and inject the packaged shared translation view into the selected frame for context-menu translation. Also remove legacy per-site content-script registrations during migration. No remotely downloaded scripts are injected.
```

## 提交前注意（不必复制到理由框）

日常划词入口通过 manifest 声明的内容脚本加载；不要把所有划词行为都表述为 scripting 动态注入。scripting 提供执行脚本的能力，对目标页面的访问仍需要相应的网站授权。

## 对应实现

- `src/popup/popup.js`
- `src/shared/context-menu.js`
- `src/shared/selection-background.js`

[返回权限说明目录](README.md)
