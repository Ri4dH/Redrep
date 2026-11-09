"""Redrep sample: a code-drawn barbell back squat, rendered to GIF.

The figure is a 2D side-view rig. Each frame sets shin and thigh angles from one depth value,
then solves the torso lean so the bar stays over mid-foot (how a real squat balances).
Nothing here is traced from or derived from any existing exercise media.

Usage: python scripts/redrep/squat_gif.py assets/redrep   (needs Pillow)
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SS = 3                      # supersampling factor for anti-aliasing
SIZE = 600                  # output is SIZE x SIZE
FIG_H = 400                 # figure height in px at 1x
GROUND_Y = 500
ANKLE_X = 318
FPS = 25

BG = (14, 14, 16)
FLOOR = (58, 58, 62)
SHADOW = (24, 24, 27)
BODY = (206, 206, 212)
BODY_FAR = (104, 104, 110)
RED = (255, 31, 47)
RED_FAR = (140, 38, 33)
PLATE = (44, 44, 48)
PLATE_RIM = (84, 84, 90)
STEEL = (170, 170, 176)
TEXT = (242, 242, 247)
TEXT_2 = (142, 142, 147)

# Proportions as a fraction of body height.
ANKLE_H, SHIN, THIGH, TORSO = 0.045, 0.22, 0.245, 0.29
UPPER_ARM, FOREARM, ARM_FORESHORTEN = 0.165, 0.15, 0.85
HEAD_R, NECK = 0.062, 0.04
BAR_BACK, BAR_UP = 0.035, 0.01      # bar sits on the traps, behind and just above the shoulder
MIDFOOT_X = 0.02                    # balance point, forward of the ankle
PLATE_R = 0.125                     # a 45 cm plate on a 180 cm lifter


def vec(deg_from_vertical):
    a = math.radians(deg_from_vertical)
    return math.sin(a), math.cos(a)


def add(p, d, k=1.0):
    return p[0] + d[0] * k, p[1] + d[1] * k


def pose(depth):
    """Joint positions (figure units, y up, ankle at origin) for a depth in [0, 1]."""
    shin = 3 + 31 * depth          # degrees forward of vertical
    thigh = 102 * depth            # degrees from vertical, hips travel back
    ankle = (0.0, 0.0)
    sx, sy = vec(shin)
    knee = (sx * SHIN, sy * SHIN)
    tx, ty = vec(thigh)
    hip = (knee[0] - tx * THIGH, knee[1] + ty * THIGH)

    def bar_for(lean):
        u = vec(lean)
        n = (-u[1], u[0])          # posterior normal (figure faces +x)
        shoulder = add(hip, u, TORSO)
        bar = add(add(shoulder, n, BAR_BACK), u, BAR_UP)
        return u, n, shoulder, bar

    lo, hi = -10.0, 85.0           # bar x grows with lean in this range: bisect
    for _ in range(40):
        mid = (lo + hi) / 2
        if bar_for(mid)[3][0] < MIDFOOT_X:
            lo = mid
        else:
            hi = mid
    lean = (lo + hi) / 2
    u, n, shoulder, bar = bar_for(lean)

    head = add(shoulder, vec(lean * 0.55), NECK + HEAD_R)

    # Two-bone IK: shoulder -> hand on the bar, elbow pointing down and back.
    a, b = UPPER_ARM * ARM_FORESHORTEN, FOREARM * ARM_FORESHORTEN
    hand = bar
    dx, dy = hand[0] - shoulder[0], hand[1] - shoulder[1]
    d = min(max(math.hypot(dx, dy), abs(a - b) + 1e-4), a + b - 1e-4)
    base = math.atan2(dy, dx)
    off = math.acos((a * a + d * d - b * b) / (2 * a * d))
    elbows = [(shoulder[0] + a * math.cos(base + s * off), shoulder[1] + a * math.sin(base + s * off))
              for s in (1, -1)]
    elbow = min(elbows, key=lambda e: e[1])

    return dict(ankle=ankle, knee=knee, hip=hip, shoulder=shoulder, bar=bar, head=head,
                elbow=elbow, hand=hand, lean=lean, n=n, u=u)


def to_px(p, dx=0.0):
    x = ANKLE_X + (p[0] + dx) * FIG_H
    y = GROUND_Y - (ANKLE_H + p[1]) * FIG_H
    return x * SS, y * SS


def circle(dr, c, r, fill):
    r = r * FIG_H * SS
    dr.ellipse((c[0] - r, c[1] - r, c[0] + r, c[1] + r), fill=fill)


def limb(dr, p1, r1, p2, r2, fill):
    """Tapered capsule between two pixel points; radii in figure units."""
    vx, vy = p2[0] - p1[0], p2[1] - p1[1]
    ln = math.hypot(vx, vy) or 1.0
    nx, ny = -vy / ln, vx / ln
    R1, R2 = r1 * FIG_H * SS, r2 * FIG_H * SS
    dr.polygon([(p1[0] + nx * R1, p1[1] + ny * R1), (p2[0] + nx * R2, p2[1] + ny * R2),
                (p2[0] - nx * R2, p2[1] - ny * R2), (p1[0] - nx * R1, p1[1] - ny * R1)], fill=fill)
    circle(dr, p1, r1, fill)
    circle(dr, p2, r2, fill)


def draw_leg(dr, P, dx, body, muscle):
    A, K, Hp = (to_px(P[k], dx) for k in ("ankle", "knee", "hip"))
    heel, toe = to_px((-0.018, -0.022), dx), to_px((0.10, -0.032), dx)
    limb(dr, heel, 0.022, toe, 0.012, body)
    limb(dr, A, 0.022, K, 0.034, body)
    limb(dr, K, 0.036, Hp, 0.054, muscle)          # quads


def draw_arm(dr, P, dx, body):
    S, E, Hd = (to_px(P[k], dx) for k in ("shoulder", "elbow", "hand"))
    limb(dr, S, 0.027, E, 0.021, body)
    limb(dr, E, 0.021, Hd, 0.017, body)
    circle(dr, Hd, 0.02, body)


def font(size, bold=False):
    for path in ("/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        try:
            f = ImageFont.truetype(path, size * SS)
            if bold:
                try:
                    f.set_variation_by_name("Bold")
                except Exception:
                    pass
            return f
        except OSError:
            continue
    return ImageFont.load_default()


TITLE, SUB, PHASE = font(26, bold=True), font(17), font(17, bold=True)


def frame(depth, phase):
    img = Image.new("RGB", (SIZE * SS, SIZE * SS), BG)
    dr = ImageDraw.Draw(img)
    P = pose(depth)

    # floor and contact shadow
    gy = GROUND_Y * SS
    dr.rounded_rectangle((70 * SS, gy, 530 * SS, gy + 3 * SS), radius=2 * SS, fill=FLOOR)
    cx = to_px((0.04, 0))[0]
    dr.ellipse((cx - 70 * SS, gy - 6 * SS, cx + 70 * SS, gy + 2 * SS), fill=SHADOW)

    # plate behind the lifter so the body stays readable
    B = to_px(P["bar"])
    circle(dr, B, PLATE_R, PLATE_RIM)
    circle(dr, B, PLATE_R - 0.012, PLATE)
    circle(dr, B, 0.034, PLATE_RIM)

    FAR = -0.016
    draw_arm(dr, P, FAR, BODY_FAR)
    draw_leg(dr, P, FAR, BODY_FAR, RED_FAR)

    Hp, S = to_px(P["hip"]), to_px(P["shoulder"])
    limb(dr, Hp, 0.058, S, 0.064, BODY)                                   # torso
    chest = to_px(add(add(P["shoulder"], P["u"], -0.1), P["n"], -0.01))
    circle(dr, chest, 0.062, BODY)
    glute = to_px(add(add(P["hip"], P["n"], 0.02), P["u"], 0.005))
    circle(dr, glute, 0.056, RED)                                         # glutes
    limb(dr, S, 0.03, to_px(P["head"]), 0.028, BODY)                      # neck
    circle(dr, to_px(P["head"]), HEAD_R, BODY)

    draw_leg(dr, P, 0.0, BODY, RED)
    draw_arm(dr, P, 0.0, BODY)
    circle(dr, B, 0.016, STEEL)                                           # bar end, toward viewer

    # captions
    dr.text((36 * SS, 32 * SS), "Barbell back squat", font=TITLE, fill=TEXT)
    x = 36 * SS
    for i, name in enumerate(("Quads", "Glutes")):
        dr.ellipse((x, 75 * SS, x + 10 * SS, 85 * SS), fill=RED)
        x += 16 * SS
        dr.text((x, 70 * SS), name, font=SUB, fill=TEXT_2)
        x += dr.textlength(name, font=SUB) + 18 * SS
    w = dr.textlength(phase, font=PHASE)
    dr.text((SIZE * SS - 36 * SS - w, (GROUND_Y + 34) * SS), phase, font=PHASE, fill=RED if phase != "Brace" else TEXT_2)

    return img.resize((SIZE, SIZE), Image.LANCZOS)


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * t)


def timeline():
    """(depth, phase) per frame: hold, 1.4 s down, pause, 0.9 s up, hold."""
    segs = [(0.4, lambda t: 0.0, "Brace"),
            (1.4, lambda t: ease(t), "Lower"),
            (0.2, lambda t: 1.0, "Lower"),
            (0.9, lambda t: 1 - ease(t), "Drive up"),
            (0.3, lambda t: 0.0, "Brace")]
    out = []
    for dur, f, phase in segs:
        n = round(dur * FPS)
        out += [(f(i / n), phase) for i in range(n)]
    return out


def main():
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    out_dir.mkdir(parents=True, exist_ok=True)
    frames = [frame(d, p) for d, p in timeline()]

    # one shared palette so the loop never flickers
    sample = Image.new("RGB", (SIZE, SIZE * 3))
    for i, k in enumerate((0, len(frames) // 3, len(frames) // 2)):
        sample.paste(frames[k], (0, SIZE * i))
    pal = sample.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    gif = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    gif[0].save(out_dir / "squat.gif", save_all=True, append_images=gif[1:],
                duration=1000 // FPS, loop=0, optimize=True, disposal=1)

    sheet = Image.new("RGB", (SIZE * 2, SIZE * 2), BG)
    for i, d in enumerate((0.0, 0.35, 0.7, 1.0)):
        sheet.paste(frame(d, "Lower"), ((i % 2) * SIZE, (i // 2) * SIZE))
    sheet.save(out_dir / "squat-keyframes.png")
    print(f"{len(frames)} frames -> {out_dir / 'squat.gif'}")


if __name__ == "__main__":
    main()
