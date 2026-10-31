"""Covers + 小红书卡片 (9:16 film) from the board stills in build/stills (hook, b1, b2, b3, all)."""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); P = os.path.dirname(HERE)
ST = os.path.join(P, 'build', 'stills'); DV = os.path.join(P, 'deliverables')
FONT = os.path.join(P, 'assets', 'fonts', 'LXGWWenKai-Medium.ttf')
INK, RED, GRAY, BG = (35, 38, 44), (200, 65, 58), (110, 115, 124), (244, 243, 239)
F = lambda s: ImageFont.truetype(FONT, s)
im = lambda n: Image.open(os.path.join(ST, n + '.jpg')).convert('RGB')
SUB = '魏晋南北朝 · 五胡十六国  30 多个人物一次理清'


def strip(c, y, text, size=46):
    d = ImageDraw.Draw(c); W = c.width; f = F(size); w = d.textlength(text, font=f)
    d.rounded_rectangle([W / 2 - w / 2 - 40, y, W / 2 + w / 2 + 40, y + size + 40], 20, fill=(253, 252, 248))
    d.rectangle([W / 2 - w / 2 - 14, y + size + 26, W / 2 - w / 2 + 30, y + size + 31], fill=RED)
    d.text((W / 2, y + 20 + size / 2), text, font=f, fill=INK, anchor='mm')


def board(name):                      # the drawn part of a board (inside the safe area)
    return im(name).crop((90, 250, 990, 1400))


os.makedirs(os.path.join(DV, 'covers'), exist_ok=True); os.makedirs(os.path.join(DV, 'xhs'), exist_ok=True)
hook = im('hook')
# 9:16 — the opening frame itself
c = hook.copy(); strip(c, 1390, SUB, 40); c.save(os.path.join(DV, 'covers', 'cover_9x16.png'))
# 3:4 — the hook, cropped round the board text
c = hook.crop((0, 300, 1080, 1740)); strip(c, 1110, SUB, 40); c.save(os.path.join(DV, 'covers', 'cover_3x4.png'))
# 4:3 and 16:9 — hook on the left, the three finished boards on the right
for nm, (Wd, Ht) in {'cover_4x3': (1440, 1080), 'cover_16x9': (1920, 1080)}.items():
    c = Image.new('RGB', (Wd, Ht), BG)
    h = hook.crop((140, 360, 940, 1300)); h = h.resize((int(800 * (Ht - 160) / 940), Ht - 160), Image.LANCZOS); c.paste(h, (40, 40))
    x0 = 60 + h.width; tw = (Wd - x0 - 40) // 3
    for k, b in enumerate(['b1', 'b2', 'b3']):
        t = board(b); t = t.resize((tw - 12, int((tw - 12) * t.height / t.width)), Image.LANCZOS); c.paste(t, (x0 + k * tw, 60))
    strip(c, Ht - 120, '魏晋南北朝 · 五胡十六国', 44); c.save(os.path.join(DV, 'covers', nm + '.png'))

CARDS = [
    ('02_board1', 'b1', '第1块板：三国 → 西晋 → 八王之乱', ['曹操攥权，曹丕 220 建魏；司马懿→昭→炎三代把魏变成晋', '280 灭吴统一，只撑 36 年：封王给兵、何不食肉糜、八王之乱']),
    ('03_board2', 'b2', '第2块板：五胡 → 东晋 → 淝水之战', ['刘渊 304 建汉，刘聪破洛阳；316 西晋亡，司马睿+王导建东晋', '石勒建后赵；苻坚用王猛统一北方，383 淝水败给谢安、谢玄']),
    ('04_board3', 'b3', '第3块板：南北朝 → 隋 → 一家亲戚', ['北魏统一北方；南朝宋齐梁陈换群主，北朝东西魏→齐周拆群', '杨坚（北周宣帝岳父）建隋，589 灭陈；独孤信连起北周隋唐']),
]
c = Image.open(os.path.join(DV, 'covers', 'cover_3x4.png')); c.save(os.path.join(DV, 'xhs', '01_cover.png'))
for i, (nm, b, title, body) in enumerate(CARDS):
    c = Image.new('RGB', (1080, 1440), BG); d = ImageDraw.Draw(c)
    t = board(b); t = t.resize((int(t.width * 1130 / t.height), 1130), Image.LANCZOS); c.paste(t, ((1080 - t.width) // 2, 130))
    d.text((60, 62), title, font=F(52), fill=INK, anchor='lm'); d.rectangle([60, 100, 340, 107], fill=RED)
    for k, line in enumerate(body): d.text((60, 1290 + k * 52), line, font=F(31), fill=INK)
    d.text((1020, 1410), f'{i + 2:02d}/05', font=F(28), fill=GRAY, anchor='rm')
    c.save(os.path.join(DV, 'xhs', nm + '.png'))
# end card: the three boards together + how to remember + sources
c = Image.new('RGB', (1080, 1440), BG); d = ImageDraw.Draw(c)
d.text((60, 62), '你能背出几个群名？', font=F(58), fill=INK, anchor='lm'); d.rectangle([60, 102, 340, 109], fill=RED)
for k, b in enumerate(['b1', 'b2', 'b3']):
    t = board(b); t = t.resize((310, int(310 * t.height / t.width)), Image.LANCZOS); c.paste(t, (45 + k * 335, 150))
lines = ['南朝换群主：宋 → 齐 → 梁 → 陈', '北朝拆群：北魏 → 东/西魏 → 北齐/北周 → 隋', '群主皇冠：曹丕→司马炎→司马睿→宋齐梁陈→杨坚', '评论区默写：南朝四个群主分别是谁？',
         '来源：《三国志》《晋书》《资治通鉴》等常见年代与典故，维基百科核对', '信息截至 2026-10-31 · “群聊”只是比喻']
for k, line in enumerate(lines): d.text((60, 1000 + k * 62), line, font=F(32 if k < 4 else 26), fill=INK if k < 4 else GRAY)
d.text((1020, 1410), '05/05', font=F(28), fill=GRAY, anchor='rm')
c.save(os.path.join(DV, 'xhs', '05_end.png'))
print('ok')
