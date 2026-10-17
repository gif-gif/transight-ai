import type { Dictionary } from './en';
export const zhTW = {
  brand: '譯見 AI', tagline: '讓語言，少一點距離。',
  meta: {
    title: '譯見 AI — 完全開源，選取即譯',
    description: "選取一段文字，或用 AI 在原網頁翻譯整頁；也可免 API Key 開啟 Google 翻譯。傳送多少內容、在哪裡閱讀，由你選擇。",
    guideTitle: '開始使用 — 譯見 AI', guideDescription: "從 Chrome 線上應用程式商店直接安裝。設定自選 AI 服務即可原處翻譯；也可無需 API Key，在新分頁使用 Google 文字或整頁翻譯。無需下載原始碼或建置工具。",
  },
  nav: { features: '功能', how: '使用方式', guide: '開始使用', language: '顯示語言', main: '主導覽', skip: '跳至主要內容' },
  hero: {
    eyebrow: '完全開源 · 為 Chrome 而生', title: '選取文字，輕輕一點，', accent: '譯文，就在眼前。',
    description: '選取單字、句子或整段文字，點選旁邊的翻譯圖示，原處即見譯文。不用複製貼上，不必切換頁面，讓閱讀一氣呵成。',
    primary: '開始使用譯見', secondary: '看看如何選取翻譯', note: "僅選取文字不傳送 · AI 服務由你選擇", steps: ['選取文字', '點選翻譯', '原處讀懂'],
  },
  demo: {
    label: '翻譯效果示意', badge: '選取 → 點選 → 讀懂，全程不離開網頁', source: '英語 · 選取的文字',
    original: 'Stay curious.\nThe world has more\nstories to tell.', target: '繁體中文',
    translation: '保持好奇，世界還有更多故事等你發現。', style: '自然流暢', status: '介面示意，非即時翻譯',
  },
  openSource: { eyebrow: '公開透明，自由探索', title: '完全開源，每一行都看得見。', description: '完整原始碼公開在 GitHub。翻譯如何實作、請求如何傳送，都可以親自查看。歡迎提出問題，也歡迎一起改進。', link: '在 GitHub 查看原始碼', nav: '開源專案' },
  store: { open: '前往 Chrome 線上應用程式商店' },
  facts: [ { value: '5', label: '種介面語言' }, { value: '10', label: '種翻譯目標語言' }, { value: '5', label: '個模型同時比較' } ],
  features: {
    eyebrow: '少一點切換，多一點理解', title: '不用來回切換，順著讀下去。', description: '只保留恰到好處的功能，讓注意力留在內容本身。',
    items: [
  {
    "title": "選取，即刻讀懂",
    "text": "選取想讀懂的文字，點選選取範圍旁的圖示，譯文就地展開。不用複製原文，也不用另開翻譯頁面。"
  },
  {
    "title": "好表達，不止一種",
    "text": "同時查看最多 5 個模型的譯文，從不同表達中，找到更貼近語境的那一種。"
  },
  {
    "title": "你的模型，你來選擇",
    "text": "自訂服務網址、API Key 和模型 ID，連接相容的 AI 服務，也支援本機服務。"
  },
  {
    "title": "AI 網頁翻譯，就在原頁面閱讀。",
    "text": "使用已選清單中的第一個模型，原位翻譯網頁一般文字。先核對服務商與目標語言，確認後才傳送頁面內容。"
  }
],
  },
  how: {
    eyebrow: '輕鬆開始', title: '三步，讓閱讀繼續。',
    steps: [
      { title: '從商店直接安裝', text: '在 Chrome 線上應用程式商店找到譯見 AI，點選「加到 Chrome」即可安裝。' },
      { title: "選擇 AI 或 Google 翻譯", text: "原處 AI 翻譯需設定自己的服務；也可免 API Key 使用 Google 文字或整頁翻譯入口。" },
      { title: '選取、點選，繼續閱讀', text: '選取文字，點選旁邊的翻譯圖示，譯文原處呈現，無需切換頁面。' },
    ],
  },
  cta: { title: '更大的世界，只差一次選取。', text: '從下一篇文章、下一封郵件、下一次偶然發現開始。', button: '查看使用指南' },
  footer: { note: '隨手翻譯，自在理解。', guide: '安裝與設定', privacy: "AI 使用你設定的服務，Simple 可自動重譯；點擊 Google 入口才會向 Google 傳送文字或網頁 URL。 AI 網頁翻譯在個別確認後才傳送已呈現的頁面文字及後續動態文字，使用第一個模型，可能產生服務商費用。" },
  guide: {
    eyebrow: '開始使用', title: '幾步準備，\n開啟第一次翻譯。', intro: "從 Chrome 線上應用程式商店直接安裝。設定自選 AI 服務即可原處翻譯；也可無需 API Key，在新分頁使用 Google 文字或整頁翻譯。無需下載原始碼或建置工具。",
    back: '返回首頁', requirements: '準備工作', requirementText: "準備相容的 Chrome 瀏覽器。只有 AI 翻譯需要設定 AI 服務，Google 入口無需設定 AI。",
    steps: [
  {
    "title": "從 Chrome 線上應用程式商店安裝",
    "text": "開啟譯見 AI（Transight AI）的 Chrome 線上應用程式商店詳情頁，點選「加到 Chrome」，依瀏覽器提示確認安裝。",
    "detail": "點選下方按鈕，直接開啟 Transight AI 官方商店詳情頁。"
  },
  {
    "title": "固定到工具列",
    "text": "點選 Chrome 工具列的擴充功能選單，將「譯見 AI」固定到工具列。",
    "detail": "工具列方便隨時開啟設定和手動翻譯；日常閱讀時，直接在網頁選取文字即可。"
  },
  {
    "title": "設定 AI（Google 入口可略過）",
    "text": "開啟擴充功能設定，填寫 Base URL、API Key（免驗證本機服務可留空）和模型 ID，填寫 Key 時設定並確認至少 6 個字元的解鎖密碼，儲存後測試連線。重新啟動瀏覽器後，可直接在彈出視窗、選取翻譯浮窗或設定頁解鎖。",
    "detail": "服務需要相容於 POST /chat/completions。費用與隱私政策由你選擇的服務提供者決定。 原處 AI 翻譯需設定自己的服務；也可免 API Key 使用 Google 文字或整頁翻譯入口。"
  },
  {
    "title": "選取文字，點選即譯",
    "text": "在一般網頁選取單字、句子或一段文字，點選旁邊出現的翻譯圖示，譯文就在原處展開。不用複製，也不必離開目前頁面。",
    "detail": "僅選取文字不會傳送請求，點選後才開始翻譯。瀏覽器內部頁面和部分受限頁面不支援選取翻譯。"
  },
  {
    "title": "不只選取文字，也能原位翻譯網頁",
    "text": "選擇目標語言，點選「AI 網頁翻譯」，檢查確認列並點選「同意並開始」。在原網頁閱讀譯文，隨時切換原文，或還原原文並結束。",
    "detail": "即使在 Full 模式，網頁翻譯也只使用第一個模型；工作階段中會繼續處理動態文字，可能產生服務商費用。Google 整頁翻譯則無需 AI 金鑰，在新分頁開啟。可用功能以安裝版本為準。"
  }
],
    privacyTitle: '關於你的資料', privacyText: "擴充功能不內建 API Key。AI 會向自選服務傳送原文、保留圖片及適用的網頁上下文，Simple 可自動重譯。Google 入口僅在點擊後透過新分頁連結傳送文字或網頁 URL，可能留在瀏覽器歷史中，請勿提交敏感內容。 AI 網頁翻譯在個別確認後才傳送已呈現的頁面文字及後續動態文字，使用第一個模型，可能產生服務商費用。",
  },
} satisfies Dictionary;
