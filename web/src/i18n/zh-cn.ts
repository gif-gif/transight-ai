import type { Dictionary } from './en';
export const zhCN = {
  brand: '译见 AI', tagline: '让语言，少一点距离。',
  meta: {
    title: '译见 AI — 让理解，不止于一种语言',
    description: '按需翻译的 Chrome AI 扩展。划词即译、多模型对比，自由连接你选择的 AI 服务，让阅读跨越语言。',
    guideTitle: '开始使用 — 译见 AI', guideDescription: '了解如何构建、安装译见 AI，配置 AI 服务，并开始第一次网页翻译。',
  },
  nav: { features: '功能', how: '使用方式', guide: '开始使用', language: '显示语言', main: '主导航', skip: '跳转到主要内容' },
  hero: {
    eyebrow: '让好奇心，自由抵达', title: '世界有很多语言，', accent: '理解，不必有距离。',
    description: '不打断阅读，也不错过灵感。在你需要的地方，用你选择的 AI，读懂每一段值得停留的文字。',
    primary: '开始使用译见', secondary: '了解它如何工作', note: '为 Chrome 而生 · 自由连接 AI 服务',
  },
  demo: {
    label: '翻译效果示意', badge: '一次小小的选择，让理解发生', source: '英语 · 选中的文字',
    original: 'Stay curious.\nThe world has more\nstories to tell.', target: '简体中文',
    translation: '保持好奇，世界还有更多故事等你发现。', style: '自然流畅', status: '界面示意，非实时翻译',
  },
  facts: [ { value: '3', label: '种界面语言' }, { value: '10', label: '种翻译目标语言' }, { value: '5', label: '个模型同时对比' } ],
  features: {
    eyebrow: '少一点切换，多一点理解', title: '顺着你的阅读习惯。', description: '只保留恰到好处的功能，让注意力留在内容本身。',
    items: [
      { title: '选中，即刻读懂', text: '在网页上选中文字，点击翻译按钮即可开始。工具栏和右键菜单，也能随时唤起。' },
      { title: '好表达，不止一种', text: '同时查看最多 5 个模型的译文，从不同表达中，找到更贴近语境的那一种。' },
      { title: '你的模型，你来选择', text: '自定义服务地址、API Key 和模型 ID，连接兼容的 AI 服务，也支持本地服务。' },
    ],
  },
  how: {
    eyebrow: '轻松开始', title: '三步，让阅读继续。',
    steps: [
      { title: '添加到浏览器', text: '构建插件，在 Chrome 开发者模式下加载 dist 目录。' },
      { title: '连接你的 AI', text: '填写服务地址、密钥和模型，在设置中测试连接。' },
      { title: '继续你的好奇', text: '选中文字，点击翻译，自由选择目标语言与表达风格。' },
    ],
  },
  cta: { title: '更大的世界，只差一次划词。', text: '从下一篇文章、下一封邮件、下一次偶然发现开始。', button: '查看使用指南' },
  footer: { note: '随手翻译，自在理解。', guide: '安装与配置', privacy: '仅在你主动发起翻译时，向配置的 AI 服务发送翻译请求。' },
  guide: {
    eyebrow: '开始使用', title: '几步准备，\n开启第一次翻译。', intro: '当前指南使用项目源码进行本地安装，尚未配置 Chrome 应用商店下载链接。',
    back: '返回首页', requirements: '准备工作', requirementText: 'Chrome 114 或更新版本、用于构建插件的 Node.js 20 或更新版本，以及可用的兼容 AI 服务。',
    steps: [
      { title: '构建插件', text: '在插件项目根目录（不是 web 目录）执行：', detail: '命令会生成插件的 dist 目录。官网和插件分别构建，互不影响。' },
      { title: '加载到 Chrome', text: '打开 chrome://extensions，开启「开发者模式」，点击「加载已解压的扩展程序」，选择项目根目录下的 dist 文件夹。', detail: '在浏览器工具栏中固定「译见 AI」，下次使用更方便。' },
      { title: '配置 AI 服务', text: '打开插件设置，填写 Base URL、API Key（免认证本地服务可留空）和模型 ID，保存后测试连接。', detail: '服务需要兼容 POST /chat/completions。费用与隐私政策由你选择的服务提供方决定。' },
      { title: '按需发起翻译', text: '在普通 HTTP 或 HTTPS 网页选中文字，点击出现的翻译按钮；也可以打开工具栏弹窗，输入或粘贴文字。', detail: '仅选中文字不会发送请求。浏览器内部页面和部分受限页面不允许注入划词功能。' },
    ],
    privacyTitle: '关于你的数据', privacyText: '插件不包含预置 API 密钥。主动翻译时，选中的文字会发送至你配置的服务。翻译敏感内容前，请先了解该服务的隐私政策。',
  },
} satisfies Dictionary;
