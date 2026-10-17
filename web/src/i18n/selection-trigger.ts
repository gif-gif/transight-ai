import type { Locale } from './locales';

interface SelectionTrigger {
  eyebrow: string;
  title: string;
  description: string;
  steps: { title: string; text: string }[];
  caption: string;
  alt: string;
  enlarge: string;
  hint: string;
  privacy: string;
}

export const selectionTrigger = {
  'zh-cn': {
    eyebrow: '划词翻译 · 操作实拍',
    title: '划动选中，翻译就在文字旁。',
    description: '安装扩展并开启划词翻译后，在网页正文中拖动鼠标选中文字，无需复制，也不用切换标签页。',
    steps: [
      { title: '按住鼠标，划动选中文字', text: '从要翻译的文字起点拖到终点，选中的内容会高亮显示。' },
      { title: '松开鼠标，图标随即出现', text: '选中文字末尾附近会显示绿色翻译图标，此时还没有发送文字。' },
      { title: '点击图标，原处查看译文', text: '点击绿色图标打开翻译浮窗；按提示完成必要的配置或确认后，即可翻译。' },
    ],
    caption: '选中文字后的真实网页截图（局部放大）。这是点击翻译前的状态，图片本身不可操作。',
    alt: '网页中的英文句子被蓝色高亮选中，选区末尾下方显示绿色 Transight AI 翻译图标，翻译浮窗尚未打开。',
    enlarge: '查看完整操作截图',
    hint: '图标未点击时约 2.5 秒后自动消失，重新选中文字即可再次显示。',
    privacy: "仅选中文字不会发送内容。点击发起翻译后，Simple 模式编辑原文或切换语言也可自动重译，使用你配置的 AI 服务。",
  },
  'zh-tw': {
    eyebrow: '選取翻譯 · 操作實拍',
    title: '拖曳選取，翻譯就在文字旁。',
    description: '安裝擴充功能並啟用選取翻譯後，在網頁內文中拖曳滑鼠選取文字，無需複製，也不用切換分頁。',
    steps: [
      { title: '按住滑鼠，拖曳選取文字', text: '從要翻譯的文字起點拖到終點，選取的內容會反白顯示。' },
      { title: '放開滑鼠，圖示隨即出現', text: '選取文字末尾附近會顯示綠色翻譯圖示，此時尚未傳送文字。' },
      { title: '點擊圖示，原處查看譯文', text: '點擊綠色圖示開啟翻譯浮窗；依提示完成必要的設定或確認後，即可翻譯。' },
    ],
    caption: '選取文字後的實際網頁截圖（局部放大）。這是點擊翻譯前的狀態，圖片本身無法操作。',
    alt: '網頁中的英文句子以藍色反白選取，選取範圍末尾下方顯示綠色 Transight AI 翻譯圖示，翻譯浮窗尚未開啟。',
    enlarge: '查看完整操作截圖',
    hint: '未點擊圖示時，約 2.5 秒後會自動消失，重新選取文字即可再次顯示。',
    privacy: "僅選取文字不會傳送內容。點擊發起翻譯後，Simple 模式編輯原文或切換語言也可自動重譯，使用你設定的 AI 服務。",
  },
  en: {
    eyebrow: 'SELECT TO TRANSLATE · IN ACTION',
    title: 'Drag to select. Translation is right there.',
    description: 'Install the extension and enable selection translation, then drag over text in a webpage. No copying or switching tabs.',
    steps: [
      { title: 'Click and drag to select text', text: 'Hold the mouse button and drag from the start to the end of the text. Your selection is highlighted.' },
      { title: 'Release to reveal the icon', text: 'A green translation icon appears near the end of your selection. No text has been sent yet.' },
      { title: 'Click the icon to translate in place', text: 'Click the green icon to open the translation panel. Complete any required setup or confirmation to translate.' },
    ],
    caption: 'A close-up of an actual webpage after text selection, before clicking to translate. This screenshot is not interactive.',
    alt: 'An English sentence is highlighted in blue, with the green Transight AI translation icon below the end of the selection. The translation panel is not open yet.',
    enlarge: 'View the full walkthrough screenshot',
    hint: 'If not clicked, the icon disappears after about 2.5 seconds. Select the text again to bring it back.',
    privacy: "Selecting text alone sends nothing. Clicking starts translation; later edits in Simple mode or language changes can automatically retranslate via your configured AI service.",
  },
  ja: {
    eyebrow: '選択して翻訳 · 実際の操作',
    title: 'ドラッグして選択。翻訳はすぐそばに。',
    description: '拡張機能をインストールして選択翻訳を有効にしたら、ページの本文をドラッグして選択するだけ。コピーもタブの切り替えも不要です。',
    steps: [
      { title: 'ドラッグして文章を選択', text: 'マウスボタンを押したまま、翻訳したい文章の先頭から末尾までドラッグします。選択した部分がハイライトされます。' },
      { title: 'ボタンを離すとアイコンが表示', text: '選択範囲の末尾付近に緑色の翻訳アイコンが表示されます。この時点では文章は送信されません。' },
      { title: 'アイコンをクリックして、その場で翻訳', text: '緑色のアイコンをクリックすると翻訳パネルが開きます。必要な設定や確認を済ませると翻訳できます。' },
    ],
    caption: '文章を選択した直後の実際のページを拡大した画像です。翻訳アイコンをクリックする前の状態で、画像自体は操作できません。',
    alt: '英語の文章が青く選択され、選択範囲の末尾の下に緑色の Transight AI 翻訳アイコンが表示されています。翻訳パネルはまだ開いていません。',
    enlarge: '操作説明の画像を全体表示',
    hint: 'クリックしない場合、アイコンは約 2.5 秒後に消えます。文章を選択し直すと再表示されます。',
    privacy: "文章を選択するだけでは送信されません。クリックして翻訳を開始した後は、Simple での編集や言語変更でも、設定した AI サービスで自動再翻訳する場合があります。",
  },
  ko: {
    eyebrow: '선택 번역 · 실제 사용 화면',
    title: '드래그로 선택하면, 번역이 바로 곁에.',
    description: '확장 프로그램을 설치하고 선택 번역을 켠 뒤, 웹페이지 본문에서 텍스트를 드래그해 선택하세요. 복사하거나 탭을 전환할 필요가 없습니다.',
    steps: [
      { title: '마우스로 드래그해 텍스트 선택', text: '마우스 버튼을 누른 채 번역할 텍스트의 시작부터 끝까지 드래그하세요. 선택한 부분이 강조 표시됩니다.' },
      { title: '버튼을 놓으면 아이콘 표시', text: '선택 영역 끝부분 근처에 초록색 번역 아이콘이 나타납니다. 아직 텍스트는 전송되지 않습니다.' },
      { title: '아이콘을 클릭해 그 자리에서 번역', text: '초록색 아이콘을 클릭하면 번역 패널이 열립니다. 필요한 설정이나 확인 절차를 마치면 번역할 수 있습니다.' },
    ],
    caption: '텍스트를 선택한 직후의 실제 웹페이지를 확대한 이미지입니다. 번역 아이콘을 클릭하기 전 상태이며 이미지 자체는 조작할 수 없습니다.',
    alt: '영어 문장이 파란색으로 선택되어 있고, 선택 영역 끝 아래에 초록색 Transight AI 번역 아이콘이 표시됩니다. 번역 패널은 아직 열리지 않았습니다.',
    enlarge: '전체 사용 안내 스크린샷 보기',
    hint: '클릭하지 않으면 약 2.5초 후 아이콘이 사라집니다. 텍스트를 다시 선택하면 다시 나타납니다.',
    privacy: "텍스트를 선택하기만 해서는 전송되지 않습니다. 클릭하여 번역을 시작한 뒤에는 Simple에서 원문을 수정하거나 언어를 바꿔도 설정한 AI 서비스로 자동 재번역할 수 있습니다.",
  },
} satisfies Record<Locale, SelectionTrigger>;
