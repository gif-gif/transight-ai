// Deterministic local article for screenshots. Never calls an external model.
export const articleText = [
  'Reading without borders',
  'A little understanding brings us closer.',
  'Make room for a new perspective',
  'Every language offers a different way to see the world. Read at your own pace, and let curiosity lead the way.',
  'Keep the page, change the language',
  'Translate the article where you are reading it. Links remain available, so you can keep exploring without opening another tab.',
  'Return to the original whenever you like',
  'Compare the original wording with the translation, then continue reading. You are always in control.',
  'Explore the reading guide',
];
export const articleTranslations = {
  'zh-CN': ['阅读，不止于语言', '多一点理解，让我们更靠近。', '为新的视角留一点空间', '每种语言都提供了一种看世界的方式。按照自己的节奏阅读，让好奇心引领探索。', '保留网页，切换语言', '就在阅读的页面翻译文章。链接依然可用，无需打开新标签页，也能继续探索。', '随时回到原文', '对照原文和译文，然后继续阅读。一切由你掌控。', '探索阅读指南'],
  'zh-TW': ['閱讀，不止於語言', '多一點理解，讓我們更靠近。', '為新的視角留一點空間', '每種語言都提供了一種看世界的方式。按照自己的節奏閱讀，讓好奇心引領探索。', '保留網頁，切換語言', '就在閱讀的頁面翻譯文章。連結依然可用，無需開啟新分頁，也能繼續探索。', '隨時回到原文', '對照原文和譯文，然後繼續閱讀。一切由你掌控。', '探索閱讀指南'],
  ja: ['言葉の壁を越えて読む', '少しの理解が、私たちの距離を縮める。', '新しい視点を迎え入れる', '言語には、それぞれの世界の見方があります。自分のペースで読み、好奇心のままに進みましょう。', 'ページはそのまま、言語を切り替える', '読んでいるページで記事を翻訳できます。リンクは引き続き使えるので、新しいタブを開かずに読み進められます。', 'いつでも原文に戻れる', '原文と訳文を見比べてから、続きを読みましょう。操作はいつでも自分で選べます。', '読書ガイドを見る'],
  ko: ['언어의 경계를 넘어 읽기', '작은 이해가 우리를 더 가깝게 합니다.', '새로운 관점을 위한 여유', '언어마다 세상을 바라보는 방식이 다릅니다. 나만의 속도로 읽으며 호기심을 따라가 보세요.', '페이지는 그대로, 언어만 바꾸기', '읽고 있는 페이지에서 글을 번역하세요. 링크는 그대로 사용할 수 있어 새 탭을 열지 않고도 계속 탐색할 수 있습니다.', '언제든 원문으로 돌아가기', '원문과 번역을 비교한 뒤 계속 읽어 보세요. 모든 선택은 여러분에게 있습니다.', '읽기 가이드 살펴보기'],
};
export const articleHTML = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Reading without borders — local demo</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f4ee;color:#243d34;font:18px/1.7 system-ui,sans-serif}main{width:700px;margin:45px 0 40px 54px}header{font-size:12px;letter-spacing:2px;color:#587167;border-bottom:1px solid #d8ddd4;padding-bottom:18px;margin-bottom:28px}h1{font-size:40px;line-height:1.25;letter-spacing:-1px;margin:0 0 12px}h2{font-size:23px;line-height:1.4;margin:27px 0 8px}p{margin:0 0 16px;color:#51675d}.lead{font-size:22px}a{color:#26715a;text-underline-offset:5px}footer{font-size:12px;color:#6d7d73;margin-top:32px}
</style><main><header translate="no">TRANSIGHT AI / READING NOTES</header><h1>${articleText[0]}</h1><p class="lead">${articleText[1]}</p><h2>${articleText[2]}</h2><p>${articleText[3]}</p><h2>${articleText[4]}</h2><p>${articleText[5]}</p><h2>${articleText[6]}</h2><p>${articleText[7]}</p><a href="#guide">${articleText[8]}</a><footer translate="no">LOCAL DEMO · SAMPLE ARTICLE & TRANSLATIONS</footer></main></html>`;
