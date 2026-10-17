import type { Locale } from './locales';

interface Screenshots {
  title: string;
  description: string;
  enlarge: string;
  items: Record<'ai-page-confirm' | 'ai-page-result' | 'simple' | 'images' | 'selection' | 'comparison' | 'settings' | 'unlock' | 'google' | 'popup-simple', string>;
}
export const screenshots = {
  en: {
    title: 'See the extension in action',
    description: "Actual extension UI in English, captured in a local demo environment. Model names and translation results are test examples, not live AI responses. The interface language and translation target can differ. Screenshots come from the current source build; available features depend on your installed version. AI page examples use local, deterministic demo translations.",
    enlarge: 'View full-size screenshot',
    items: {
  "simple": "Simple Translate: one model, with AI page and Google shortcuts below the language selectors",
  "images": "Paste up to 5 images in Full Translate (demo thumbnails)",
  "selection": "Translate on the page without switching tabs",
  "comparison": "Compare translations from multiple models",
  "settings": "Configure your service and encrypt your API key",
  "unlock": "Unlock your saved key in the selection panel",
  "google": "Full mode: separate AI page, Google whole-page and free text translation buttons",
  "popup-simple": "Toolbar Simple mode: automatic text translation, AI page and Google shortcuts",
  "ai-page-confirm": "AI page translation: review the model, target language, provider and consent before starting",
  "ai-page-result": "AI page translation in place: progress, original/translation toggle and restore controls"
},
  },
  'zh-cn': {
    title: '看看实际使用界面',
    description: "简体中文扩展实拍，来自本地演示环境。模型名称与译文为测试示例，不代表实时 AI 响应；界面显示语言与翻译目标语言可以不同。 截图来自当前源码构建，实际功能以安装版本为准；AI 网页示例使用本地确定性演示译文。",
    enlarge: '查看完整截图',
    items: {
  "simple": "Simple Translate：单模型自动翻译，语言选择下方提供 AI 网页与 Google 入口",
  "images": "Full Translate：粘贴最多 5 张图片（演示缩略图）",
  "selection": "网页内翻译，无需切换标签页",
  "comparison": "并排比较多个模型的译文",
  "settings": "配置服务与 API Key 加密保存",
  "unlock": "在划词面板中解锁已保存的密钥",
  "google": "Full 模式：AI 网页、Google 整页和免费文字翻译独立入口",
  "popup-simple": "工具栏 Simple 模式：文字自动翻译、AI 网页与 Google 快捷入口",
  "ai-page-confirm": "AI 网页翻译：开始前核对模型、目标语言、服务商与发送确认",
  "ai-page-result": "AI 网页原位翻译：查看进度、切换原文 / 译文、恢复原文"
},
  },
  'zh-tw': {
    title: '看看實際使用介面',
    description: "繁體中文擴充功能實拍，來自本機示範環境。模型名稱與譯文為測試範例，不代表即時 AI 回應；介面顯示語言與翻譯目標語言可以不同。 截圖來自目前原始碼建置，實際功能以安裝版本為準；AI 網頁範例使用本機確定性的示範譯文。",
    enlarge: '查看完整截圖',
    items: {
  "simple": "Simple Translate：單模型自動翻譯，語言選擇下方提供 AI 網頁與 Google 入口",
  "images": "Full Translate：貼上最多 5 張圖片（示範縮圖）",
  "selection": "網頁內翻譯，無需切換分頁",
  "comparison": "並排比較多個模型的譯文",
  "settings": "設定服務與 API Key 加密儲存",
  "unlock": "在選取翻譯面板中解鎖已儲存的金鑰",
  "google": "Full 模式：AI 網頁、Google 整頁和免費文字翻譯獨立入口",
  "popup-simple": "工具列 Simple 模式：文字自動翻譯、AI 網頁與 Google 快捷入口",
  "ai-page-confirm": "AI 網頁翻譯：開始前核對模型、目標語言、服務商與傳送確認",
  "ai-page-result": "AI 網頁原位翻譯：檢視進度、切換原文 / 譯文、還原原文"
},
  },
  ja: {
    title: '実際の画面で見てみよう',
    description: "ローカルのデモ環境で撮影した日本語の拡張機能画面です。モデル名や翻訳結果はテスト用の例で、実際の AI 応答ではありません。表示言語と翻訳先言語は別々に設定できます。 画面は現在のソースからビルドしたものです。利用できる機能はインストール済みバージョンに依存します。AI ページの訳文はローカルの固定デモです。",
    enlarge: 'スクリーンショットを原寸で見る',
    items: {
  "simple": "Simple Translate：単一モデルの自動翻訳と、言語選択下の AI ページ・Google ボタン",
  "images": "Full Translate：最大 5 枚の画像を貼り付け（デモ用サムネイル）",
  "selection": "タブを切り替えず、その場で翻訳",
  "comparison": "複数モデルの翻訳を並べて比較",
  "settings": "サービスの設定と API キーの暗号化保存",
  "unlock": "選択翻訳パネルで保存済みキーのロックを解除",
  "google": "Full モード：AI ページ翻訳、Google のページ全体・無料テキスト翻訳を個別に選択",
  "popup-simple": "ツールバーの Simple モード：自動テキスト翻訳と AI ページ・Google の入口",
  "ai-page-confirm": "AI ページ翻訳：開始前にモデル、翻訳先、サービス、送信への同意を確認",
  "ai-page-result": "AI によるその場でのページ翻訳：進捗、原文 / 訳文の切り替え、復元"
},
  },
  ko: {
    title: '실제 화면으로 살펴보세요',
    description: "로컬 데모 환경에서 촬영한 한국어 확장 프로그램 화면입니다. 모델 이름과 번역 결과는 테스트 예시이며 실제 AI 응답이 아닙니다. 화면 언어와 번역 대상 언어는 다르게 설정할 수 있습니다. 화면은 현재 소스 빌드를 기준으로 하며 사용 가능한 기능은 설치된 버전에 따라 다릅니다. AI 페이지 예시는 로컬 고정 데모 번역을 사용합니다.",
    enlarge: '스크린샷 원본 크기로 보기',
    items: {
  "simple": "Simple Translate: 단일 모델 자동 번역과 언어 선택 아래 AI 페이지·Google 버튼",
  "images": "Full Translate: 이미지 최대 5장 붙여 넣기 (데모 썸네일)",
  "selection": "탭을 전환하지 않고 페이지에서 번역",
  "comparison": "여러 모델의 번역을 나란히 비교",
  "settings": "서비스 설정 및 API 키 암호화 저장",
  "unlock": "선택 번역 패널에서 저장된 키 잠금 해제",
  "google": "Full 모드: AI 페이지, Google 전체 페이지, 무료 텍스트 번역의 개별 버튼",
  "popup-simple": "도구 모음 Simple 모드: 자동 텍스트 번역과 AI 페이지·Google 바로가기",
  "ai-page-confirm": "AI 페이지 번역: 시작 전 모델, 대상 언어, 제공업체와 전송 동의 확인",
  "ai-page-result": "AI 페이지 내 번역: 진행 상황, 원문 / 번역 전환과 원문 복원"
},
  },
} satisfies Record<Locale, Screenshots>;
