"""Generate localized promotional tiles; reuse the existing English artwork.

Run independently of screenshot capture with Python 3 + Pillow. English files
stay at promo/ for compatibility; other locales use promo/<locale>/.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'chrome-web-store/promo'
GREEN = '#126754'
COPY = {
    'zh-CN': ('让理解，', '少一点距离。', 'AI 翻译，由你选择模型。', '选中文字，对比 AI 译文，继续阅读。'),
    'zh-TW': ('讓理解，', '少一點距離。', 'AI 翻譯，由你選擇模型。', '選取文字，比較 AI 譯文，繼續閱讀。'),
    'ja': ('言葉を越えて、', '理解を近くに。', 'AI 翻訳。モデルはあなたが選ぶ。', '文章を選択。AI の訳を比較。そのまま読み進める。'),
    'ko': ('언어를 넘어,', '의미를 더 가까이.', 'AI 번역. 모델은 직접 선택하세요.', '텍스트 선택. AI 번역 비교. 계속 읽어 보세요.'),
}
SIZES = [(440, 280, 'small-440x280.png'), (1400, 560, 'marquee-1400x560.png')]


def font(locale, size, bold=False):
    if locale == 'ja':
        path = next(Path('/System/Library/Fonts').glob(f'*角* W{6 if bold else 3}.ttc'))
    elif locale == 'ko':
        path = Path('/System/Library/Fonts/AppleSDGothicNeo.ttc')
    elif locale in ('zh-CN', 'zh-TW'):
        path = Path('/System/Library/Fonts/Hiragino Sans GB.ttc')
    else:
        path = Path('/System/Library/Fonts/Supplemental') / ('Arial Bold.ttf' if bold else 'Arial.ttf')
    return ImageFont.truetype(str(path), size)


def save_if_changed(image, path):
    if path.exists():
        with Image.open(path) as old:
            if old.mode == image.mode and old.size == image.size and old.tobytes() == image.tobytes():
                return
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def render(locale, copy, width, height):
    scale = 3 if width == 440 else 2
    image = Image.new('RGB', (width * scale, height * scale), GREEN)
    draw = ImageDraw.Draw(image)
    w, h = image.size
    draw.ellipse((w-int(h*.9), -int(h*.65), w+int(h*.6), int(h*.85)), outline='#368373', width=scale)
    draw.ellipse((w-int(h*.7), int(h*.4), w+int(h*.8), int(h*1.9)), outline='#368373', width=scale)

    def logo(x, y, size):
        with Image.open(ROOT / 'assets/icon-128.png') as source:
            icon = source.convert('RGBA').resize((size*scale, size*scale), Image.Resampling.LANCZOS)
        image.paste(icon, (x*scale, y*scale), icon)

    def text(x, y, value, size, max_width, bold=False, color='#ffffff', language=locale):
        requested = size
        while True:
            face = font(language, size*scale, bold)
            if draw.textlength(value, font=face) <= max_width*scale:
                break
            size -= 1
            assert size >= requested*.7, f'Text too long: {locale}: {value}'
        box = draw.textbbox((x*scale, y*scale), value, font=face, anchor='lt')
        assert box[0] >= 0 and box[2] <= w and box[3] <= h, (locale, value, box)
        draw.text((x*scale, y*scale), value, font=face, fill=color, anchor='lt')

    if width == 440:
        logo(28, 24, 48)
        text(89, 37, 'Transight AI', 30, 321, True, language='en')
        text(30, 113, copy[0], 31, 380, True)
        text(30, 156, copy[1], 31, 380, True)
        text(31, 229, copy[2], 17, 378, color='#d9ede3')
    else:
        logo(74, 58, 76)
        text(172, 78, 'Transight AI', 45, 850, True, language='en')
        text(78, 210, copy[0], 72, 930, True)
        text(78, 300, copy[1], 72, 930, True)
        text(82, 435, copy[3], 27, 1000, color='#d9ede3')
        logo(1080, 190, 200)
    return image.resize((width, height), Image.Resampling.LANCZOS)


if __name__ == '__main__':
    for width, height, filename in SIZES:
        with Image.open(OUT / filename) as english:
            assert english.mode == 'RGB' and english.size == (width, height), filename
        for locale, copy in COPY.items():
            save_if_changed(render(locale, copy, width, height), OUT / locale / filename)
    print('Prepared 8 localized promotional tiles; reused 2 existing English tiles unchanged.')
