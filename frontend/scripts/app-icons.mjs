#!/usr/bin/env node
/* Redrep's app icons, every one drawn from the logo, resources/logo.png: a 1024 px grey mask of
 * the dumbbell (white where it is, black where it is not), placed on the icon the way
 * resources/redrep.icon (the Icon Composer file) places it. `--logo <file.icon>` makes that mask
 * again from an Icon Composer file. Each icon is its background colour with the mask painted in
 * its foreground colour (src/lib/app-icon-variants.js), so the colour variants (Settings → Look &
 * Home → App icon) are the same dumbbell. The PNGs are written with node:zlib: no sharp or resvg
 * to install, and the same pixels on every machine, which the test checks (the compressed bytes
 * can differ between an Apple silicon Mac and an Intel Linux runner, so the check compares
 * pictures, samePicture() below). A variant with `art` (Halloween) is a hand-made SVG instead,
 * drawn by the small renderer below (rect, circle, line, polyline, polygon, one radial gradient).
 * Written:
 *   public/app-icons/<id>.png                                 112 px preview for the settings row
 *   public/icon-180.png, public/icon-512.png                  the web app's icons (the original)
 *   ios/App/App/Assets.xcassets/AppIcon.appiconset/           the iPhone icon, 1024 px, opaque
 *   ios/App/App/Assets.xcassets/AppIcon-<Name>.appiconset/    the alternates, 1024 px, opaque
 *   ios/App/App/Assets.xcassets/Splash.imageset/              the launch screen: the logo, centred
 *   ios/App/Watch/Assets.xcassets/AppIcon.appiconset/         the Apple Watch icon (watchOS rounds it)
 *   android/app/src/main/res/mipmap-<dpi>/ic_launcher{,_<id>}{,_round,_foreground}.png
 *   android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_<id>{,_round}.xml
 *   android/app/src/main/res/values/app_icons.xml             the adaptive icons' background colours
 * Apple refuses an app icon with alpha, so every square icon is opaque.
 *
 * Usage: node scripts/app-icons.mjs                    write everything
 *        node scripts/app-icons.mjs --check            exit 1 when a committed file differs from a fresh draw
 *        node scripts/app-icons.mjs --logo <x.icon>    make resources/logo.png from an Icon Composer file */
import { deflateSync, inflateSync } from 'node:zlib'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_ICON_VARIANTS } from '../src/lib/app-icon-variants.js'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RES = 'android/app/src/main/res'

// Launcher icon in px per density (48 dp), and the adaptive layer (108 dp) beside it.
export const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
export const PREVIEW = 112
export const IOS_SIZE = 1024
export const LOGO = 'resources/logo.png'
// The launch screen: the logo's 1024 square drawn SPLASH_LOGO px wide in the middle of it.
export const SPLASH = 2732
export const SPLASH_LOGO = 512
const SPLASH_BG = '#000000'

/** The logo as coverage, 0 to 1 per pixel of a `size` px square: one source for every icon. */
export function logo(file = join(ROOT, LOGO)) {
  const p = readPng(readFileSync(file))
  if (p.width !== p.height) throw new Error(`${LOGO} must be square`)
  const at = new Float64Array(p.width * p.height)
  for (let i = 0; i < at.length; i++) at[i] = p.data[i * p.ch] / 255
  return { size: p.width, at }
}
let LOGO_CACHE = null
const theLogo = () => (LOGO_CACHE ||= logo())

/** The mask at (x, y) in its own pixels, blended between the four nearest (0 outside). */
function cover(m, x, y) {
  const fx = x - 0.5, fy = y - 0.5
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0
  const g = (i, j) => (i < 0 || j < 0 || i >= m.size || j >= m.size ? 0 : m.at[j * m.size + i])
  return (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty
}

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

/** The pixels of one icon `size` px square: the background, the logo on it, optionally cut to a
 *  circle (with alpha at the edge). Up to 8x8 samples per pixel when it is drawn small. */
function pixels(v, size, { round = false, mask = theLogo() } = {}) {
  const k = Math.min(8, Math.max(1, Math.ceil(mask.size / size)))
  const bg = rgb(v.bg), fg = rgb(v.fg)
  const ch = round ? 4 : 3
  const out = Buffer.alloc(size * size * ch)
  const scale = mask.size / size
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let inside = 0, on = 0
    for (let sy = 0; sy < k; sy++) {
      const py = y + (sy + 0.5) / k
      for (let sx = 0; sx < k; sx++) {
        const px = x + (sx + 0.5) / k
        if (round) {
          const dx = px - size / 2, dy = py - size / 2
          if (dx * dx + dy * dy > (size / 2) * (size / 2)) continue
        }
        inside++
        on += cover(mask, px * scale, py * scale)
      }
    }
    const o = (y * size + x) * ch
    const a = inside ? on / inside : 0
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(bg[c] + (fg[c] - bg[c]) * a)
    if (round) out[o + 3] = Math.round(255 * inside / (k * k))
  }
  return out
}

