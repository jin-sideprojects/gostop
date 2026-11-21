import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
H = os.path.expanduser('~/mnt/hwatu'); O = os.path.expanduser('~/mnt/gostop/assets/cards')
os.makedirs(O, exist_ok=True)
OW, OH = 420, 644          # 60:92 x7, game card ratio
SS = 2                     # supersample for ribbon drawing
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
def ribbon(im, color, text=None):
    W, Hh = im.size
    bh = int(Hh * 0.145); L = int(W * 1.5)
    band = Image.new('RGBA', (L, bh), (0, 0, 0, 0)); d = ImageDraw.Draw(band)
    d.rectangle([0, 0, L, bh], fill=color + (255,))
    # soft sheen + paper-like inner lines
    sheen = Image.new('RGBA', (L, bh), (0, 0, 0, 0)); sd = ImageDraw.Draw(sheen)
    for i in range(bh // 2):
        sd.line([0, i, L, i], fill=(255, 255, 255, int(46 * (1 - i / (bh / 2)))))
    band.alpha_composite(sheen); d = ImageDraw.Draw(band)
    d.line([0, 2, L, 2], fill=(20, 10, 10, 255), width=3)
    d.line([0, bh - 3, L, bh - 3], fill=(20, 10, 10, 255), width=3)
    g = (212, 175, 90, 255)
    d.line([0, 11, L, 11], fill=g, width=2); d.line([0, bh - 12, L, bh - 12], fill=g, width=2)
    if text:
        f = font(int(bh * 0.52)); tw = d.textlength(text, font=f)
        tx, ty = (L - tw) / 2, bh / 2
        d.text((tx + 2, ty + 2), text, font=f, fill=(0, 0, 0, 110), anchor='lm')
        d.text((tx, ty), text, font=f, fill=(252, 240, 214, 255), anchor='lm')
    ang = 11
    rot = band.rotate(ang, resample=Image.BICUBIC, expand=True)
    cx, cy = W // 2, int(Hh * 0.50)
    pos = (cx - rot.width // 2, cy - rot.height // 2)
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    a = rot.split()[3].point(lambda v: int(v * 0.45))
    sh.paste(Image.new('RGBA', rot.size, (0, 0, 0, 255)), (pos[0] + 6, pos[1] + 12), a)
    sh = sh.filter(ImageFilter.GaussianBlur(8))
    base = im.convert('RGBA'); base.alpha_composite(sh)
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); lay.paste(rot, pos, rot)
    base.alpha_composite(lay)
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
RB = {1:('hong',RED,'홍단'),2:('hong',RED,'홍단'),3:('hong',RED,'홍단'),4:('cho',GREEN,None),5:('cho',GREEN,None),7:('cho',GREEN,None),
      6:('cheong',BLUE,'청단'),9:('cheong',BLUE,'청단'),10:('cheong',BLUE,'청단'),12:('tti',RED,None)}
for m,(kind,col,txt) in RB.items():
    save(ribbon(fit(f'{H}/{m:02d}-ribbon.jpg'), col, txt), f'm{m:02d}-{kind}')
print(len(os.listdir(O)))
