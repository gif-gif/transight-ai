"""Adapt existing artwork and actual UI screenshots; no new UI captures or AI images.
Run after the five-locale browser suite with Python 3 + Pillow.
Updates store assets and only screenshots referenced by the root README files.
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

def save_if_changed(im, path):
    # Reuse unchanged assets rather than rewriting icons, promos or screenshots.
    if path.exists():
        existing = Image.open(path)
        if existing.size == im.size and existing.mode == im.mode and existing.tobytes() == im.tobytes():
            return
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)

def text(im, xy, value, size, color=INK, bold=False, zh=False):
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

# -*- coding: utf-8 -*-
# Copy describes only visible, currently shipped controls. UI pixels come from
# the isolated browser suite; the mock replies do not represent model quality.
SHOT_COPY = {
'en': [
 ('One text.\nMore perspectives.', ['Full mode: compare up to 5 models.', 'Copy, listen, or retry each result.', 'Your AI service. Your choice.']),
 ('Less interface.\nMore understanding.', ['Simple mode uses your first model.', 'Edit the source. Translation follows.', 'Copy and local speech stay close.']),
 ('Translate\nyour way.', ['Choose Simple or Full mode.', 'Turn the selection trigger on or off.', 'Write your own system prompt.']),
 ('Unlock here.\nKeep translating.', ['Unlock in the popup or page panel.', 'Your API key stays encrypted at rest.', 'Passwords are not sent to AI services.']),
 ('Select a passage.\nStart right there.', ['A small icon near the selection end.', 'Click to open the translation panel.', 'Selection alone sends no request.'])],
'zh-CN': [
 ('一段原文，\n多种模型对照。', ['Full 模式，最多对比 5 个模型。','独立译文、复制、朗读与重试。','使用你自己选择的 AI 服务。']),
 ('少一点界面，\n多一点理解。', ['Simple 模式，只用第一个模型。','编辑原文，停笔后自动翻译。','保留复制与本地语音朗读。']),
 ('按你的方式，\n开始翻译。', ['选择 Simple 或 Full 模式。','随时开启或关闭划词入口。','自定义翻译系统提示词。']),
 ('就地解锁，\n继续翻译。', ['在弹窗或页面浮窗直接解锁。','API Key 在本地加密保存。','解锁密码不发送给 AI 服务。']),
 ('选中一段，\n从这里开始。', ['小图标贴近选中文字的末尾。','点击打开翻译浮窗。','仅选中文字，不发送翻译请求。'])],
'zh-TW': [
 ('一段原文，\n多種模型對照。', ['Full 模式，最多比較 5 個模型。','獨立譯文、複製、朗讀與重試。','使用你自己選擇的 AI 服務。']),
 ('少一點介面，\n多一點理解。', ['Simple 模式，只用第一個模型。','編輯原文，停筆後自動翻譯。','保留複製與本機語音朗讀。']),
 ('按你的方式，\n開始翻譯。', ['選擇 Simple 或 Full 模式。','隨時開啟或關閉選取翻譯入口。','自訂翻譯系統提示詞。']),
 ('就地解鎖，\n繼續翻譯。', ['在彈出視窗或頁面浮窗直接解鎖。','API Key 在本機加密儲存。','解鎖密碼不傳送給 AI 服務。']),
 ('選取一段，\n從這裡開始。', ['小圖示靠近所選文字的末尾。','點擊開啟翻譯浮動視窗。','僅選取文字，不傳送翻譯請求。'])],
'ja': [
 ('ひとつの文章を、\n複数の視点で。', ['Full モードで最大 5 モデルを比較。','結果ごとにコピー・読み上げ・再試行。','自分で選んだ AI サービスを利用。']),
 ('シンプルに、\n理解を深く。', ['Simple は最初のモデルだけを使用。','原文を編集すると、自動で再翻訳。','コピーとローカル読み上げも利用可能。']),
 ('あなたに合った\n翻訳体験を。', ['Simple / Full モードを切り替え。','選択翻訳のオン・オフを設定。','システムプロンプトを自由に編集。']),
 ('その場で解除。\n翻訳を続けよう。', ['ポップアップやパネルでロック解除。','API キーはローカルで暗号化保存。','解除用パスワードは AI に送信しません。']),
 ('文章を選択。\nそこから翻訳。', ['選択範囲の末尾に小さなアイコン。','クリックで翻訳パネルを表示。','選択するだけでは送信しません。'])],
'ko': [
 ('하나의 원문,\n다양한 관점.', ['Full 모드에서 최대 5개 모델 비교.','결과별 복사, 읽기, 다시 시도.','내가 선택한 AI 서비스를 사용하세요.']),
 ('더 간결하게,\n더 깊이 이해하기.', ['Simple은 첫 번째 모델만 사용합니다.','원문을 수정하면 자동으로 번역합니다.','복사와 로컬 음성 읽기도 그대로.']),
 ('나에게 맞는\n번역 방식.', ['Simple / Full 모드를 선택하세요.','선택 번역을 켜거나 끄세요.','시스템 프롬프트를 직접 작성하세요.']),
 ('여기서 잠금 해제,\n번역은 계속.', ['팝업이나 페이지 패널에서 바로 해제.','API 키는 로컬에 암호화 저장됩니다.','해제 비밀번호는 AI에 보내지 않습니다.']),
 ('문장을 선택하고,\n바로 시작하세요.', ['선택한 텍스트 끝에 작은 아이콘.','클릭하면 번역 패널이 열립니다.','선택만으로는 요청을 보내지 않습니다.'])]}
NOTES = {
'en': ('Actual UI · Local mock service; example results only.', 'Bring your own API. Provider charges may apply.'),
'zh-CN': ('实际界面 · 本地模拟服务，译文仅为示例。','需自行配置 API，服务商可能收取费用。'),
'zh-TW': ('實際介面 · 本機模擬服務，譯文僅為範例。','需自行設定 API，服務商可能收取費用。'),
'ja': ('実際の UI · ローカル模擬サービスの翻訳例です。','API の設定が必要です。料金が発生する場合があります。'),
'ko': ('실제 UI · 로컬 모의 서비스의 예시 번역입니다.','API 설정이 필요하며 서비스 요금이 발생할 수 있습니다.')}

def fitted_text(im, xy, value, size, max_width, **kwargs):
    # Fit each localized line, never clip or silently wrap promotional copy.
    while max(ImageDraw.Draw(im).textbbox((0,0), line, font=font(size, kwargs.get('bold',False), kwargs.get('zh',False)))[2] for line in value.splitlines()) > max_width:
        size -= 1
        if size < 14: raise ValueError(f'Copy too long: {value}')
    text(im, xy, value, size, **kwargs)

def settings_crop(source):
    im=Image.open(source).convert('RGB')
    runs=[]; start=None
    for y in range(im.height):
        white=im.getpixel((115,y))==(255,255,255)
        if white and start is None: start=y
        elif not white and start is not None:
            if y-start>80: runs.append((start,y))
            start=None
    assert len(runs)==3, f'Inspect updated settings layout: {source}: {runs}'
    return (90,runs[-2][0]-6,735,runs[-1][1]+6)

for locale, folder, zh in [('en-US','en',False),('zh-CN','zh-CN',True),('zh-TW','zh-TW','tw'),('ja-JP','ja','ja'),('ko-KR','ko','ko')]:
    src=ROOT/'artifacts/screenshots'/locale
    dest=OUT/'screenshots'/folder
    sources=[('popup-multi.png','01-multi-model.png',(0,0,400,710)),
             ('selection-simple.png','02-on-page.png',(0,64,424,435)),
             ('settings-preferences.png','03-settings.png',settings_crop(src/'settings-preferences.png')),
             ('selection-locked.png','04-inline-unlock.png',(696,0,1120,860)),
             ('selection-trigger.png','05-selection-trigger.png',(0,0,424,160))]
    for index,((source,filename,box),(title,lines)) in enumerate(zip(sources,SHOT_COPY[folder]),1):
        im=canvas()
        text(im,(60,175),f'{index:02d} / TRANSIGHT AI',17,GREEN,bold=True)
        fitted_text(im,(60,231),title,44,535,bold=True,zh=zh)
        for i,line in enumerate(lines): fitted_text(im,(60,412+i*48),line,23,535,color=MUTED,zh=zh)
        fitted_text(im,(60,675),NOTES[folder][1],17,535,color=MUTED,zh=zh)
        fitted_text(im,(60,716),NOTES[folder][0],16,535,color=MUTED,zh=zh)
        width,height=box[2]-box[0],box[3]-box[1]
        scale=min(530/width,710/height,1.25)
        size=(round(width*scale),round(height*scale))
        xy=(650+(530-size[0])//2,(800-size[1])//2)
        screenshot(im,src/source,box,xy,size)
        save_if_changed(im,dest/filename)

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
# Synchronize only root-README image references, never unrelated website images.
import re, shutil
readme_images = set()
for readme in ROOT.glob('README*.md'):
    readme_images.update(re.findall(r'docs/screenshots/[^\s"<>\)]+\.png', readme.read_text()))
locale_dirs = {'en':'en-US','ja':'ja-JP','ko':'ko-KR','zh-TW':'zh-TW'}
for relative in sorted(readme_images):
    target=ROOT/relative
    tail=target.relative_to(ROOT/'docs/screenshots')
    assert len(tail.parts) in (1,2), relative
    locale='zh-CN' if len(tail.parts)==1 else locale_dirs[tail.parts[0]]
    source=ROOT/'artifacts/screenshots'/locale/tail.name
    assert source.exists(), f'Missing fresh browser screenshot: {source}'
    target.parent.mkdir(parents=True,exist_ok=True)
    if not target.exists() or source.read_bytes()!=target.read_bytes(): shutil.copyfile(source,target)
print(f'Prepared 25 store screenshots and {len(readme_images)} README screenshots; unchanged brand assets reused.')