/** One icon `size` px square as a PNG (see pixels()); a variant with `art` is its own SVG. */
export function draw(v, size, { round = false, mask } = {}) {
  if (v.art) return drawArt(readFileSync(join(ROOT, v.art), 'utf8'), size, { round })
  return png(size, size, pixels(v, size, { round, mask }), round ? 4 : 3)
}

/** The launch screen, SPLASH px square: the original icon's logo, SPLASH_LOGO px, centred on black. */
export function splash({ mask } = {}) {
  const v = { bg: SPLASH_BG, fg: APP_ICON_VARIANTS[0].fg }
  const tile = pixels(v, SPLASH_LOGO, { mask })
  const out = Buffer.alloc(SPLASH * SPLASH * 3)
  const bg = rgb(SPLASH_BG)
  for (let i = 0; i < SPLASH * SPLASH; i++) { out[i * 3] = bg[0]; out[i * 3 + 1] = bg[1]; out[i * 3 + 2] = bg[2] }
  const at = (SPLASH - SPLASH_LOGO) / 2
  for (let y = 0; y < SPLASH_LOGO; y++) tile.copy(out, ((at + y) * SPLASH + at) * 3, y * SPLASH_LOGO * 3, (y + 1) * SPLASH_LOGO * 3)
  return png(SPLASH, SPLASH, out, 3)
}

/** A PNG's pixels: 8 bit, not interlaced, grey, grey and alpha, RGB or RGBA. */
export function readPng(buf) {
  let w = 0, h = 0, depth = 0, type = -1, interlace = 0
  const idat = []
  for (let o = 8; o + 8 <= buf.length;) {
    const len = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len)
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; interlace = d[12] }
    else if (t === 'IDAT') idat.push(d)
    o += 12 + len
  }
  const ch = { 0: 1, 4: 2, 2: 3, 6: 4 }[type]
  if (depth !== 8 || !ch || interlace) throw new Error('readPng: only 8-bit, non-interlaced grey or RGB(A) PNGs')
  const raw = inflateSync(Buffer.concat(idat)), stride = w * ch, data = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, o = y * stride
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? data[o + x - ch] : 0, b = y ? data[o - stride + x] : 0, c = x >= ch && y ? data[o - stride + x - ch] : 0
      let p = raw[src + x]
      if (f === 1) p += a
      else if (f === 2) p += b
      else if (f === 3) p += (a + b) >> 1
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p += pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      data[o + x] = p & 255
    }
  }
  return { width: w, height: h, ch, data }
}

/**
 * The logo mask from an Icon Composer file (`<name>.icon`: icon.json and Assets/): its first image
 * layer, a coloured dumbbell on a plain background, placed on the 1024 point canvas with the
 * layer's scale and offset (points are pixels here). The background is the colour in the image's
 * top-left corner; the dumbbell, the most common colour far from it. Returns the mask PNG and the
 * dumbbell's colour (the original icon's `fg`).
 */
