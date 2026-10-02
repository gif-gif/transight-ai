import type { Dictionary } from './en';
export const zhCN = {
  brand: '译见 AI', tagline: '让语言，少一点距离。',
  meta: {
    title: '译见 AI — 完全开源，划词即译',
    description: '完全开源的 Chrome AI 划词翻译扩展。选中文字，点击翻译图标，译文就在原处。不用复制粘贴，不必切换页面。',
    guideTitle: '开始使用 — 译见 AI', guideDescription: '从 Chrome 应用商店安装译见 AI，配置你的 AI 服务，选中文字、点击图标，即可在原处查看译文。',
  },
  nav: { features: '功能', how: '使用方式', guide: '开始使用', language: '显示语言', main: '主导航', skip: '跳转到主要内容' },
  hero: {
    eyebrow: '完全开源 · 为 Chrome 而生', title: '选中文字，轻轻一点，', accent: '译文，就在眼前。',
    description: '选中单词、句子或整段文字，点击旁边的翻译图标，原处即见译文。不用复制粘贴，不必切换页面，让阅读一气呵成。',
    primary: '开始使用译见', secondary: '看看如何划词翻译', note: '点击才翻译 · 自由连接你的 AI 服务', steps: ['选中文字', '点击翻译', '原处读懂'],
  },
  demo: {
    label: '翻译效果示意', badge: '划词 → 点击 → 读懂，全程不离开网页', source: '英语 · 选中的文字',
    original: 'Stay curious.\nThe world has more\nstories to tell.', target: '简体中文',
    translation: '保持好奇，世界还有更多故事等你发现。', style: '自然流畅', status: '界面示意，非实时翻译',
  },
  openSource: { eyebrow: '公开透明，自由探索', title: '完全开源，每一行都看得见。', description: '完整源代码公开在 GitHub。翻译如何实现、请求如何发送，都可以亲自查看。欢迎提出问题，也欢迎一起改进。', link: '在 GitHub 查看源码', nav: '开源仓库' },
  store: { search: '在 Chrome 商店查找' },
  facts: [ { value: '3', label: '种界面语言' }, { value: '10', label: '种翻译目标语言' }, { value: '5', label: '个模型同时对比' } ],
  features: {
    eyebrow: '少一点切换，多一点理解', title: '不用来回切换，顺着读下去。', description: '只保留恰到好处的功能，让注意力留在内容本身。',
    items: [
      { title: '选中，即刻读懂', text: '选中想读懂的文字，点击选区旁的图标，译文就地展开。不用复制原文，也不用另开翻译页面。' },
      { title: '好表达，不止一种', text: '同时查看最多 5 个模型的译文，从不同表达中，找到更贴近语境的那一种。' },
      { title: '你的模型，你来选择', text: '自定义服务地址、API Key 和模型 ID，连接兼容的 AI 服务，也支持本地服务。' },
    ],
  },
  how: {
    eyebrow: '轻松开始', title: '三步，让阅读继续。',
    steps: [
      { title: '从商店直接安装', text: '在 Chrome 应用商店找到译见 AI，点击「添加至 Chrome」即可安装。' },
      { title: '连接你的 AI', text: '填写服务地址、密钥和模型，在设置中测试连接。' },
      { title: '划词、点击，继续阅读', text: '选中文字，点击选区旁的翻译图标，译文原处呈现，无需切换页面。' },
    ],
  },
  cta: { title: '更大的世界，只差一次划词。', text: '从下一篇文章、下一封邮件、下一次偶然发现开始。', button: '查看使用指南' },
  footer: { note: '随手翻译，自在理解。', guide: '安装与配置', privacy: '仅在你主动发起翻译时，向配置的 AI 服务发送翻译请求。' },
  guide: {
    eyebrow: '开始使用', title: '几步准备，\n开启第一次翻译。', intro: '从 Chrome 应用商店直接安装，连接你选择的 AI 服务，就能在网页上划词翻译。无需下载源码，也不需要构建工具。',
    back: '返回首页', requirements: '准备工作', requirementText: '准备兼容的 Chrome 浏览器，以及可用的 AI 服务。扩展直接通过 Chrome 应用商店安装。',
    steps: [
      { title: '从 Chrome 应用商店安装', text: '在 Chrome 应用商店找到译见 AI（Transight AI），打开扩展详情页，点击「添加至 Chrome」，按浏览器提示确认安装。', detail: '可通过商店搜索入口，按名称查找扩展。' },
      { title: '固定到工具栏', text: '点击 Chrome 工具栏的扩展程序菜单，将「译见 AI」固定到工具栏。', detail: '工具栏方便随时打开设置和手动翻译；日常阅读时，直接在网页划词即可。' },
      { title: '配置 AI 服务', text: '打开插件设置，填写 Base URL、API Key（免认证本地服务可留空）和模型 ID，填写 Key 时设置并确认至少 6 个字符的解锁密码，保存后测试连接。重启浏览器后，可直接在弹窗、划词浮窗或设置页解锁。', detail: '服务需要兼容 POST /chat/completions。费用与隐私政策由你选择的服务提供方决定。' },
      { title: '选中文字，点击即译', text: '在普通网页选中单词、句子或一段文字，点击选区旁出现的翻译图标，译文就在原处展开。不用复制，也不必离开当前页面。', detail: '仅选中文字不会发送请求，点击后才开始翻译。浏览器内部页面和部分受限页面不支持划词翻译。' },
    ],
    privacyTitle: '关于你的数据', privacyText: '插件不包含预置 API 密钥。主动翻译时，选中的文字会发送至你配置的服务。翻译敏感内容前，请先了解该服务的隐私政策。',
  },
} satisfies Dictionary;
