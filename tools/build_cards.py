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

def emptiest_x(im, wfrac):
    """x-center (fraction) of the vertical strip with the least detail -> ribbon hangs where it hides least art."""
    g = im.convert('L').filter(ImageFilter.FIND_EDGES).resize((84, 128))
    px = g.load(); w = max(2, round(84 * wfrac)); best = None
    cols = [sum(px[x, y] for y in range(0, 108)) for x in range(84)]
    for x0 in range(round(84 * 0.20), round(84 * 0.80) - w):
        c = sum(cols[x0:x0 + w]) + abs((x0 + w / 2) / 84 - 0.5) * 900   # slight pull to the middle
        if best is None or c < best[0]: best = (c, (x0 + w / 2) / 84)
    return best[1]

def ribbon(im, color, flip=1):
    """Tanzaku hanging from the top edge: slim vertical strip, gentle sway, swallow-tail bottom, gold hairlines."""
    W, H = im.size
    wr = 0.185; w = W * wr
    x0 = emptiest_x(im, wr) * W
    y0, y1 = -H * 0.02, H * 0.835
    tilt = flip * 0.028 * H          # horizontal drift top->bottom
    amp = W * 0.018
    N = 90
    pts = []
    for i in range(N + 1):
        t = i / N
        pts.append((x0 - tilt / 2 + tilt * t + amp * math.sin(t * math.pi * 2.1 + 0.6), y0 + (y1 - y0) * t))
    L = [(x - w / 2, y) for x, y in pts]; R = [(x + w / 2, y) for x, y in pts]
    notch = w * 0.42
    cx, cy = pts[-1]
    poly = L + [(cx - w / 2, cy), (cx, cy - notch), (cx + w / 2, cy)] + R[::-1]
    def off(dx): return [(x + dx, y) for x, y in pts[:-8]]
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    d.polygon(poly, fill=color + (255,))
    # soft sheen along the centre line
    sheen = Image.new('RGBA', im.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sheen)
    sd.line(off(-w * 0.10), fill=(255, 255, 255, 70), width=int(w * 0.34), joint='curve')
    sheen = sheen.filter(ImageFilter.GaussianBlur(w * 0.10))
    clip = Image.new('L', im.size, 0); ImageDraw.Draw(clip).polygon(poly, fill=255)
    sheen.putalpha(ImageChops.multiply(sheen.split()[3], clip))
    layer.alpha_composite(sheen)
    d = ImageDraw.Draw(layer)
    dark = tuple(int(c * 0.45) for c in color) + (255,); gold = (214, 178, 96, 255)
    d.line(poly + [poly[0]], fill=(25, 14, 12, 255), width=max(3, int(W * 0.006)), joint='curve')
    d.line(off(-w * 0.36), fill=gold, width=max(2, int(W * 0.0035)), joint='curve')
    d.line(off(w * 0.36), fill=gold, width=max(2, int(W * 0.0035)), joint='curve')
    d.line(off(-w * 0.30), fill=dark, width=max(1, int(W * 0.002)), joint='curve')
    d.line(off(w * 0.30), fill=dark, width=max(1, int(W * 0.002)), joint='curve')
    # shadow
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, 120), (int(W * 0.012), int(W * 0.022)), clip)
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
    save(ribbon(fit(f'{H}/{m:02d}-ribbon.jpg'), col, 1 if m % 2 else -1), f'm{m:02d}-{kind}')
print(len(os.listdir(O)))