export function logoFromIcon(dir) {
  const spec = JSON.parse(readFileSync(join(dir, 'icon.json'), 'utf8'))
  const layer = spec.groups.flatMap(g => g.layers).find(l => l['image-name'])
  const img = readPng(readFileSync(join(dir, 'Assets', layer['image-name'])))
  const px = i => [0, 1, 2].map(c => img.data[i * img.ch + (img.ch < 3 ? 0 : c)])
  const bg = px(0)
  const dist = c => Math.hypot(c[0] - bg[0], c[1] - bg[1], c[2] - bg[2])
  const counts = new Map()
  for (let i = 0; i < img.width * img.height; i++) {
    const c = px(i)
    if (dist(c) > 96) { const key = c.join(','); counts.set(key, (counts.get(key) || 0) + 1) }
  }
  const fg = [...counts].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number)
  const span = dist(fg)
  // Coverage per source pixel: how far it is from the background towards the dumbbell's colour.
  const src = new Float64Array(img.width * img.height)
  for (let i = 0; i < src.length; i++) {
    const c = px(i)
    const t = ((c[0] - bg[0]) * (fg[0] - bg[0]) + (c[1] - bg[1]) * (fg[1] - bg[1]) + (c[2] - bg[2]) * (fg[2] - bg[2])) / (span * span)
    src[i] = Math.max(0, Math.min(1, t))
  }
  const S = IOS_SIZE
  const scale = layer.position?.scale ?? 1
  const [tx, ty] = layer.position?.['translation-in-points'] ?? [0, 0]
  const sample = (u, v) => {
    const fx = u - 0.5, fy = v - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0
    const g = (i, j) => (i < 0 || j < 0 || i >= img.width || j >= img.height ? 0 : src[j * img.width + i])
    return (g(x0, y0) * (1 - ax) + g(x0 + 1, y0) * ax) * (1 - ay) + (g(x0, y0 + 1) * (1 - ax) + g(x0 + 1, y0 + 1) * ax) * ay
  }
  const out = Buffer.alloc(S * S)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    out[y * S + x] = Math.round(255 * sample((x + 0.5 - S / 2 - tx) / scale + img.width / 2, (y + 0.5 - S / 2 - ty) / scale + img.height / 2))
  }
  const hex = '#' + fg.map(c => c.toString(16).padStart(2, '0')).join('')
  return { png: png(S, S, out, 1), fg: hex }
}

// --- the hand-made icons: a renderer for the little SVG they are allowed to use ---
// Painted back to front like SVG: each sample takes the colour of the topmost shape covering it.
// Strokes are capsules (round caps and joins), polygons fill even-odd, and a fill may be the one
// userSpaceOnUse radialGradient with two stops. Coordinates in the 512 viewBox.

const num = (a, k, d = 0) => (a[k] === undefined ? d : Number(a[k]))
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]))
const pts = s => s.trim().split(/[\s,]+/).map(Number).reduce((o, n, i) => (i % 2 ? o[o.length - 1].push(n) : o.push([n]), o), [])

/** The SVG as a list of shapes, each { hit(x, y), color(x, y), box }: what drawArt paints. */
export function scene(svg) {
  const grads = {}
  for (const m of svg.matchAll(/<radialGradient\b([^>]*)>([\s\S]*?)<\/radialGradient>/g)) {
    const a = attrs(m[1])
    const stops = [...m[2].matchAll(/<stop\b([^>]*)\/>/g)].map(s => attrs(s[1]))
    grads[a.id] = { cx: num(a, 'cx'), cy: num(a, 'cy'), r: num(a, 'r'), c0: rgb(stops[0]['stop-color']), c1: rgb(stops[stops.length - 1]['stop-color']) }
  }
  const paint = f => {
    const g = /^url\(#(.+)\)$/.exec(f)
    if (!g) { const c = rgb(f); return () => c }
    const { cx, cy, r, c0, c1 } = grads[g[1]]
    return (x, y) => {
      const t = Math.min(1, Math.hypot(x - cx, y - cy) / r)
      return [0, 1, 2].map(i => c0[i] + (c1[i] - c0[i]) * t)
    }
  }
  const body = svg.replace(/<defs>[\s\S]*?<\/defs>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  const stack = [{}]
  const shapes = []
  for (const m of body.matchAll(/<(\/?)(\w+)\b([^>]*?)(\/?)>/g)) {
    const [, close, name, raw, self] = m
    if (name === 'svg') continue
    if (name === 'g') { close ? stack.pop() : stack.push({ ...stack[stack.length - 1], ...attrs(raw) }); continue }
    if (close) continue
    const a = { ...stack[stack.length - 1], ...attrs(raw) }
    if (!self) throw new Error(`app icon art: <${name}> must close itself`)
    if (name === 'rect') {
      const x = num(a, 'x'), y = num(a, 'y'), w = num(a, 'width'), h = num(a, 'height')
      shapes.push({ box: [x, y, x + w, y + h], hit: (px, py) => px >= x && px < x + w && py >= y && py < y + h, color: paint(a.fill) })
    } else if (name === 'circle') {
      const cx = num(a, 'cx'), cy = num(a, 'cy'), r = num(a, 'r')
      shapes.push({ box: [cx - r, cy - r, cx + r, cy + r], hit: (px, py) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r, color: paint(a.fill) })
    } else if (name === 'line' || name === 'polyline') {
      const p = name === 'line' ? [[num(a, 'x1'), num(a, 'y1')], [num(a, 'x2'), num(a, 'y2')]] : pts(a.points)
      const hw = num(a, 'stroke-width', 1) / 2
      const segs = p.slice(1).map((q, i) => [p[i], q])
      const xs = p.map(q => q[0]), ys = p.map(q => q[1])
      shapes.push({
        box: [Math.min(...xs) - hw, Math.min(...ys) - hw, Math.max(...xs) + hw, Math.max(...ys) + hw],
        hit: (px, py) => segs.some(([[x1, y1], [x2, y2]]) => {
          const dx = x2 - x1, dy = y2 - y1
          const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)))
          return (px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2 <= hw * hw
        }),
        color: paint(a.stroke),
      })
    } else if (name === 'polygon') {
      const p = pts(a.points)
      const xs = p.map(q => q[0]), ys = p.map(q => q[1])
      shapes.push({
        box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
        hit: (px, py) => {
          let inside = false
          for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
            const [xi, yi] = p[i], [xj, yj] = p[j]
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside
          }
          return inside
        },
        color: paint(a.fill),
      })
    } else throw new Error(`app icon art: no <${name}> in the renderer`)
  }
  return shapes.reverse()   // topmost first
}

