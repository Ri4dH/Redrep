"""Recolours openGym's lime artwork (splash, default app icon) to Redrep red, in place.

Each pixel is read as a blend of the image's background and openGym's lime (#a3e635); pixels on
that line move to the same blend of the background and Redrep red (#ff453a), so anti-aliased edges
and the soft glow keep their shape. Pixels off the line (anything else in the art) are left alone.

Usage: python scripts/redrep/recolor_lime.py FILE.png [...]   (needs Pillow and numpy)
"""
import sys

import numpy as np
from PIL import Image

LIME = np.array([163, 230, 53], float)
RED = np.array([255, 69, 58], float)
OFF_LINE = 34.0      # how far from the background-to-lime line a pixel may sit and still move


def recolor(path):
    im = Image.open(path)
    mode = im.mode
    rgba = np.array(im.convert('RGBA')).astype(float)
    rgb = rgba[..., :3]
    # the background: the most common colour of the image's border
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    keys, counts = np.unique(border.round().astype(int), axis=0, return_counts=True)
    bg = keys[counts.argmax()].astype(float)
    d = LIME - bg
    a = ((rgb - bg) @ d) / (d @ d)
    near = np.linalg.norm(rgb - (bg + a[..., None] * d), axis=-1) < OFF_LINE
    move = near & (a > 0.02)
    a = np.clip(a, 0, 1.08)
    out = rgb.copy()
    out[move] = np.clip(bg + a[move][:, None] * (RED - bg), 0, 255)
    rgba[..., :3] = out
    res = Image.fromarray(rgba.round().astype(np.uint8), 'RGBA')
    if mode == 'RGB':                  # an App Store icon must stay without an alpha channel
        res = res.convert('RGB')
    res.save(path)
    print(f'{path}: {int(move.sum())} pixels recoloured')


if __name__ == '__main__':
    for p in sys.argv[1:]:
        recolor(p)
