# Chrome Web Store 权限申请说明

适用版本：**Transight AI 0.1.2** · 源码核对日期：**2026-10-06**。

按开发者后台的权限理由栏目逐项填写。每份文件包含**可复制的中文理由、英文理由、提交前注意事项、对应代码位置**。英文内容复用并核对现有[隐私权规范指南](../dashboard/02-privacy-practices.md)，不是另一套数据处理政策。

| 序号 | 当前 manifest 声明 | 说明文件 |
| --- | --- | --- |
| 1 | `storage` | [需请求 storage 的理由](01-storage.md) |
| 2 | `contextMenus` | [需请求 contextMenus 的理由](02-contextMenus.md) |
| 3 | `activeTab` | [需请求 activeTab 的理由](03-activeTab.md) |
| 4 | `scripting` | [需请求 scripting 的理由](04-scripting.md) |
| 5 | `https://*/*、http://*/*` | [需请求主机权限的理由](05-host-permissions.md) |
| 6 | `tts` | [需请求 tts 的理由](06-tts.md) |

## 使用方式

1. 在商店后台对应的权限理由栏中，粘贴该文件的中文或英文代码块，二选一即可。
2. 主机权限若仅有一个理由框，使用第 5 项合并文案；若分别显示 HTTP 和 HTTPS，按文件中的范围说明拆分。
3. “提交前注意”用于开发者核对，不要将注意事项、代码路径或占位内容一起机械粘贴。文案需与实际上架版本、隐私政策及后台字段一致。
4. 本目录只解释当前 manifest 中的 5 个 API 权限与 2 个主机匹配范围。不为未声明的 `tabs`、`history`、`cookies`、`clipboardRead`、`clipboardWrite` 等权限编造理由。

## 特别注意 activeTab

当前版本同时具有全站 HTTP/HTTPS 主机权限。第 3 项明确保留了权限重叠的复核提醒，不能把用途描述当成“该权限必不可少”的证明。当前 popup 已无可见截图入口，不应以“用户点击截图按钮”解释申请理由。是否移除 activeTab 应另行评估、测试并重新打包，本次不修改权限或运行代码。

## 本次改动范围

仅增加提交辅助文档及入口，并更新素材清单；不改变权限、不生成新安装包、不提交商店审核，也不保证审核通过。当前 `package/transight-0.1.2.zip` 不需要包含这些文档。