/** A hand-made icon `size` px square, 4x4 samples per pixel: opaque (iOS, Android square and
 *  adaptive layer), or cut to a circle with alpha at the edge (Android round). */
export function drawArt(svg, size, { round = false } = {}) {
  const shapes = scene(svg)
  const k = 4, scale = 512 / size
  const ch = round ? 4 : 3
  const out = Buffer.alloc(size * size * ch)
  for (let y = 0; y < size; y++) {
    // Only the shapes this pixel row can touch.
    const y0 = y * scale, y1 = (y + 1) * scale
    const row = shapes.filter(s => s.box[1] <= y1 && s.box[3] >= y0)
    for (let x = 0; x < size; x++) {
      const x0 = x * scale, x1 = (x + 1) * scale
      const here = row.filter(s => s.box[0] <= x1 && s.box[2] >= x0)
      const sum = [0, 0, 0]
      let inside = 0
      for (let sy = 0; sy < k; sy++) for (let sx = 0; sx < k; sx++) {
        if (round) {
          const dx = x + (sx + 0.5) / k - size / 2, dy = y + (sy + 0.5) / k - size / 2
          if (dx * dx + dy * dy > (size / 2) * (size / 2)) continue
        }
        inside++
        const px = (x + (sx + 0.5) / k) * scale, py = (y + (sy + 0.5) / k) * scale
        const s = here.find(sh => sh.hit(px, py))
        const c = s ? s.color(px, py) : [0, 0, 0]
        sum[0] += c[0]; sum[1] += c[1]; sum[2] += c[2]
      }
      const o = (y * size + x) * ch
      for (let c = 0; c < 3; c++) out[o + c] = inside ? Math.round(sum[c] / inside) : 0
      if (round) out[o + 3] = Math.round(255 * inside / (k * k))
    }
  }
  return png(size, size, out, ch)
}

// --- PNG, the bare minimum: IHDR, one IDAT, IEND; filter 0 on every row ---
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(w, h, pixels, ch) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = { 1: 0, 3: 2, 4: 6 }[ch]   // 8 bit, grey, RGB or RGBA
  const raw = Buffer.alloc(h * (w * ch + 1))
  for (let y = 0; y < h; y++) pixels.copy(raw, y * (w * ch + 1) + 1, y * w * ch, (y + 1) * w * ch)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

/** Whether two files hold the same picture: the same bytes, or PNGs with the same header and the
 *  same pixels once inflated. */
export function samePicture(a, b) {
  if (a.equals(b)) return true
  const parts = buf => {
    if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return null
    let ihdr = null
    const idat = []
    for (let o = 8; o + 8 <= buf.length;) {
      const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8)
      const data = buf.subarray(o + 8, o + 8 + len)
      if (type === 'IHDR') ihdr = data
      else if (type === 'IDAT') idat.push(data)
      o += 12 + len
    }
    return ihdr && { ihdr, raw: inflateSync(Buffer.concat(idat)) }
  }
  try {
    const x = parts(a), y = parts(b)
    return !!x && !!y && x.ihdr.equals(y.ihdr) && x.raw.equals(y.raw)
  } catch { return false }
}

/** Width, height and whether the PNG has an alpha channel, read from its header. */
export function pngInfo(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), alpha: buf[25] === 6 || buf[25] === 4 }
}

