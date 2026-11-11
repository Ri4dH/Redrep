// Capturing a gym check-in code (see views/CheckIn.jsx). Three ways in:
//   1. type it            — no plugin, handled entirely in the view
//   2. import a photo      — importCodeFromImage(file): decode a picture the user already has
//   3. scan with camera    — scanCode(): Apple's live scanner (VisionKit) in the iPhone app;
//                            elsewhere the view opens components/CameraScan.jsx instead
//
// Redrep reads codes on the phone with Apple's own frameworks, through the app's CodeScanner
// plugin (ios/App/App/CodeScannerPlugin.swift: VisionKit live, Vision for a photo). openGym used
// Google's ML Kit, which reports usage to Google; Redrep collects nothing. In a browser, on Android,
// and on an iPhone without the live scanner (iOS 15, or older than an A12 chip), scanning goes the
// browser's way: lib/scan-web.js (BarcodeDetector where the browser has one, jsQR and
// lib/barcode.js otherwise) and the CameraScan sheet. webScanner() says which.
//
// What comes back is a normalized { value, fmt } (or null when the user cancels / nothing was
// found). `value` is the code's machine-readable content; `fmt` is a lower-cased symbology token
// matching lib/qr.js's normalizeFmt. The caller checks canRenderFmt(fmt) before saving — we can
// read many barcode kinds but only redraw QR and a few 1D ones, so any other code is reported and
// refused there, not silently stored.
import { MOBILE } from './mobile.js'
import { normalizeFmt } from './qr.js'

// The iPhone app's CodeScanner plugin, or null where there is none (web, Android).
let pluginP = null
const scanner = () => (pluginP ||= (async () => {
  if (!MOBILE) return null
  const { registerPlugin, Capacitor } = await import('@capacitor/core')
  return Capacitor.getPlatform() === 'ios' ? registerPlugin('CodeScanner') : null
})().catch(() => null))

/** True where the live scan goes the browser's way (CameraScan + lib/scan-web.js). */
export async function webScanner() {
  const p = await scanner()
  if (!p) return true
  try { return !(await p.isSupported())?.supported } catch { return true }
}

// A found barcode → our stored shape. We keep rawValue (machine-readable, what a turnstile
// actually reads) and fold the format.
function toCode(barcode) {
  if (!barcode) return null
  const value = barcode.rawValue || barcode.displayValue || ''
  if (!value) return null
  return { value, fmt: normalizeFmt(barcode.format) }
}

// Live camera scan in Apple's full-screen scanner. Returns the first code found, or null if the
// user backed out. Throws 'permission-denied' or 'unsupported' so the caller can explain why.
export async function scanCode() {
  if (!MOBILE) throw new Error('Scanning is only available in the app')
  const p = await scanner()
  if (!p) throw new Error('unsupported')
  let r
  try {
    r = await p.scan()
  } catch (e) {
    throw new Error(e?.code === 'permission-denied' || e?.message === 'permission-denied' ? 'permission-denied' : 'unsupported')
  }
  return r?.barcodes?.length ? toCode(r.barcodes[0]) : null
}

// Decode a barcode out of an image the user picked: Vision on the iPhone, the browser decoder
// elsewhere (and if Vision cannot open the picture). Returns the first barcode, or null.
export async function importCodeFromImage(file) {
  if (!file) return null
  const p = await scanner()
  if (p) {
    try {
      const { barcodes } = await p.readImage({ data: await fileToBase64(file) })
      return barcodes && barcodes.length ? toCode(barcodes[0]) : null
    } catch { /* the browser decoder below */ }
  }
  return (await import('./scan-web.js')).importCodeFromImageWeb(file)
}

// A File/Blob → bare base64 (no data: prefix), which Filesystem.writeFile expects.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(r.error || new Error('read failed'))
    r.onload = () => {
      const s = String(r.result || '')
      const comma = s.indexOf(',')
      resolve(comma === -1 ? s : s.slice(comma + 1))
    }
    r.readAsDataURL(file)
  })
}
