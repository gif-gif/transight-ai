# 宣传图 · Promotional tiles

更新日期：2026-10-14。沿用 Transight AI 图标、绿色背景和原有排版；无版本号水印。

每种语言提供两种尺寸，均为 RGB PNG：

| 语言 | 小型宣传图 · 440 × 280 | 大型宣传图 · 1400 × 560 |
| --- | --- | --- |
| English | [small-440x280.png](small-440x280.png) | [marquee-1400x560.png](marquee-1400x560.png) |
| 简体中文 | [zh-CN/small-440x280.png](zh-CN/small-440x280.png) | [zh-CN/marquee-1400x560.png](zh-CN/marquee-1400x560.png) |
| 繁體中文 | [zh-TW/small-440x280.png](zh-TW/small-440x280.png) | [zh-TW/marquee-1400x560.png](zh-TW/marquee-1400x560.png) |
| 日本語 | [ja/small-440x280.png](ja/small-440x280.png) | [ja/marquee-1400x560.png](ja/marquee-1400x560.png) |
| 한국어 | [ko/small-440x280.png](ko/small-440x280.png) | [ko/marquee-1400x560.png](ko/marquee-1400x560.png) |

英文直接复用根目录现有文件，不复制到额外的 `en/` 目录。新增四种语言，共 8 张新图；合计 10 张。根据商店后台实际提供的上传位置选择相应素材；准备多个语言版本不代表后台一定提供逐语言宣传图栏位。

从项目根目录执行以下命令可单独生成本地化宣传图（需要 macOS 字体和 Pillow），不重新采集截图、不改变英文图、不构建或打包插件：

```sh
python3 chrome-web-store/tools/prepare-promos.py
python3 chrome-web-store/tools/validate.py
```
