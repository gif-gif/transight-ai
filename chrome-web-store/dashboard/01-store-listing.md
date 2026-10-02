# Store listing / 商店详情填写指南

核对日期：2026-10-02 · 对应版本：0.1.0。路径均相对于 `chrome-web-store/`。复用已有介绍与图片，不重复生成。以下是填写建议，尚未在后台执行。

## 逐字段填写

| 后台字段 | 填写内容 / 上传文件 |
| --- | --- |
| Name / 名称 | 从安装包本地化 manifest 读取：English **Transight AI**；简体 **译见 AI · 随手翻译**；繁体 **譯見 AI · 隨手翻譯** |
| Short description / 简短描述 | 沿用 `listing/metadata.json`；英文 99 字符，简体、繁体各 35 字符；不直接改 ZIP 内的 manifest |
| Detailed description / 详细介绍 | English 粘贴 `listing/description.en.txt` 全文；简体用 `description.zh-CN.txt`；繁体用 `description.zh-TW.txt` |
| Category / 分类 | 建议 **Productivity / 生产力**，如显示细分类则选择 **Tools / 工具**；以后台实际选项为准 |
| Primary language / 主要语言 | **English**；另外补齐简体、繁体中文商品详情 |
| Store icon / 图标 | `icons/icon-128.png`，128×128 |
| Screenshots / 截图 | 各语言分别上传对应 `screenshots/en/`、`screenshots/zh-CN/`、`screenshots/zh-TW/` 中 01～04 四张图，每张 1280×800；不要将十二张混进同一语言栏位 |
| Small promo tile / 小型宣传图 | `promo/small-440x280.png` |
| Marquee promo tile / 大型宣传图 | `promo/marquee-1400x560.png`，可选 |
| Promo video / 宣传视频 | 当前未准备；没有真实视频时不要填占位地址，按后台必填提示处理 |
| Homepage URL / 主页 | 可使用现有公开项目页 `https://github.com/gif-gif/transight-ai`；独立官网上线并验证后再替换 |
| Support URL / 支持页面 | 候选 `https://github.com/gif-gif/transight-ai/issues`，先确认已启用 Issues 并会处理反馈，再填写 |
| Official URL / 已验证官网 | 仅选择开发者已经验证归属的站点；当前不假设已验证 GitHub 域名或独立官网 |
| Mature content / 成人内容 | 当前产品自身不提供成人内容，建议不勾选；不要将“翻译任意用户输入”宣传为成人内容服务 |
| Privacy policy URL / 隐私政策 | **待提供公开、免登录可访问的独立隐私政策页面**；详见 `02-privacy-practices.md`，不能用 Apache LICENSE 替代 |

截图顺序：01 多模型对比、02 页面翻译、03 密码保护与模型设置、04 浮窗内解锁。工具栏弹窗同样支持直接解锁；解锁后继续等待中的翻译。

宣传图共用英文品牌版本；详细介绍和截图按语言分别维护。三种语言描述的功能必须一致。

## 上架前检查

- **当前 ZIP 尚未包含此次密码保护和内嵌解锁更新，不可直接上传。** 重新打包并通过 `tools/validate.py` 后使用 `package/transight-0.1.0.zip`，不是把整个商店材料目录压缩后上传。
- 若同一版本号已在后台上传过，先修改源码版本再重新打包；本次文档补充不修改版本。
- 明确 BYOK：插件不附赠 API Key 或额度；第三方服务可能收费，多模型分别发起请求。
- 不宣传当前未实现的功能：整页翻译、翻译历史、流式输出、语音播报、音标等。商品描述以当前代码为准，不能把历史需求当作已上线功能。
- 商店素材中的模型回复是测试示例，不能代表真实模型质量。

## 官方参考

- https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- https://developer.chrome.com/docs/webstore/images
