import type { Dictionary } from './en';
export const zhTW = {
  brand: '譯見 AI', tagline: '讓語言，少一點距離。',
  meta: {
    title: '譯見 AI — 讓理解，不止於一種語言',
    description: '按需翻譯的 Chrome AI 擴充功能。選取即譯、多模型比較，自由連接你選擇的 AI 服務，讓閱讀跨越語言。',
    guideTitle: '開始使用 — 譯見 AI', guideDescription: '瞭解如何建置、安裝譯見 AI，設定 AI 服務，並開始第一次網頁翻譯。',
  },
  nav: { features: '功能', how: '使用方式', guide: '開始使用', language: '顯示語言', main: '主導覽', skip: '跳至主要內容' },
  hero: {
    eyebrow: '讓好奇心，自由抵達', title: '世界有很多語言，', accent: '理解，不必有距離。',
    description: '不打斷閱讀，也不錯過靈感。在你需要的地方，用你選擇的 AI，讀懂每一段值得停留的文字。',
    primary: '開始使用譯見', secondary: '瞭解它如何運作', note: '為 Chrome 而生 · 自由連接 AI 服務',
  },
  demo: {
    label: '翻譯效果示意', badge: '一次小小的選擇，讓理解發生', source: '英語 · 選取的文字',
    original: 'Stay curious.\nThe world has more\nstories to tell.', target: '繁體中文',
    translation: '保持好奇，世界還有更多故事等你發現。', style: '自然流暢', status: '介面示意，非即時翻譯',
  },
  facts: [ { value: '3', label: '種介面語言' }, { value: '10', label: '種翻譯目標語言' }, { value: '5', label: '個模型同時比較' } ],
  features: {
    eyebrow: '少一點切換，多一點理解', title: '順著你的閱讀習慣。', description: '只保留恰到好處的功能，讓注意力留在內容本身。',
    items: [
      { title: '選取，即刻讀懂', text: '在網頁上選取文字，點選翻譯按鈕即可開始。工具列和右鍵選單，也能隨時喚起。' },
      { title: '好表達，不止一種', text: '同時查看最多 5 個模型的譯文，從不同表達中，找到更貼近語境的那一種。' },
      { title: '你的模型，你來選擇', text: '自訂服務網址、API Key 和模型 ID，連接相容的 AI 服務，也支援本機服務。' },
    ],
  },
  how: {
    eyebrow: '輕鬆開始', title: '三步，讓閱讀繼續。',
    steps: [
      { title: '新增至瀏覽器', text: '建置擴充功能，在 Chrome 開發人員模式下載入 dist 目錄。' },
      { title: '連接你的 AI', text: '填寫服務網址、金鑰和模型，在設定中測試連線。' },
      { title: '繼續你的好奇', text: '選取文字，點選翻譯，自由選擇目標語言與表達風格。' },
    ],
  },
  cta: { title: '更大的世界，只差一次選取。', text: '從下一篇文章、下一封郵件、下一次偶然發現開始。', button: '查看使用指南' },
  footer: { note: '隨手翻譯，自在理解。', guide: '安裝與設定', privacy: '僅在你主動發起翻譯時，向設定的 AI 服務傳送翻譯請求。' },
  guide: {
    eyebrow: '開始使用', title: '幾步準備，\n開啟第一次翻譯。', intro: '目前指南使用專案原始碼進行本機安裝，尚未設定 Chrome 線上應用程式商店下載連結。',
    back: '返回首頁', requirements: '準備工作', requirementText: 'Chrome 114 或更新版本、用於建置擴充功能的 Node.js 20 或更新版本，以及可用的相容 AI 服務。',
    steps: [
      { title: '建置擴充功能', text: '在擴充功能專案根目錄（不是 web 目錄）執行：', detail: '指令會產生擴充功能的 dist 目錄。官網與擴充功能分別建置，互不影響。' },
      { title: '載入 Chrome', text: '開啟 chrome://extensions，啟用「開發人員模式」，點選「載入未封裝項目」，選擇專案根目錄下的 dist 資料夾。', detail: '在瀏覽器工具列中固定「譯見 AI」，下次使用更方便。' },
      { title: '設定 AI 服務', text: '開啟擴充功能設定，填寫 Base URL、API Key（免驗證本機服務可留空）和模型 ID，儲存後測試連線。', detail: '服務需要相容於 POST /chat/completions。費用與隱私政策由你選擇的服務提供者決定。' },
      { title: '按需發起翻譯', text: '在一般 HTTP 或 HTTPS 網頁選取文字，點選出現的翻譯按鈕；也可以開啟工具列彈出視窗，輸入或貼上文字。', detail: '僅選取文字不會傳送請求。瀏覽器內部頁面和部分受限頁面不允許注入選取翻譯功能。' },
    ],
    privacyTitle: '關於你的資料', privacyText: '擴充功能不包含預設 API 金鑰。主動翻譯時，選取的文字會傳送至你設定的服務。翻譯敏感內容前，請先瞭解該服務的隱私政策。',
  },
} satisfies Dictionary;
