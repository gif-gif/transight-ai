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
    return ImageFont.truetype(CJK if zh else BOLD if bold else FONT, size)

TRADITIONAL_COPY = {
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

for locale, folder, zh in [('en-US','en',False),('zh-CN','zh-CN',True),('zh-TW','zh-TW','tw')]:
    src=ROOT/'artifacts/screenshots'/locale
    dest=OUT/'screenshots'/folder
    im=canvas()
    text(im,(60,175),'01 / COMPARE MODELS',17,GREEN,bold=True)
    text(im,(60,231),'One text.\nMore perspectives.' if not zh else '一段原文，\n多种模型对照。',48,bold=True,zh=zh)
    lines = ['Compare up to 5 AI models.', 'Independent results, copy and retry.', 'Your AI service. Your choice.'] if not zh else ['最多同时对比 5 个 AI 模型。','独立译文、复制与失败重试。','使用你自己的 AI 服务。']
    for i,line in enumerate(lines): text(im,(60,414+i*43),line,23,MUTED,zh=zh)
    screenshot(im,src/'popup-multi.png',(0,0,400,710),(764,42))
    text(im,(60,680),'Bring your own API · Provider charges may apply.' if not zh else '需自行配置 AI 服务，服务商可能收取费用。',18,MUTED,zh=zh)
    text(im,(60,718),'Actual UI · Example responses from a test service.' if not zh else '实际界面截图 · 译文为测试服务示例。',17,MUTED,zh=zh)
    save_if_changed(im, dest/'01-multi-model.png')

    im=canvas()
    text(im,(60,175),'02 / TRANSLATE IN PLACE',17,GREEN,bold=True)
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
    text(im,(60,175),'03 / YOUR AI SERVICE',17,GREEN,bold=True)
    text(im,(60,231),'Choose your\ntranslation models.' if not zh else '连接自己的服务，\n选择翻译模型。',42,bold=True,zh=zh)
    lines=['Set your endpoint and API key.', 'Fetch models or enter model IDs.', 'English + Simplified / Traditional Chinese.'] if not zh else ['设置 API 地址与密钥。','拉取模型列表，或手动填写模型 ID。','简体、繁体中文与英文界面。']
    for i,line in enumerate(lines):text(im,(60,414+i*43),line,21 if not zh else 22,MUTED,zh=zh)
    # Crop the existing service configuration card, keeping masked test key.
    screenshot(im,src/'options-multi.png',(96,285,730,950 if not zh else 935),(650,112),(570,598 if not zh else 584))
    text(im,(60,680),'Compatible Chat Completions API required.' if not zh else '需要兼容 Chat Completions 的 AI 服务。',18,MUTED,zh=zh)
    text(im,(60,718),'Actual UI · Local test endpoint, masked test key.' if not zh else '实际界面截图 · 本地测试地址，密钥已遮挡。',17,MUTED,zh=zh)
    save_if_changed(im, dest/'03-settings.png')

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
print('Prepared store icon, 3 existing-UI screenshots per locale, and both promotional tiles.')
