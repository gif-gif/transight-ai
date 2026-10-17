import type { Locale } from './locales';

interface Capabilities {
  eyebrow: string; title: string; intro: string; guideLink: string;
  items: { id: 'ai-page' | 'modes' | 'images' | 'speech' | 'controls' | 'google' | 'website'; title: string; summary: string; details: string[] }[];
}

export const capabilities = {
  "en": {
    "eyebrow": "MORE WAYS TO TRANSLATE",
    "title": "A lighter panel. A fuller toolkit.",
    "intro": "Select a passage, translate a whole page in place with AI, or open Google Translate without an API key. Choose how much you send and where you read.",
    "guideLink": "Explore the controls",
    "items": [
  {
    "id": "ai-page",
    "title": "AI page translation. Stay on the page.",
    "summary": "Translate ordinary webpage text in place with your first selected model. Review the provider and target language, then confirm before any page text is sent.",
    "details": [
      "In the toolbar, selection panel or context-menu panel, choose the target language and click AI page translation. Both Simple and Full support it. The confirmation bar shows the first model, target language and provider. Click Agree and start to begin; unlock your saved key there if needed. AI configuration and consent are required.",
      "Visible text is prioritized, then the rest of the rendered page. Newly inserted or newly visible text continues to translate during this session. The original elements, links and event handlers remain; longer translations can change line wrapping and page height.",
      "Use the bar to collapse controls, stop, show original / translation, or restore and end. Switching the displayed language reuses in-page memory without another AI request. Stop keeps completed translations; closing the bar restores originals where the page has not since changed them.",
      "Supports ordinary text on the top-level HTTP/HTTPS page. Skips form values, editable regions, code, hidden content and translation-excluded elements. It does not translate image text, PDF, Canvas, iframe or Shadow DOM contents. Very large or complex blocks may stay unchanged; compatibility and translation quality depend on the page and model.",
      "Uses a dedicated structured prompt and your selected style, not the custom plain-text translation prompt. At most two batches run at once. Each round allows up to 60,000 characters or 100 requests before asking to continue. Failed requests count too; continuing or restarting resets the round, so this is not a hard spending cap.",
      "Only after confirmation are page-text fragments sent to your configured service; not the entire HTML, cookies or page URL. Ordinary text on signed-in pages may still be sensitive. A changed URL stops the task and requires confirmation again. Google whole-page translation remains a separate new-tab option."
    ]
  },
  {
    "id": "modes",
    "title": "Simple or Full. Your pace.",
    "summary": "Simple Translate keeps one model in focus. Full Translate compares up to five models, each with its own result.",
    "details": [
      "Full is the default. Switch Simple / Full from the toolbar popup or a page panel, or enable Simple in settings. The mode saves immediately and stays in sync across views. Simple uses the first selected model; Full restores all selected models.",
      "After opening Simple, editing text triggers translation after about 0.6 seconds without typing. Changing languages also retranslates. There is no Translate button; copying, local speech, retry and inline unlock remain available. If the toolbar opens with selected text while Simple is enabled, it can translate automatically; Full waits for Translate."
    ]
  },
  {
    "id": "images",
    "title": "Paste images. Read their meaning.",
    "summary": "In Full mode, paste up to 5 images into the source field in the toolbar or a page panel, then translate them with text using an image-capable model.",
    "details": [
      "Copy an image with your system screenshot tool, then use Ctrl+V / Cmd+V in the source field. There is no built-in screenshot button in the current popup; Simple supports text only.",
      "Preview thumbnails in one scrollable row. Remove one image with × or clear all input. Click Translate images to send the retained images and text. Previewing alone does not upload them.",
      "Use a Chat Completions-compatible model that supports image input. No automatic model switch or separate OCR service is used; provider charges may apply."
    ]
  },
  {
    "id": "speech",
    "title": "Listen, without cloud voice.",
    "summary": "Click the speaker beside a result to use a Chinese voice that Chrome marks as local (zh-CN preferred), regardless of the translation target. Click again to stop.",
    "details": [
      "No autoplay, cloud-voice fallback, audio download or microphone access. Install a local Chinese voice if none is available. Long results play in chunks; the text itself is not rewritten.",
      "Only one result plays across the extension at a time. Clearing or retranslating stops playback; copying or pinning does not."
    ]
  },
  {
    "id": "controls",
    "title": "Your language. Your instructions.",
    "summary": "Choose source and target languages across views, and customize the shared prompt for selection / manual translation. AI page translation uses its own structured prompt.",
    "details": [
      "Source language defaults to auto-detect. The target language stays in sync across the toolbar, page panels and settings. Cancel active requests in Full; editing in Simple cancels and replaces the old request. Cancellation cannot retract provider-side processing.",
      "Turn selection translation on or off in settings; the toolbar and explicit context-menu command remain available. Edit or restore the system prompt, then save settings to apply it.",
      "Templates support {{text}}, {{from}}, {{to}}, {{title_prompt}}, {{summary_prompt}}, {{terms_prompt}} and {{imt_style_guide}}. The default prompt includes available page title and description for text translated from a webpage; remove those placeholders to omit them. Image requests omit page context. There is no glossary editor yet.",
      "These custom-prompt controls apply to selection / manual translation. AI page translation uses its own structured prompt and inherits only the selected style."
    ]
  },
  {
    "id": "google",
    "title": "Google text translation. No API key.",
    "summary": "Open the source text in Google Translate in a new tab, with your selected source and target languages. No AI setup or key unlock is needed.",
    "details": [
      "In Full, the Google text and whole-page buttons sit beside the AI Translate button. In Simple, they sit below the language selectors. Hover over the icons for their labels. Available in the toolbar, selection and right-click panels.",
      "The Google free translation setting is on by default. Toggling it saves immediately across open views without disabling AI or whole-page translation. This entry supports up to 5,000 characters; longer text is rejected, not truncated. Images are not sent and results do not return to the extension.",
      "Only clicking this button sends the text to Google, in the destination URL, which may remain in browser history. Do not submit sensitive text. Simple AI automatic translation is a separate behavior."
    ]
  },
  {
    "id": "website",
    "title": "Translate the whole page with Google.",
    "summary": "Open the current HTTP/HTTPS page in Google website translation in a new tab, using the selected target language. No AI key is needed.",
    "details": [
      "Use the whole-page button in the toolbar, selection or right-click panel in either Simple or Full. Google detects the source language. This opens an external page; it does not replace text inside the original page.",
      "Clicking sends the current page URL, including query parameters, to Google—not your AI key, input text or images. Avoid URLs containing sensitive information. Browser-internal pages are unsupported; private, intranet or other sites may not work. Availability depends on Google."
    ]
  }
]
  },
  "zh-cn": {
    "eyebrow": "更多翻译方式",
    "title": "想轻一点，或想多看一点。",
    "intro": "选中一段文字，或用 AI 在原网页翻译整页；也可免 API Key 打开 Google 翻译。发送多少内容、在哪里阅读，由你选择。",
    "guideLink": "查看详细操作",
    "items": [
  {
    "id": "ai-page",
    "title": "AI 网页翻译，就在原页面阅读。",
    "summary": "使用已选列表中的第一个模型，原位翻译网页普通文字。先核对服务商与目标语言，确认后才发送页面内容。",
    "details": [
      "在工具栏、划词或右键面板选择目标语言，点击「AI 网页翻译」，Simple / Full 均支持。右上角确认栏显示第一个模型、目标语言和服务商，点击「同意并开始」才启动；密钥锁定时可在栏内解锁。需要已配置 AI 服务并同意发送内容。",
      "优先翻译视口内文字，再处理其余已渲染内容。本次会话中新插入或变为可见的文字会继续翻译。保留原元素、链接和事件监听；译文长度可能改变换行及页面高度。",
      "状态栏可收起、停止、查看原文 / 译文、恢复原文并结束。原文与译文切换使用页面内存，不重复请求模型。停止会保留已完成译文；关闭栏会恢复仍未被网站改动的原文。",
      "支持顶层 HTTP/HTTPS 网页的普通文字；跳过表单值、可编辑区域、代码、隐藏内容及标记不翻译的元素。不支持图片文字、PDF、Canvas、iframe 和 Shadow DOM 内部内容；超大或复杂文字块可能保留原文，兼容性和翻译质量取决于页面及模型。",
      "使用专用结构化提示词，继承表达风格，不应用自定义纯文字翻译提示词。最多两个批次并发，每轮最多发送 60,000 字符或 100 个请求，达到后需确认继续。失败请求也计数，继续或重新开始会重置本轮额度，不是费用硬上限。",
      "仅在确认后向已配置服务发送页面文字片段，不上传整页 HTML、Cookie 或页面 URL。登录页面的普通文字仍可能包含敏感信息。URL 变化后会停止，需再次确认。Google 整页翻译仍是独立的新标签页入口。"
    ]
  },
  {
    "id": "modes",
    "title": "Simple / Full，随手切换。",
    "summary": "Simple Translate 专注一个模型；Full Translate 最多对比 5 个模型，每个模型独立显示译文。",
    "details": [
      "默认 Full。在工具栏 popup 或网页浮窗顶部切换 Simple / Full，也可在设置中开启 Simple。模式立即保存并在各窗口同步。Simple 只使用已选列表第一个模型，Full 恢复所有已选模型。",
      "打开 Simple 后，编辑原文停笔约 0.6 秒或切换语言会自动重译，无需翻译按钮；仍可复制、本地朗读、失败重试和就地解锁。 开启 Simple 时，工具栏带入当前选中文字后也可自动翻译；Full 则等待点击翻译。"
    ]
  },
  {
    "id": "images",
    "title": "粘贴图片，也能读懂。",
    "summary": "在 Full 模式的工具栏或网页浮窗中，向原文框粘贴最多 5 张图片，通过支持图片输入的模型和文字一起翻译。",
    "details": [
      "用系统截图工具复制图片，再在原文框按 Ctrl+V / Cmd+V 粘贴。当前 popup 没有内置截图按钮；Simple 仅支持文字。",
      "缩略图单行排列，可横向滚动，点击 × 单独删除，或清空所有输入。点击「翻译图片」才发送保留图片与文字，粘贴和预览本身不上传。",
      "需要支持图片输入的 Chat Completions 兼容模型；不会自动切换模型，也不调用独立 OCR 服务。服务商可能收取费用。"
    ]
  },
  {
    "id": "speech",
    "title": "听译文，不用云端配音。",
    "summary": "点击译文旁的扬声器，使用 Chrome 标记为本地的中文语音（优先 zh-CN）朗读，不随翻译目标语言切换；再次点击停止。",
    "details": [
      "不自动播放、不回退云端语音、不下载音频、不访问麦克风。没有本地中文语音时需在系统安装；长译文分段播放，不改写原文。",
      "整个扩展同时只朗读一条译文；清空或重新翻译会停止播放，复制和固定浮窗不会打断。"
    ]
  },
  {
    "id": "controls",
    "title": "语言与提示词，由你决定。",
    "summary": "指定源语言、跨界面记住目标语言，并自定义划词 / 手动翻译共用的系统提示词。AI 网页翻译使用独立的结构化提示词。",
    "details": [
      "源语言默认自动检测。目标语言在工具栏、网页浮窗和设置之间同步；Full 可取消进行中的翻译，Simple 编辑会取消旧请求并重译。取消不能撤回服务商已经处理的内容。",
      "设置中可关闭划词入口，工具栏和主动右键翻译仍可用。系统提示词支持编辑、恢复默认，保存设置后生效。",
      "模板支持 {{text}}、{{from}}、{{to}}、{{title_prompt}}、{{summary_prompt}}、{{terms_prompt}} 和 {{imt_style_guide}}。默认提示词会在网页文字翻译时附带可用标题与描述摘要，不需要时可移除对应变量；图片请求不附带页面上下文。目前没有术语表编辑入口。",
      "这些自定义提示词设置适用于划词 / 手动翻译。AI 网页翻译使用独立的结构化提示词，仅继承所选表达风格。"
    ]
  },
  {
    "id": "google",
    "title": "Google 免费文字翻译，无需 Key。",
    "summary": "把原文和当前源语言、目标语言带到新标签页的 Google 翻译，无需配置 AI 或解锁密钥。",
    "details": [
      "Full 模式中，整页翻译与 Google 免费翻译图标并排位于 AI 翻译按钮右侧；Simple 模式位于语言选择下方。悬停可查看提示。工具栏、划词与右键浮窗均支持。",
      "「启用 Google 免费翻译」默认开启，切换立即保存并同步已打开窗口，不影响 AI 或整页翻译。每次最多 5,000 字符，超限提示而不截断；不发送图片，也不将 Google 结果回填插件。",
      "仅点击该按钮时才将文字放入 Google 页面 URL，可能保留在浏览器历史中，请勿发送敏感内容。Simple 的 AI 自动翻译是独立行为。"
    ]
  },
  {
    "id": "website",
    "title": "整个网页，也能交给 Google。",
    "summary": "按当前目标语言，在新标签页打开当前 HTTP/HTTPS 网页的 Google 翻译，无需 AI 密钥。",
    "details": [
      "工具栏、划词和右键浮窗的 Simple / Full 模式均有整页翻译入口，源语言由 Google 自动检测。这是跳转外部页面，不是在原网页内替换文字。",
      "点击时仅将当前网页 URL（包含查询参数）发送给 Google，不发送 API Key、输入框原文或图片。请避开含敏感信息的网址。浏览器内部页不支持；私有登录页、内网及部分网站可能不可用，效果取决于 Google。"
    ]
  }
]
  },
  "zh-tw": {
    "eyebrow": "更多翻譯方式",
    "title": "想輕一點，或想多看一點。",
    "intro": "選取一段文字，或用 AI 在原網頁翻譯整頁；也可免 API Key 開啟 Google 翻譯。傳送多少內容、在哪裡閱讀，由你選擇。",
    "guideLink": "查看詳細操作",
    "items": [
  {
    "id": "ai-page",
    "title": "AI 網頁翻譯，就在原頁面閱讀。",
    "summary": "使用已選清單中的第一個模型，原位翻譯網頁一般文字。先核對服務商與目標語言，確認後才傳送頁面內容。",
    "details": [
      "在工具列、選取或右鍵面板選擇目標語言，點選「AI 網頁翻譯」，Simple / Full 均支援。右上角確認列顯示第一個模型、目標語言和服務商，點選「同意並開始」才啟動；金鑰鎖定時可在列內解鎖。需要已設定 AI 服務並同意傳送內容。",
      "優先翻譯可視範圍內的文字，再處理其餘已呈現內容。本次工作階段中新插入或變為可見的文字會繼續翻譯。保留原元素、連結和事件監聽；譯文長度可能改變換行及頁面高度。",
      "狀態列可收合、停止、檢視原文 / 譯文、還原原文並結束。原文與譯文切換使用頁面記憶體，不重複請求模型。停止會保留已完成譯文；關閉列會還原仍未被網站改動的原文。",
      "支援頂層 HTTP/HTTPS 網頁的一般文字；略過表單值、可編輯區域、程式碼、隱藏內容及標記不翻譯的元素。不支援圖片文字、PDF、Canvas、iframe 和 Shadow DOM 內部內容；超大或複雜文字區塊可能保留原文，相容性和翻譯品質取決於頁面及模型。",
      "使用專用結構化提示詞，繼承表達風格，不套用自訂純文字翻譯提示詞。最多兩個批次並行，每輪最多傳送 60,000 字元或 100 個請求，達到後需確認繼續。失敗請求也計數，繼續或重新開始會重設本輪額度，不是費用硬上限。",
      "僅在確認後向已設定服務傳送頁面文字片段，不上傳整頁 HTML、Cookie 或頁面 URL。登入頁面的一般文字仍可能包含敏感資訊。URL 變更後會停止，需再次確認。Google 整頁翻譯仍是獨立的新分頁入口。"
    ]
  },
  {
    "id": "modes",
    "title": "Simple / Full，隨手切換。",
    "summary": "Simple Translate 專注一個模型；Full Translate 最多比較 5 個模型，每個模型獨立顯示譯文。",
    "details": [
      "預設 Full。在工具列 popup 或網頁浮窗頂部切換 Simple / Full，也可在設定中開啟 Simple。模式立即儲存並在各視窗同步。Simple 僅使用已選清單第一個模型，Full 恢復所有已選模型。",
      "開啟 Simple 後，編輯原文停筆約 0.6 秒或切換語言會自動重新翻譯，無需翻譯按鈕；仍可複製、本機朗讀、失敗重試與就地解鎖。 開啟 Simple 時，工具列帶入目前選取文字後也可自動翻譯；Full 則等待點擊翻譯。"
    ]
  },
  {
    "id": "images",
    "title": "貼上圖片，也能讀懂。",
    "summary": "在 Full 模式的工具列或網頁浮窗中，將最多 5 張圖片貼入原文框，透過支援圖片輸入的模型與文字一起翻譯。",
    "details": [
      "使用系統截圖工具複製圖片，再於原文框按 Ctrl+V / Cmd+V 貼上。目前 popup 沒有內建截圖按鈕；Simple 僅支援文字。",
      "縮圖單行排列，可橫向捲動，點擊 × 個別刪除，或清空所有輸入。點擊「翻譯圖片」才傳送保留的圖片與文字，貼上與預覽本身不會上傳。",
      "需要支援圖片輸入的 Chat Completions 相容模型；不會自動切換模型，也不呼叫獨立 OCR 服務。服務商可能收取費用。"
    ]
  },
  {
    "id": "speech",
    "title": "聽譯文，不用雲端配音。",
    "summary": "點擊譯文旁的揚聲器，使用 Chrome 標記為本機的中文語音（優先 zh-CN）朗讀，不隨翻譯目標語言切換；再次點擊停止。",
    "details": [
      "不自動播放、不使用雲端語音備援、不下載音訊、不存取麥克風。沒有本機中文語音時需在系統安裝；長譯文分段播放，不改寫文字。",
      "整個擴充功能同時只朗讀一條譯文；清空或重新翻譯會停止播放，複製與固定浮窗不會打斷。"
    ]
  },
  {
    "id": "controls",
    "title": "語言與提示詞，由你決定。",
    "summary": "指定來源語言、跨介面記住目標語言，並自訂選取 / 手動翻譯共用的系統提示詞。AI 網頁翻譯使用獨立的結構化提示詞。",
    "details": [
      "來源語言預設自動偵測。目標語言在工具列、網頁浮窗與設定之間同步；Full 可取消進行中的翻譯，Simple 編輯會取消舊請求並重譯。取消無法撤回服務商已處理的內容。",
      "設定中可關閉選取翻譯入口，工具列與主動右鍵翻譯仍可使用。系統提示詞支援編輯、還原預設，儲存設定後生效。",
      "範本支援 {{text}}、{{from}}、{{to}}、{{title_prompt}}、{{summary_prompt}}、{{terms_prompt}} 與 {{imt_style_guide}}。預設提示詞會在網頁文字翻譯時附帶可用標題與描述摘要，不需要時可移除對應變數；圖片請求不附帶頁面上下文。目前沒有術語表編輯入口。",
      "這些自訂提示詞設定適用於選取 / 手動翻譯。AI 網頁翻譯使用獨立的結構化提示詞，僅繼承所選表達風格。"
    ]
  },
  {
    "id": "google",
    "title": "Google 免費文字翻譯，無需 Key。",
    "summary": "將原文和目前來源、目標語言帶到新分頁的 Google 翻譯，無需設定 AI 或解鎖金鑰。",
    "details": [
      "Full 模式中，整頁與 Google 免費翻譯圖示並排位於 AI 翻譯按鈕右側；Simple 模式位於語言選擇下方。游標停留可查看提示。工具列、選取和右鍵浮窗均支援。",
      "「啟用 Google 免費翻譯」預設開啟，切換立即儲存並同步已開啟視窗，不影響 AI 或整頁翻譯。每次最多 5,000 字元，超限提示而不截斷；不傳送圖片，也不將 Google 結果填回擴充功能。",
      "僅點擊該按鈕時才將文字放入 Google 頁面 URL，可能保留在瀏覽器歷史中，請勿傳送敏感內容。Simple 的 AI 自動翻譯是獨立行為。"
    ]
  },
  {
    "id": "website",
    "title": "整個網頁，也能交給 Google。",
    "summary": "依目前目標語言，在新分頁開啟目前 HTTP/HTTPS 網頁的 Google 翻譯，無需 AI 金鑰。",
    "details": [
      "工具列、選取與右鍵浮窗的 Simple / Full 模式均有整頁翻譯入口，來源語言由 Google 自動偵測。這是跳轉外部頁面，不是在原網頁內替換文字。",
      "點擊時僅將目前網頁 URL（包含查詢參數）傳送給 Google，不傳送 API Key、輸入框原文或圖片。請避開含敏感資訊的網址。瀏覽器內部頁不支援；私有登入頁、內網及部分網站可能無法使用，效果取決於 Google。"
    ]
  }
]
  },
  "ja": {
    "eyebrow": "広がる翻訳の使い方",
    "title": "シンプルにも、多機能にも。",
    "intro": "選択した文章も、ページ全体も。AI で元のページを翻訳するか、API キー不要の Google 翻訳を開くか、送る内容と読む場所を選べます。",
    "guideLink": "詳しい使い方を見る",
    "items": [
  {
    "id": "ai-page",
    "title": "AI ページ翻訳。その場で読み進める。",
    "summary": "選択した最初のモデルで、ページの通常のテキストをその場で翻訳。サービスと翻訳先言語を確認し、同意してからページの文字を送信します。",
    "details": [
      "ツールバー、選択翻訳、右クリックのパネルで翻訳先を選び、AI ページ翻訳をクリックします。Simple / Full の両方に対応。右上の確認バーで最初のモデル、翻訳先、サービスを確認し、同意して開始します。キーがロック中ならバー内で解除できます。AI サービスの設定と送信への同意が必要です。",
      "表示範囲内の文字を優先し、残りの描画済みテキストを処理します。同じセッション中に追加・表示された文字も翻訳します。元の要素、リンク、イベント処理は保持されますが、訳文の長さで改行やページの高さは変わる場合があります。",
      "バーの折りたたみ、停止、原文 / 訳文の切り替え、原文への復元と終了ができます。表示の切り替えはページ内メモリを使い、AI を再呼び出ししません。停止は完了済みの訳文を残し、バーを閉じるとサイト側でその後変更されていない文字を原文に戻します。",
      "最上位の HTTP/HTTPS ページにある通常のテキストが対象です。フォーム値、編集領域、コード、非表示・翻訳除外の要素はスキップします。画像内文字、PDF、Canvas、iframe、Shadow DOM の内部には非対応。大きすぎる・複雑な部分は原文のままになる場合があり、互換性と翻訳品質はページやモデルに依存します。",
      "専用の構造化プロンプトと選択した表現スタイルを使用し、カスタムのプレーンテキスト翻訳プロンプトは使いません。同時実行は最大2バッチ。1ラウンドは最大 60,000 文字または 100 リクエストで、上限後は続行の確認が必要です。失敗も数え、続行・再開で枠がリセットされるため、費用の上限ではありません。",
      "確認後にだけ、ページの文字断片を設定済みサービスへ送信します。HTML 全体、Cookie、ページ URL は送りません。ログイン済みページの通常の文字にも機密情報が含まれ得ます。URL が変わると停止し、再確認が必要です。Google のページ全体翻訳は、引き続き別タブで開く独立機能です。"
    ]
  },
  {
    "id": "modes",
    "title": "Simple / Full を切り替え。",
    "summary": "Simple Translate はひとつのモデルに集中。Full Translate は最大 5 モデルの翻訳を個別に表示して比較できます。",
    "details": [
      "既定は Full です。ツールバーポップアップとページパネルの上部で Simple / Full を切り替えるか、設定で Simple を有効にします。モードはすぐに保存され、各画面に同期されます。Simple は最初のモデル、Full は選択済みの全モデルを使用します。",
      "Simple を開いた後は、入力を止めて約 0.6 秒後、または言語を変更したときに自動で再翻訳します。翻訳ボタンはなく、コピー、ローカル読み上げ、再試行、その場でのロック解除が使えます。 Simple を有効にして選択中の文字をツールバーに取り込むと、自動翻訳が始まる場合があります。Full では翻訳ボタンを待ちます。"
    ]
  },
  {
    "id": "images",
    "title": "画像を貼り付けて、内容を理解。",
    "summary": "Full モードのツールバーやページパネルの原文欄に最大 5 枚の画像を貼り付け、画像対応モデルで文章と一緒に翻訳できます。",
    "details": [
      "システムのスクリーンショット機能で画像をコピーし、原文欄で Ctrl+V / Cmd+V を押します。現在の popup に内蔵の撮影ボタンはありません。Simple はテキストのみ対応です。",
      "サムネイルは横スクロールできる一列表示です。× で個別に削除するか、入力をすべて消去できます。「画像を翻訳」を押すと残した画像と文章を送信します。貼り付けやプレビューだけでは送信しません。",
      "画像入力に対応する Chat Completions 互換モデルが必要です。モデルの自動切り替えや独立した OCR サービスは使いません。サービス側で料金が発生する場合があります。"
    ]
  },
  {
    "id": "speech",
    "title": "クラウド音声を使わず、訳文を聞く。",
    "summary": "結果のスピーカーを押すと、翻訳先言語に関係なく Chrome がローカルと示す中国語音声（zh-CN 優先）で読み上げます。もう一度押すと停止します。",
    "details": [
      "自動再生、クラウド音声への切替、音声ダウンロード、マイクへのアクセスはありません。利用できない場合は中国語のローカル音声をシステムに追加してください。長い文章は書き換えずに分割して再生します。",
      "拡張機能全体で同時に再生する訳文はひとつだけです。消去や再翻訳で停止しますが、コピーやパネルの固定では止まりません。"
    ]
  },
  {
    "id": "controls",
    "title": "言語も、翻訳の指示も自由に。",
    "summary": "原文・翻訳先言語を画面間で共有し、選択 / 手動翻訳の共通プロンプトを編集できます。AI ページ翻訳は独自の構造化プロンプトを使います。",
    "details": [
      "原文は初期設定で自動検出されます。翻訳先はツールバー、ページパネル、設定で同期します。Full は実行中の翻訳をキャンセルでき、Simple は編集時に古いリクエストを中止して再翻訳します。提供者がすでに処理した内容は取り消せません。",
      "設定で選択翻訳を無効にしても、ツールバーや右クリックの翻訳は使えます。プロンプトは編集や初期値への復元ができ、設定を保存すると適用されます。",
      "{{text}}、{{from}}、{{to}}、{{title_prompt}}、{{summary_prompt}}、{{terms_prompt}}、{{imt_style_guide}} に対応します。既定のプロンプトはページ上の文章の翻訳に利用可能なタイトルと説明文を含めます。不要なら該当変数を削除してください。画像リクエストにページ情報は含めません。用語集の編集画面はまだありません。",
      "カスタムプロンプト設定は選択 / 手動翻訳に適用されます。AI ページ翻訳は独自の構造化プロンプトを使い、選択した表現スタイルだけを引き継ぎます。"
    ]
  },
  {
    "id": "google",
    "title": "Google の無料テキスト翻訳。キー不要。",
    "summary": "原文と選択中の翻訳元・翻訳先言語を Google 翻訳の新しいタブに渡します。AI の設定やキーのロック解除は不要です。",
    "details": [
      "Full ではページ全体と無料テキスト翻訳のアイコンが AI 翻訳ボタンの右側に並び、Simple では言語選択の下に並びます。アイコンにカーソルを合わせると説明が表示されます。ツールバー、選択翻訳、右クリックのパネルで利用できます。",
      "Google 無料翻訳は初期状態で有効です。設定を切り替えると開いている画面に即座に保存・同期され、AI やページ全体の翻訳には影響しません。1 回につき最大 5,000 文字で、超過時は切り捨てずに通知します。画像は送らず、結果を拡張機能へ戻すこともありません。",
      "このボタンを押したときだけ原文を Google の URL に含めます。ブラウザー履歴に残る場合があるため機密情報は送らないでください。Simple の AI 自動翻訳とは別の動作です。"
    ]
  },
  {
    "id": "website",
    "title": "ページ全体を Google で翻訳。",
    "summary": "現在の HTTP/HTTPS ページを、選択中の翻訳先言語で Google の新しいタブに開きます。AI キーは不要です。",
    "details": [
      "ツールバー、選択翻訳、右クリックの Simple / Full 両モードで使えます。元の言語は Google が自動検出します。外部ページへの移動であり、元のページ内の文字を置き換える機能ではありません。",
      "クリック時に現在の URL（クエリを含む）のみを Google に送ります。API キー、入力欄の原文や画像は送りません。機密情報を含む URL は避けてください。ブラウザー内部ページは対象外で、ログインが必要なページ、イントラネットなどは利用できない場合があります。可用性は Google に依存します。"
    ]
  }
]
  },
  "ko": {
    "eyebrow": "더 다양한 번역 방식",
    "title": "간결하게, 또는 더 풍부하게.",
    "intro": "선택한 글이나 페이지 전체를 AI로 원래 페이지에서 번역하세요. API 키 없이 Google 번역을 열 수도 있습니다. 보낼 내용과 읽을 위치를 직접 선택하세요.",
    "guideLink": "자세한 사용 방법 보기",
    "items": [
  {
    "id": "ai-page",
    "title": "AI 페이지 번역. 읽던 곳에서 그대로.",
    "summary": "선택한 첫 번째 모델로 웹페이지의 일반 텍스트를 그 자리에서 번역합니다. 제공업체와 대상 언어를 확인하고 동의한 뒤에만 페이지 내용을 전송합니다.",
    "details": [
      "도구 모음, 선택 번역 또는 우클릭 패널에서 대상 언어를 정하고 AI 페이지 번역을 누르세요. Simple / Full 모두 지원합니다. 오른쪽 위 확인 표시줄에서 첫 번째 모델, 대상 언어와 제공업체를 확인한 뒤 동의하고 시작하세요. 키가 잠겨 있으면 표시줄에서 해제할 수 있습니다. AI 서비스 설정과 전송 동의가 필요합니다.",
      "현재 화면에 보이는 글부터 번역한 뒤 나머지 렌더링된 글을 처리합니다. 같은 세션에서 새로 삽입되거나 보이게 된 글도 계속 번역합니다. 원래 요소, 링크와 이벤트 처리는 유지하지만 번역 길이에 따라 줄바꿈과 페이지 높이는 달라질 수 있습니다.",
      "표시줄을 접거나 중지하고, 원문 / 번역을 전환하거나 원문으로 복원 후 종료할 수 있습니다. 전환은 페이지 메모리를 재사용하며 AI를 다시 호출하지 않습니다. 중지는 완료된 번역을 남기고, 표시줄을 닫으면 사이트가 이후에 바꾸지 않은 텍스트를 원문으로 되돌립니다.",
      "최상위 HTTP/HTTPS 페이지의 일반 텍스트를 지원합니다. 폼 값, 편집 영역, 코드, 숨겨진 내용과 번역 제외 요소는 건너뜁니다. 이미지 속 글, PDF, Canvas, iframe, Shadow DOM 내부는 지원하지 않습니다. 너무 크거나 복잡한 부분은 원문으로 남을 수 있으며 호환성과 번역 품질은 페이지와 모델에 따라 다릅니다.",
      "전용 구조화 프롬프트와 선택한 표현 스타일을 사용하며 사용자 지정 일반 텍스트 번역 프롬프트는 적용하지 않습니다. 최대 두 배치를 동시에 처리합니다. 한 라운드에 최대 60,000자 또는 100회 요청 후 계속할지 확인합니다. 실패도 집계되며 계속 또는 재시작하면 새 라운드가 되므로 비용의 절대 상한이 아닙니다.",
      "확인한 뒤에만 페이지 텍스트 조각을 설정한 서비스에 보냅니다. 전체 HTML, Cookie나 페이지 URL은 보내지 않습니다. 로그인한 페이지의 일반 텍스트에도 민감한 정보가 있을 수 있습니다. URL이 바뀌면 중지하고 다시 확인해야 합니다. Google 전체 페이지 번역은 여전히 새 탭으로 여는 별도 기능입니다."
    ]
  },
  {
    "id": "modes",
    "title": "Simple / Full, 자유롭게 전환.",
    "summary": "Simple Translate는 하나의 모델에 집중합니다. Full Translate는 최대 5개 모델의 번역을 개별적으로 표시해 비교합니다.",
    "details": [
      "기본값은 Full입니다. 도구 모음 팝업이나 페이지 패널 상단에서 Simple / Full을 전환하거나 설정에서 Simple을 켜세요. 모드는 즉시 저장되고 화면 간 동기화됩니다. Simple은 첫 번째 모델을, Full은 선택한 모든 모델을 사용합니다.",
      "Simple을 연 후 입력을 멈추고 약 0.6초가 지나거나 언어를 바꾸면 자동으로 다시 번역합니다. 번역 버튼 없이 복사, 로컬 읽기, 재시도, 패널 내 잠금 해제를 사용할 수 있습니다. Simple이 켜져 있으면 도구 모음이 현재 선택한 텍스트를 가져온 뒤 자동 번역할 수 있습니다. Full은 번역 버튼을 기다립니다."
    ]
  },
  {
    "id": "images",
    "title": "이미지를 붙여 넣고, 내용을 이해하세요.",
    "summary": "Full 모드의 도구 모음이나 페이지 패널 원문 입력란에 이미지를 최대 5장 붙여 넣어, 이미지 지원 모델로 텍스트와 함께 번역하세요.",
    "details": [
      "시스템 캡처 도구로 이미지를 복사한 뒤 원문 입력란에서 Ctrl+V / Cmd+V를 누르세요. 현재 popup에는 내장 캡처 버튼이 없으며 Simple은 텍스트만 지원합니다.",
      "썸네일은 가로로 스크롤할 수 있는 한 줄로 표시됩니다. ×로 개별 삭제하거나 입력을 모두 지우세요. 이미지 번역을 누르면 남은 이미지와 텍스트가 전송됩니다. 붙여 넣기와 미리 보기만으로는 업로드되지 않습니다.",
      "이미지 입력을 지원하는 Chat Completions 호환 모델이 필요합니다. 모델 자동 전환이나 별도 OCR 서비스는 사용하지 않으며, 제공업체 요금이 발생할 수 있습니다."
    ]
  },
  {
    "id": "speech",
    "title": "클라우드 음성 없이 번역 듣기.",
    "summary": "번역 옆 스피커를 누르면 대상 언어와 관계없이 Chrome이 로컬로 표시한 중국어 음성(zh-CN 우선)으로 읽습니다. 다시 누르면 멈춥니다.",
    "details": [
      "자동 재생, 클라우드 음성 대체, 오디오 다운로드, 마이크 접근은 없습니다. 사용 가능한 음성이 없으면 로컬 중국어 음성을 시스템에 설치하세요. 긴 번역은 내용을 바꾸지 않고 나누어 재생합니다.",
      "확장 프로그램 전체에서 한 번에 하나의 번역만 재생합니다. 지우거나 다시 번역하면 멈추지만 복사나 패널 고정은 재생을 중단하지 않습니다."
    ]
  },
  {
    "id": "controls",
    "title": "언어도, 번역 지침도 직접 선택.",
    "summary": "화면 간 원문·대상 언어를 선택하고 선택 / 수동 번역의 공통 프롬프트를 편집하세요. AI 페이지 번역은 자체 구조화 프롬프트를 사용합니다.",
    "details": [
      "원문 언어의 기본값은 자동 감지입니다. 대상 언어는 도구 모음, 페이지 패널, 설정 간에 동기화됩니다. Full에서 진행 중인 번역을 취소할 수 있고, Simple에서 편집하면 이전 요청을 취소하고 다시 번역합니다. 제공업체가 이미 처리한 내용은 되돌릴 수 없습니다.",
      "설정에서 선택 번역을 꺼도 도구 모음과 우클릭 번역은 사용할 수 있습니다. 프롬프트를 편집하거나 기본값으로 복원한 뒤 설정을 저장하면 적용됩니다.",
      "{{text}}, {{from}}, {{to}}, {{title_prompt}}, {{summary_prompt}}, {{terms_prompt}}, {{imt_style_guide}}를 지원합니다. 기본 프롬프트는 웹페이지 텍스트 번역 시 사용 가능한 제목과 설명을 포함합니다. 원하지 않으면 해당 변수를 삭제하세요. 이미지 요청에는 페이지 정보를 넣지 않습니다. 용어집 편집 기능은 아직 없습니다.",
      "사용자 지정 프롬프트 설정은 선택 / 수동 번역에 적용됩니다. AI 페이지 번역은 자체 구조화 프롬프트를 쓰며 선택한 표현 스타일만 이어받습니다."
    ]
  },
  {
    "id": "google",
    "title": "Google 무료 텍스트 번역. 키 없이.",
    "summary": "원문과 선택한 원문·대상 언어를 Google 번역의 새 탭으로 전달합니다. AI 설정이나 키 잠금 해제가 필요 없습니다.",
    "details": [
      "Full에서는 전체 페이지와 무료 텍스트 번역 아이콘이 AI 번역 버튼 오른쪽에, Simple에서는 언어 선택 아래에 나란히 표시됩니다. 아이콘에 마우스를 올리면 설명을 볼 수 있습니다. 도구 모음, 선택 번역, 우클릭 패널 모두 지원합니다.",
      "Google 무료 번역은 기본으로 켜져 있습니다. 설정을 바꾸면 즉시 저장되어 열린 창에 동기화되며 AI와 전체 페이지 번역에는 영향을 주지 않습니다. 한 번에 최대 5,000자이며 초과 시 자르지 않고 안내합니다. 이미지를 보내거나 결과를 확장 프로그램에 다시 넣지 않습니다.",
      "이 버튼을 클릭할 때만 원문이 Google URL에 포함됩니다. 브라우저 기록에 남을 수 있으므로 민감한 내용은 보내지 마세요. Simple의 AI 자동 번역과는 별개입니다."
    ]
  },
  {
    "id": "website",
    "title": "전체 페이지도 Google로 번역.",
    "summary": "현재 HTTP/HTTPS 페이지를 선택한 대상 언어로 Google 번역의 새 탭에서 엽니다. AI 키가 필요 없습니다.",
    "details": [
      "도구 모음, 선택 번역, 우클릭 패널의 Simple / Full 모두에서 사용합니다. 원문 언어는 Google이 자동 감지합니다. 외부 페이지를 여는 기능이며 원래 페이지 안의 텍스트를 바꾸지 않습니다.",
      "클릭할 때 현재 페이지 URL(쿼리 매개변수 포함)만 Google로 보냅니다. API 키, 입력란 원문, 이미지는 보내지 않습니다. 민감한 정보가 포함된 URL은 피하세요. 브라우저 내부 페이지는 지원하지 않으며 로그인 페이지, 인트라넷 등은 동작하지 않을 수 있습니다. 가용성은 Google에 달려 있습니다."
    ]
  }
]
  }
} satisfies Record<Locale, Capabilities>;
