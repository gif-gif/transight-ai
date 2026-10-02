import type { Dictionary } from './en';
export const zhTW = {
  brand: '譯見 AI', tagline: '讓語言，少一點距離。',
  meta: {
    title: '譯見 AI — 完全開源，選取即譯',
    description: '完全開源的 Chrome AI 選取翻譯擴充功能。選取文字，點選翻譯圖示，譯文就在原處。不用複製貼上，不必切換頁面。',
    guideTitle: '開始使用 — 譯見 AI', guideDescription: '從 Chrome 線上應用程式商店安裝譯見 AI，設定你的 AI 服務，選取文字、點選圖示，即可在原處查看譯文。',
  },
  nav: { features: '功能', how: '使用方式', guide: '開始使用', language: '顯示語言', main: '主導覽', skip: '跳至主要內容' },
  hero: {
    eyebrow: '完全開源 · 為 Chrome 而生', title: '選取文字，輕輕一點，', accent: '譯文，就在眼前。',
    description: '選取單字、句子或整段文字，點選旁邊的翻譯圖示，原處即見譯文。不用複製貼上，不必切換頁面，讓閱讀一氣呵成。',
    primary: '開始使用譯見', secondary: '看看如何選取翻譯', note: '點選才翻譯 · 自由連接你的 AI 服務', steps: ['選取文字', '點選翻譯', '原處讀懂'],
  },
  demo: {
    label: '翻譯效果示意', badge: '選取 → 點選 → 讀懂，全程不離開網頁', source: '英語 · 選取的文字',
    original: 'Stay curious.\nThe world has more\nstories to tell.', target: '繁體中文',
    translation: '保持好奇，世界還有更多故事等你發現。', style: '自然流暢', status: '介面示意，非即時翻譯',
  },
  openSource: { eyebrow: '公開透明，自由探索', title: '完全開源，每一行都看得見。', description: '完整原始碼公開在 GitHub。翻譯如何實作、請求如何傳送，都可以親自查看。歡迎提出問題，也歡迎一起改進。', link: '在 GitHub 查看原始碼', nav: '開源專案' },
  store: { search: '在 Chrome 商店尋找' },
  facts: [ { value: '3', label: '種介面語言' }, { value: '10', label: '種翻譯目標語言' }, { value: '5', label: '個模型同時比較' } ],
  features: {
    eyebrow: '少一點切換，多一點理解', title: '不用來回切換，順著讀下去。', description: '只保留恰到好處的功能，讓注意力留在內容本身。',
    items: [
      { title: '選取，即刻讀懂', text: '選取想讀懂的文字，點選選取範圍旁的圖示，譯文就地展開。不用複製原文，也不用另開翻譯頁面。' },
      { title: '好表達，不止一種', text: '同時查看最多 5 個模型的譯文，從不同表達中，找到更貼近語境的那一種。' },
      { title: '你的模型，你來選擇', text: '自訂服務網址、API Key 和模型 ID，連接相容的 AI 服務，也支援本機服務。' },
    ],
  },
  how: {
    eyebrow: '輕鬆開始', title: '三步，讓閱讀繼續。',
    steps: [
      { title: '從商店直接安裝', text: '在 Chrome 線上應用程式商店找到譯見 AI，點選「加到 Chrome」即可安裝。' },
      { title: '連接你的 AI', text: '填寫服務網址、金鑰和模型，在設定中測試連線。' },
      { title: '選取、點選，繼續閱讀', text: '選取文字，點選旁邊的翻譯圖示，譯文原處呈現，無需切換頁面。' },
    ],
  },
  cta: { title: '更大的世界，只差一次選取。', text: '從下一篇文章、下一封郵件、下一次偶然發現開始。', button: '查看使用指南' },
  footer: { note: '隨手翻譯，自在理解。', guide: '安裝與設定', privacy: '僅在你主動發起翻譯時，向設定的 AI 服務傳送翻譯請求。' },
  guide: {
    eyebrow: '開始使用', title: '幾步準備，\n開啟第一次翻譯。', intro: '從 Chrome 線上應用程式商店直接安裝，連接你選擇的 AI 服務，就能在網頁上選取翻譯。無需下載原始碼，也不需要建置工具。',
    back: '返回首頁', requirements: '準備工作', requirementText: '準備相容的 Chrome 瀏覽器，以及可用的 AI 服務。擴充功能直接透過 Chrome 線上應用程式商店安裝。',
    steps: [
      { title: '從 Chrome 線上應用程式商店安裝', text: '在 Chrome 線上應用程式商店找到譯見 AI（Transight AI），開啟擴充功能詳情頁，點選「加到 Chrome」，依瀏覽器提示確認安裝。', detail: '可透過商店搜尋入口，按名稱尋找擴充功能。' },
      { title: '固定到工具列', text: '點選 Chrome 工具列的擴充功能選單，將「譯見 AI」固定到工具列。', detail: '工具列方便隨時開啟設定和手動翻譯；日常閱讀時，直接在網頁選取文字即可。' },
      { title: '設定 AI 服務', text: '開啟擴充功能設定，填寫 Base URL、API Key（免驗證本機服務可留空）和模型 ID，填寫 Key 時設定並確認至少 6 個字元的解鎖密碼，儲存後測試連線。重新啟動瀏覽器後，可直接在彈出視窗、選取翻譯浮窗或設定頁解鎖。', detail: '服務需要相容於 POST /chat/completions。費用與隱私政策由你選擇的服務提供者決定。' },
      { title: '選取文字，點選即譯', text: '在一般網頁選取單字、句子或一段文字，點選旁邊出現的翻譯圖示，譯文就在原處展開。不用複製，也不必離開目前頁面。', detail: '僅選取文字不會傳送請求，點選後才開始翻譯。瀏覽器內部頁面和部分受限頁面不支援選取翻譯。' },
    ],
    privacyTitle: '關於你的資料', privacyText: '擴充功能不包含預設 API 金鑰。主動翻譯時，選取的文字會傳送至你設定的服務。翻譯敏感內容前，請先瞭解該服務的隱私政策。',
  },
} satisfies Dictionary;
