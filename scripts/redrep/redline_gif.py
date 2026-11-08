"""Redrep README art: the Redline gauge filling to a score, rendered to GIF.

Draws the same tachometer as frontend/src/components/RedlineGauge.jsx: a half-circle track, the
last ten points as the red zone, the fill in the accent, the score and its band underneath.

Usage: python scripts/redrep/redline_gif.py assets/redrep   (needs Pillow)
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SS = 3
W, H = 600, 380
FPS = 25
SCORE = 86
BG = (14, 14, 16)
TRACK = (58, 58, 60)
ZONE = (140, 20, 18)
ACC = (255, 69, 58)
TEXT = (242, 242, 247)
TEXT_2 = (142, 142, 147)
CX, CY, R, STROKE = 300, 250, 190, 30

BANDS = [(90, 'REDLINE'), (70, 'TOUGH'), (40, 'SOLID'), (0, 'EASY')]


def font(size, bold=False):
    for path in ('/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/Helvetica.ttc'):
        try:
            f = ImageFont.truetype(path, size * SS)
            if bold:
                try:
                    f.set_variation_by_name('Heavy')
                except Exception:
                    try:
                        f.set_variation_by_name('Bold')
                    except Exception:
                        pass
            return f
        except OSError:
            continue
    return ImageFont.load_default()


NUM, BAND, CAP = font(96, True), font(24, True), font(20)


def arc(dr, frm, to, color, cap=True):
    """Arc over the gauge from score `frm` to `to` (0..100), 180 degrees at 0 to 360 at 100."""
    if to <= frm:
        return
    box = [(CX - R) * SS, (CY - R) * SS, (CX + R) * SS, (CY + R) * SS]
    a0, a1 = 180 + 180 * frm / 100, 180 + 180 * to / 100
    dr.arc(box, a0, a1, fill=color, width=STROKE * SS)
    if cap:
        for a in (a0, a1):
            mid = R - STROKE / 2          # Pillow draws the stroke inward from the box
            x = CX + mid * math.cos(math.radians(a))
            y = CY + mid * math.sin(math.radians(a))
            rr = STROKE / 2
            dr.ellipse([(x - rr) * SS, (y - rr) * SS, (x + rr) * SS, (y + rr) * SS], fill=color)


def frame(value):
    img = Image.new('RGB', (W * SS, H * SS), BG)
    dr = ImageDraw.Draw(img)
    arc(dr, 0, 100, TRACK)
    arc(dr, 90, 100, ZONE, cap=False)
    mid, rr = R - STROKE / 2, STROKE / 2          # the zone's round end, over the track's grey one
    dr.ellipse([(CX + mid - rr) * SS, (CY - rr) * SS, (CX + mid + rr) * SS, (CY + rr) * SS], fill=ZONE)
    arc(dr, 0, value, ACC)
    n = str(round(value))
    dr.text((CX * SS, (CY - 30) * SS), n, font=NUM, fill=TEXT, anchor='ms')
    band = next(label for low, label in BANDS if round(value) >= low)
    dr.text((CX * SS, (CY + 12) * SS), band, font=BAND, fill=ACC if value >= 70 else TEXT_2, anchor='ms')
    dr.text((CX * SS, (CY + 62) * SS), 'Effort 92 · Sets 88 · PRs 67', font=CAP, fill=TEXT_2, anchor='ms')
    return img.resize((W, H), Image.LANCZOS)


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    out.mkdir(parents=True, exist_ok=True)
    fill = round(1.6 * FPS)
    ease = lambda t: 1 - (1 - t) ** 3
    values = [0.0] * round(0.4 * FPS) + [SCORE * ease(i / fill) for i in range(fill + 1)] + [SCORE] * round(2.2 * FPS)
    frames = [frame(v) for v in values]
    pal = frames[-1].quantize(colors=96, method=Image.Quantize.MEDIANCUT)
    gif = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    gif[0].save(out / 'redline.gif', save_all=True, append_images=gif[1:], duration=1000 // FPS, loop=0, optimize=True, disposal=1)
    print(f'{len(frames)} frames -> {out / "redline.gif"}')


if __name__ == '__main__':
    main()