// The same layers as the default icon's (mipmap-anydpi-v26/ic_launcher.xml): the whole square icon
// as the foreground, inset to the 72 dp the launcher's mask shows, so every variant sits exactly
// where the original does. The colour behind it only shows where a launcher moves the layers.
const adaptive = id => `<?xml version="1.0" encoding="utf-8"?>
<!-- Written by scripts/app-icons.mjs. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_${id}_background" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_${id}_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`

const iosContents = `{
  "images" : [
    {
      "filename" : "icon-1024.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
`

/** Every file this script owns, as [path relative to frontend/, () => contents]: drawn on demand. */
export function files(mask = theLogo()) {
  const out = []
  const colors = []
  let splashPng = null
  const splashOnce = () => (splashPng ||= splash({ mask }))
  for (const v of APP_ICON_VARIANTS) {
    out.push([`public/app-icons/${v.id}.png`, () => draw(v, PREVIEW, { mask })])
    if (v.id === 'default') {
      out.push(['public/icon-180.png', () => draw(v, 180, { mask })])
      out.push(['public/icon-512.png', () => draw(v, 512, { mask })])
      out.push(['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', () => draw(v, IOS_SIZE, { mask })])
      out.push(['ios/App/Watch/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png', () => draw(v, IOS_SIZE, { mask })])
      for (const n of ['1x', '2x', '3x']) for (const dark of ['', '-dark']) {
        out.push([`ios/App/App/Assets.xcassets/Splash.imageset/Default@${n}~universal~anyany${dark}.png`, splashOnce])
      }
      for (const [dpi, f] of Object.entries(DENSITIES)) {
        out.push([`${RES}/mipmap-${dpi}/ic_launcher.png`, () => draw(v, Math.round(48 * f), { mask })])
        out.push([`${RES}/mipmap-${dpi}/ic_launcher_round.png`, () => draw(v, Math.round(48 * f), { mask, round: true })])
        out.push([`${RES}/mipmap-${dpi}/ic_launcher_foreground.png`, () => draw(v, Math.round(108 * f), { mask })])
      }
      continue
    }
    const set = `ios/App/App/Assets.xcassets/${v.ios}.appiconset`
    out.push([`${set}/Contents.json`, () => iosContents])
    out.push([`${set}/icon-1024.png`, () => draw(v, IOS_SIZE, { mask })])
    for (const [dpi, f] of Object.entries(DENSITIES)) {
      out.push([`${RES}/mipmap-${dpi}/ic_launcher_${v.id}.png`, () => draw(v, Math.round(48 * f), { mask })])
      out.push([`${RES}/mipmap-${dpi}/ic_launcher_${v.id}_round.png`, () => draw(v, Math.round(48 * f), { mask, round: true })])
      out.push([`${RES}/mipmap-${dpi}/ic_launcher_${v.id}_foreground.png`, () => draw(v, Math.round(108 * f), { mask })])
    }
    out.push([`${RES}/mipmap-anydpi-v26/ic_launcher_${v.id}.xml`, () => adaptive(v.id)])
    out.push([`${RES}/mipmap-anydpi-v26/ic_launcher_${v.id}_round.xml`, () => adaptive(v.id)])
    colors.push(`    <color name="ic_launcher_${v.id}_background">${v.bg}</color>`)
  }
  out.push([`${RES}/values/app_icons.xml`, () => `<?xml version="1.0" encoding="utf-8"?>
<!-- Written by scripts/app-icons.mjs: behind each alternate launcher icon. -->
<resources>
${colors.join('\n')}
</resources>
`])
  return out
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const at = process.argv.indexOf('--logo')
  if (at > 0) {
    const { png: mask, fg } = logoFromIcon(process.argv[at + 1])
    writeFileSync(join(ROOT, LOGO), mask)
    console.log(`${LOGO} written; the dumbbell is ${fg} (the original icon's fg in src/lib/app-icon-variants.js)`)
    process.exit(0)
  }
  const check = process.argv.includes('--check')
  const bad = []
  for (const [rel, make] of files()) {
    const p = join(ROOT, rel)
    const body = make()
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body)
    if (check) {
      if (!existsSync(p) || !samePicture(readFileSync(p), buf)) bad.push(rel)
      continue
    }
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, buf)
  }
  if (bad.length) { console.error('app icons out of date (run node scripts/app-icons.mjs):\n  ' + bad.join('\n  ')); process.exit(1) }
  console.log(check ? 'app icons up to date' : 'app icons written')
}
