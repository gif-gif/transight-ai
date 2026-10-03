"""Adapt existing artwork and actual UI screenshots; no new UI captures or AI images.
Run from any directory with Python 3 + Pillow. All outputs stay in chrome-web-store.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parent
BG = '#f3f5ef'
GREEN = '#126754'
INK = '#193b33'
MUTED = '#577168'
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
CJK = '/System/Library/Fonts/Hiragino Sans GB.ttc'

def font(size, bold=False, zh=False):
    if zh == 'ja':
        path = next(Path('/System/Library/Fonts').glob(f'*角* W{6 if bold else 3}.ttc'))
    elif zh == 'ko':
        path = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
    else:
        path = CJK if zh else BOLD if bold else FONT
    return ImageFont.truetype(str(path), size)

TRADITIONAL_COPY = {
    '保护你的密钥，\n选择翻译模型。': '保護你的金鑰，\n選擇翻譯模型。',
    '至少 6 个字符的本地解锁密码。': '至少 6 個字元的本機解鎖密碼。',
    '加密保存密钥，随时锁定。': '加密儲存金鑰，隨時鎖定。',
    '实际设置截图 · 示例模型，不展示已保存密钥。': '實際設定截圖 · 範例模型，不顯示已儲存金鑰。',
    '就地解锁，\n继续翻译。': '就地解鎖，\n繼續翻譯。',
    '在浮窗或工具栏弹窗中输入密码。': '在浮動視窗或工具列彈出視窗中輸入密碼。',
    '紧凑显示，解锁后继续等待中的翻译。': '緊湊顯示，解鎖後繼續等待中的翻譯。',
    '密码不保存，也不发送给 AI 服务。': '密碼不儲存，也不傳送給 AI 服務。',
    '重启浏览器或重载扩展后需重新解锁。': '重新啟動瀏覽器或載入擴充功能後需重新解鎖。',
    '实际界面截图 · 测试密码已遮挡。': '實際介面截圖 · 測試密碼已遮蔽。',
    '一段原文，\n多种模型对照。': '一段原文，\n多種模型對照。',
    '最多同时对比 5 个 AI 模型。': '最多同時比較 5 個 AI 模型。',
    '独立译文、复制与失败重试。': '獨立譯文、複製與失敗重試。',
    '使用你自己的 AI 服务。': '使用你自己的 AI 服務。',
    '需自行配置 AI 服务，服务商可能收取费用。': '需自行設定 AI 服務，服務商可能收取費用。',
    '实际界面截图 · 译文为测试服务示例。': '實際介面截圖 · 譯文為測試服務範例。',
    '选中文字，\n继续你的阅读。': '選取文字，\n繼續你的閱讀。',
    '划词或右键，打开同一个翻译浮窗。': '選取或右鍵，開啟同一個翻譯浮動視窗。',
    '固定本次浮窗，拖动顶部调整位置。': '固定本次浮動視窗，拖曳頂部調整位置。',
    '多模型先显示两个，其余滚动查看。': '多模型先顯示兩個，其餘捲動查看。',
    '适用于普通 HTTP / HTTPS 网页。': '適用於一般 HTTP / HTTPS 網頁。',
    '连接自己的服务，\n选择翻译模型。': '連接自己的服務，\n選擇翻譯模型。',
    '设置 API 地址与密钥。': '設定 API 網址與金鑰。',
    '拉取模型列表，或手动填写模型 ID。': '取得模型清單，或手動填寫模型 ID。',
    '简体、繁体中文与英文界面。': '簡體、繁體中文與英文介面。',
    '需要兼容 Chat Completions 的 AI 服务。': '需要相容 Chat Completions 的 AI 服務。',
    '实际界面截图 · 本地测试地址，密钥已遮挡。': '實際介面截圖 · 本機測試網址，金鑰已遮蔽。',
}

LOCALIZED_COPY = {'ja': {'01 / COMPARE MODELS': '01 / モデルを比較',
        '02 / TRANSLATE IN PLACE': '02 / その場で翻訳',
        '03 / YOUR AI SERVICE': '03 / 自分の AI サービス',
        '04 / UNLOCK IN PLACE': '04 / その場で解除',
        '一段原文，\n多种模型对照。': 'ひとつの文章を、\n複数の視点で。',
        '最多同时对比 5 个 AI 模型。': '最大 5 つの AI モデルを比較。',
        '独立译文、复制与失败重试。': 'モデルごとに結果・コピー・再試行。',
        '使用你自己的 AI 服务。': '使う AI サービスは、あなたが選ぶ。',
        '需自行配置 AI 服务，服务商可能收取费用。': 'AI サービスの設定が必要です。料金が発生する場合があります。',
        '实际界面截图 · 译文为测试服务示例。': '実際の UI · 訳文はテストサービスの例です。',
        '选中文字，\n继续你的阅读。': '文章を選択。\n読書を続けよう。',
        '划词或右键，打开同一个翻译浮窗。': '選択・右クリックで共通のパネルを表示。',
        '固定本次浮窗，拖动顶部调整位置。': 'パネルを固定し、上部をドラッグして移動。',
        '多模型先显示两个，其余滚动查看。': 'まず 2 件を表示。残りはスクロール。',
        '适用于普通 HTTP / HTTPS 网页。': '通常の HTTP / HTTPS ページで利用できます。',
        '保护你的密钥，\n选择翻译模型。': 'キーを守る。\nモデルを選ぶ。',
        '至少 6 个字符的本地解锁密码。': '6 文字以上のローカル解除パスワード。',
        '加密保存密钥，随时锁定。': 'キーを暗号化保存。いつでもロック。',
        '拉取模型列表，或手动填写模型 ID。': 'モデル一覧を取得、または ID を手入力。',
        '需要兼容 Chat Completions 的 AI 服务。': 'Chat Completions 互換サービスが必要です。',
        '实际设置截图 · 示例模型，不展示已保存密钥。': '実際の設定 · モデルは例、保存キーは非表示。',
        '就地解锁，\n继续翻译。': 'ここで解除。\n翻訳を続けよう。',
        '在浮窗或工具栏弹窗中输入密码。': 'パネルやポップアップで直接解除。',
        '紧凑显示，解锁后继续等待中的翻译。': 'コンパクトなフォーム。解除後に翻訳を再開。',
        '密码不保存，也不发送给 AI 服务。': 'パスワードは保存せず、AI にも送りません。',
        '重启浏览器或重载扩展后需重新解锁。': 'ブラウザー再起動・拡張機能再読込後は再度解除。',
        '实际界面截图 · 测试密码已遮挡。': '実際の UI · テスト用パスワードは非表示。'},
 'ko': {'01 / COMPARE MODELS': '01 / 모델 비교',
        '02 / TRANSLATE IN PLACE': '02 / 그 자리에서 번역',
        '03 / YOUR AI SERVICE': '03 / 나만의 AI 서비스',
        '04 / UNLOCK IN PLACE': '04 / 바로 잠금 해제',
        '一段原文，\n多种模型对照。': '하나의 원문,\n다양한 번역.',
        '最多同时对比 5 个 AI 模型。': '최대 5개 AI 모델을 비교하세요.',
        '独立译文、复制与失败重试。': '모델별 결과, 복사, 다시 시도.',
        '使用你自己的 AI 服务。': '내가 선택한 AI 서비스를 사용하세요.',
        '需自行配置 AI 服务，服务商可能收取费用。': 'AI 서비스 설정이 필요하며 요금이 발생할 수 있습니다.',
        '实际界面截图 · 译文为测试服务示例。': '실제 UI · 번역문은 테스트 서비스 예시입니다.',
        '选中文字，\n继续你的阅读。': '글을 선택하고,\n계속 읽으세요.',
        '划词或右键，打开同一个翻译浮窗。': '선택 또는 우클릭으로 같은 패널을 엽니다.',
        '固定本次浮窗，拖动顶部调整位置。': '패널을 고정하고 상단을 드래그해 이동하세요.',
        '多模型先显示两个，其余滚动查看。': '두 결과를 먼저 보고 나머지는 스크롤하세요.',
        '适用于普通 HTTP / HTTPS 网页。': '일반 HTTP / HTTPS 페이지에서 사용합니다.',
        '保护你的密钥，\n选择翻译模型。': '키는 안전하게,\n모델은 자유롭게.',
        '至少 6 个字符的本地解锁密码。': '6자 이상의 로컬 잠금 해제 비밀번호.',
        '加密保存密钥，随时锁定。': '키를 암호화하고 언제든 잠그세요.',
        '拉取模型列表，或手动填写模型 ID。': '모델 목록을 가져오거나 ID를 입력하세요.',
        '需要兼容 Chat Completions 的 AI 服务。': 'Chat Completions 호환 서비스가 필요합니다.',
        '实际设置截图 · 示例模型，不展示已保存密钥。': '실제 설정 · 예시 모델, 저장된 키는 표시하지 않음.',
        '就地解锁，\n继续翻译。': '여기서 잠금 해제,\n번역은 계속.',
        '在浮窗或工具栏弹窗中输入密码。': '패널이나 팝업에서 바로 잠금 해제.',
        '紧凑显示，解锁后继续等待中的翻译。': '간결한 양식. 해제 후 대기 중인 번역 재개.',
        '密码不保存，也不发送给 AI 服务。': '비밀번호는 저장하거나 AI로 보내지 않습니다.',
        '重启浏览器或重载扩展后需重新解锁。': '브라우저 재시작·확장 재로드 후 다시 해제하세요.',
        '实际界面截图 · 测试密码已遮挡。': '실제 UI · 테스트 비밀번호는 가려져 있습니다.'}}

def save_if_changed(im, path):
    # Reuse unchanged assets rather than rewriting icons, promos or screenshots.
    if path.exists():
        existing = Image.open(path)
        if existing.size == im.size and existing.mode == im.mode and existing.tobytes() == im.tobytes():
            return
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)

def text(im, xy, value, size, color=INK, bold=False, zh=False):
    if zh == 'tw': value = TRADITIONAL_COPY.get(value, value)
    elif zh in ('ja', 'ko'): value = LOCALIZED_COPY[zh].get(value, value)
    ImageDraw.Draw(im).text(xy, value, font=font(size,bold,zh), fill=color, spacing=13)

def logo(im, xy, size):
    icon = Image.open(ROOT/'assets/icon-128.png').convert('RGBA').resize((size,size),Image.Resampling.LANCZOS)
    im.paste(icon,xy,icon)

def screenshot(im, source, box, xy, size=None):
    ui = Image.open(source).convert('RGB').crop(box)
    if size: ui = ui.resize(size,Image.Resampling.LANCZOS)
    # Only the presentation card has a shadow; screenshot content is unchanged.
    shadow = Image.new('RGBA',im.size)
    ImageDraw.Draw(shadow).rounded_rectangle((xy[0]-1,xy[1]+5,xy[0]+ui.width+1,xy[1]+ui.height+5),radius=14,fill='#193b3326')
    im.paste(Image.alpha_composite(im.convert('RGBA'),shadow.filter(ImageFilter.GaussianBlur(13))).convert('RGB'))
    im.paste(ui,xy)

def canvas():
    im=Image.new('RGB',(1280,800),BG)
    ImageDraw.Draw(im).rectangle((0,0,12,800),fill=GREEN)
    logo(im,(60,48),48)
    text(im,(124,52),'Transight AI',32,bold=True)
    return im

icon=Image.new('RGBA',(128,128))
art=Image.open(ROOT/'assets/icon-128.png').convert('RGBA').resize((96,96),Image.Resampling.LANCZOS)
icon.paste(art,(16,16))
save_if_changed(icon, OUT/'icons/icon-128.png')

for locale, folder, zh in [('en-US','en',False),('zh-CN','zh-CN',True),('zh-TW','zh-TW','tw'),('ja-JP','ja','ja'),('ko-KR','ko','ko')]:
    src=ROOT/'artifacts/screenshots'/locale
    dest=OUT/'screenshots'/folder
    im=canvas()
    text(im,(60,175),'01 / COMPARE MODELS',17,GREEN,bold=True,zh=zh if zh in ('ja', 'ko') else False)
    text(im,(60,231),'One text.\nMore perspectives.' if not zh else '一段原文，\n多种模型对照。',48,bold=True,zh=zh)
    lines = ['Compare up to 5 AI models.', 'Independent results, copy and retry.', 'Your AI service. Your choice.'] if not zh else ['最多同时对比 5 个 AI 模型。','独立译文、复制与失败重试。','使用你自己的 AI 服务。']
    for i,line in enumerate(lines): text(im,(60,414+i*43),line,23,MUTED,zh=zh)
    screenshot(im,src/'popup-multi.png',(0,0,400,710),(764,42))
    text(im,(60,680),'Bring your own API · Provider charges may apply.' if not zh else '需自行配置 AI 服务，服务商可能收取费用。',18,MUTED,zh=zh)
    text(im,(60,718),'Actual UI · Example responses from a test service.' if not zh else '实际界面截图 · 译文为测试服务示例。',17,MUTED,zh=zh)
    save_if_changed(im, dest/'01-multi-model.png')

    im=canvas()
    text(im,(60,175),'02 / TRANSLATE IN PLACE',17,GREEN,bold=True,zh=zh if zh in ('ja', 'ko') else False)
    text(im,(60,231),'Select. Translate.\nKeep reading.' if not zh else '选中文字，\n继续你的阅读。',48,bold=True,zh=zh)
    lines = ['Open from a selection or right-click.', 'Pin the panel and drag it into place.', 'Two results visible. Scroll for more.'] if not zh else ['划词或右键，打开同一个翻译浮窗。','固定本次浮窗，拖动顶部调整位置。','多模型先显示两个，其余滚动查看。']
    for i,line in enumerate(lines):text(im,(60,414+i*43),line,23,MUTED,zh=zh)
    # Existing screenshot: right-click panel in the top-right. Include its full
    # two-card viewport and edge/shadow, with no reconstructed UI.
    screenshot(im,src/'context-multi.png',(696,0,1120,700),(748,42))
    text(im,(60,680),'On ordinary HTTP/HTTPS webpages.' if not zh else '适用于普通 HTTP / HTTPS 网页。',18,MUTED,zh=zh)
    text(im,(60,718),'Actual UI · Example responses from a test service.' if not zh else '实际界面截图 · 译文为测试服务示例。',17,MUTED,zh=zh)
    save_if_changed(im, dest/'02-on-page.png')

    im=canvas()
    text(im,(60,175),'03 / YOUR AI SERVICE',17,GREEN,bold=True,zh=zh if zh in ('ja', 'ko') else False)
    text(im,(60,231),'Protect your key.\nChoose your models.' if not zh else '保护你的密钥，\n选择翻译模型。',42,bold=True,zh=zh)
    lines=['Local unlock password: 6+ characters.', 'Encrypt your key. Lock it at any time.', 'Fetch models or enter model IDs.'] if not zh else ['至少 6 个字符的本地解锁密码。','加密保存密钥，随时锁定。','拉取模型列表，或手动填写模型 ID。']
    for i,line in enumerate(lines):text(im,(60,414+i*43),line,21 if not zh else 22,MUTED,zh=zh)
    # Crop the actual protection + model controls, preserving their aspect ratio.
    settings_box = {'en-US': (123,641,702,1318), 'zh-CN': (123,620,702,1256), 'zh-TW': (123,620,702,1277), 'ja-JP': (123,641,702,1318), 'ko-KR': (123,641,702,1318)}[locale]
    settings_height = round((settings_box[3] - settings_box[1]) * 530 / 579)
    screenshot(im,src/'options-multi.png',settings_box,(650,112),(530,settings_height))
    text(im,(60,680),'Compatible Chat Completions API required.' if not zh else '需要兼容 Chat Completions 的 AI 服务。',18,MUTED,zh=zh)
    text(im,(60,718),'Actual settings · Test models, saved key not displayed.' if not zh else '实际设置截图 · 示例模型，不展示已保存密钥。',17,MUTED,zh=zh)
    save_if_changed(im, dest/'03-settings.png')

    im=canvas()
    text(im,(60,175),'04 / UNLOCK IN PLACE',17,GREEN,bold=True,zh=zh if zh in ('ja', 'ko') else False)
    text(im,(60,231),'Unlock here.\nKeep translating.' if not zh else '就地解锁，\n继续翻译。',48,bold=True,zh=zh)
    lines = ['Unlock in the popup or on-page panel.', 'A compact form. Pending work resumes.', 'Passwords stay out of AI requests.'] if not zh else ['在浮窗或工具栏弹窗中输入密码。','紧凑显示，解锁后继续等待中的翻译。','密码不保存，也不发送给 AI 服务。']
    for i,line in enumerate(lines): text(im,(60,414+i*43),line,22,MUTED,zh=zh)
    # Include the entire actual locked panel, uniformly scaled to fit the canvas.
    screenshot(im,src/'selection-locked.png',(696,0,1120,860),(792,26),(365,740))
    text(im,(60,680),'Unlock again after browser restart or extension reload.' if not zh else '重启浏览器或重载扩展后需重新解锁。',18,MUTED,zh=zh)
    text(im,(60,718),'Actual UI · Masked test password.' if not zh else '实际界面截图 · 测试密码已遮挡。',17,MUTED,zh=zh)
    save_if_changed(im, dest/'04-inline-unlock.png')

# Promotions are language-neutral branding plus concise English copy.
# High-resolution rendering followed by downsampling keeps type crisp.
for w,h,filename in [(440,280,'small-440x280.png'),(1400,560,'marquee-1400x560.png')]:
    scale=3 if w==440 else 2
    im=Image.new('RGB',(w*scale,h*scale),GREEN)
    d=ImageDraw.Draw(im)
    d.ellipse((w*scale-int(h*scale*.9),-int(h*scale*.65),w*scale+int(h*scale*.6),int(h*scale*.85)),outline='#368373',width=scale)
    d.ellipse((w*scale-int(h*scale*.7),int(h*scale*.4),w*scale+int(h*scale*.8),int(h*scale*1.9)),outline='#368373',width=scale)
    def t(x,y,v,n,bold=False,color='#ffffff'):text(im,(x*scale,y*scale),v,n*scale,color,bold)
    if w==440:
        logo(im,(28*scale,24*scale),48*scale)
        t(89,31,'Transight AI',30,True)
        t(30,108,'Across languages.',31,True)
        t(30,148,'Closer in meaning.',31,True)
        t(31,224,'AI translation. Your models.',17,color='#d9ede3')
    else:
        logo(im,(74*scale,58*scale),76*scale)
        t(172,70,'Transight AI',45,True)
        t(78,198,'Across languages.',72,True)
        t(78,282,'Closer in meaning.',72,True)
        t(82,425,'Select text. Compare AI models. Keep reading.',27,color='#d9ede3')
        # Reuse the brand artwork, not an invented translation/chat symbol.
        logo(im,(1080*scale,190*scale),200*scale)
    save_if_changed(im.resize((w,h),Image.Resampling.LANCZOS), OUT/'promo'/filename)
print('Prepared store icon, 4 existing-UI screenshots per locale, and both promotional tiles.')
