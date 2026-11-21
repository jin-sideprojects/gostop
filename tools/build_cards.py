import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
H = os.path.expanduser('~/mnt/hwatu'); O = os.path.expanduser('~/mnt/gostop/assets/cards')
os.makedirs(O, exist_ok=True)
OW, OH = 420, 644          # 60:92 x7, game card ratio
SS = 3                     # supersample for ribbon drawing
FONT = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
def font(sz):
    for i in range(5):
        f = ImageFont.truetype(FONT, sz, index=i)
        if 'KR' in ' '.join(f.getname()): return f
    return ImageFont.truetype(FONT, sz, index=1)

def fit(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size; r = OW / OH
    if w / h > r:  nw, nh = round(h * r), h
    else:          nw, nh = w, round(w / r)
    x, y = (w - nw) // 2, (h - nh) // 2
    return im.crop((x, y, x + nw, y + nh)).resize((OW * SS, OH * SS), Image.LANCZOS)

RED, BLUE, GREEN = (184, 29, 36), (29, 74, 153), (34, 120, 66)
import math
from PIL import ImageChops

def ribbon(im, color, month=1):
    """Original-hwatu ribbon: wide straight band, square-cut ends, running from upper left to lower right
    across the middle of the card (angle varies a little per month). No text."""
    W, H = im.size
    th = math.radians(18 + (month * 7) % 11)          # 18..28 deg from vertical
    w = W * 0.28; half = H * 0.38 / math.cos(th)
    cx, cy = W * 0.5, H * 0.46
    ux, uy = math.sin(th), math.cos(th)               # down-right along the band
    nx, ny = math.cos(th), -math.sin(th)
    def P(a, b): return (cx + ux * a + nx * b, cy + uy * a + ny * b)
    N = 60; amp = W * 0.035; ph = 0.5 + month * 0.37          # gentle sway like the printed ribbons
    sw = lambda i: amp * math.sin(2 * math.pi * 0.85 * i / N + ph)
    A = lambda i: -half + 2 * half * i / N
    left = [P(A(i), sw(i) - w / 2) for i in range(N + 1)]
    right = [P(A(i), sw(i) + w / 2) for i in range(N + 1)]
    poly = left + right[::-1]
    gl = lambda k: [P(A(i) * 0.97, sw(i) + w * k) for i in range(N + 1)]
    clip = Image.new('L', im.size, 0); ImageDraw.Draw(clip).polygon(poly, fill=255)
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    d.polygon(poly, fill=color + (255,))
    sheen = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sheen).line(gl(-0.12), fill=(255, 255, 255, 34), width=int(w * 0.34), joint='curve')
    sheen = sheen.filter(ImageFilter.GaussianBlur(w * 0.09))
    sheen.putalpha(ImageChops.multiply(sheen.split()[3], clip)); layer.alpha_composite(sheen)
    d = ImageDraw.Draw(layer)
    gold = (214, 178, 96, 255); ink = (25, 14, 12, 255)
    d.line(poly + [poly[0]], fill=ink, width=max(3, int(W * 0.007)), joint='curve')
    ins = 0.40
    d.line(gl(-ins), fill=gold, width=max(2, int(W * 0.0035)))
    d.line(gl(ins), fill=gold, width=max(2, int(W * 0.0035)))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); sh.paste((0, 0, 0, 120), (int(W * 0.012), int(W * 0.022)), clip)
    sh = sh.filter(ImageFilter.GaussianBlur(W * 0.012))
    base = im.convert('RGBA'); base.alpha_composite(sh); base.alpha_composite(layer)
    return base.convert('RGB')

def save(im, name):
    im.resize((OW, OH), Image.LANCZOS).save(f'{O}/{name}.webp', 'WEBP', quality=86, method=6)

plain = lambda p: save(fit(f'{H}/{p}'), None)
M = {}  # id -> source
gw = {1:'01-gwang.jpg',3:'03-gwang.jpg',8:'08-gwang.jpg',11:'11-gwang.jpg',12:'12-gwang.jpg'}
ye = {2:'02-bird.jpg',4:'04-bird.webp',5:'05-flower.jpg',6:'06-main.jpg',7:'07-boar.jpg',8:'08-birds.jpg',9:'09-flower.jpg',10:'10-dear.jpg',12:'12-bird.jpg'}
for m,f in gw.items(): M[f'm{m:02d}-gwang'] = f
for m,f in ye.items(): M[f'm{m:02d}-yeol'] = f
M['m11-ssangpi']='11-double.jpg'; M['m12-ssangpi']='12-double.jpg'
skins = {1:['01-skin.jpg','01-skin02.jpg'],2:['02-skin.jpg'],3:['03-skin.jpg'],4:['04-skin.jpg'],5:['05-skin.jpg'],
         6:['06-skin.jpg'],7:['07-skin.jpg'],8:['08-skin.jpg','08-skin2.jpg'],9:['09-skin.jpg'],10:['10-skin.jpg'],11:['11-skin.jpg']}
for m,l in skins.items():
    M[f'm{m:02d}-pi1'] = l[0]; M[f'm{m:02d}-pi2'] = l[1] if len(l) > 1 else l[0]
for k,f in M.items(): save(fit(f'{H}/{f}'), k)
RB = {1:('hong',RED),2:('hong',RED),3:('hong',RED),4:('cho',GREEN),5:('cho',GREEN),7:('cho',GREEN),
      6:('cheong',BLUE),9:('cheong',BLUE),10:('cheong',BLUE),12:('tti',RED)}
for m,(kind,col) in RB.items():
    save(ribbon(fit(f'{H}/{m:02d}-ribbon.jpg'), col, m), f'm{m:02d}-{kind}')
print(len(os.listdir(O)))
