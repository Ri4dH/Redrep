import AVFoundation
import Capacitor
import Foundation
import UIKit
import Vision
import VisionKit

/**
 * Redrep's gym-card scanner (views/CheckIn.jsx through lib/scan.js), on Apple's own frameworks:
 * VisionKit's live scanner for the camera and Vision for a picked photo. Everything stays on the
 * phone; nothing is sent anywhere (openGym used Google's ML Kit, which reports usage to Google).
 *
 * Usage from JS:
 *   const CodeScanner = registerPlugin('CodeScanner');
 *   await CodeScanner.isSupported();          // { supported } — the live scanner (iOS 16, A12 or later)
 *   await CodeScanner.scan();                 // { barcodes: [{ rawValue, format }] } or { barcodes: [] }
 *                                             // when the user cancels; rejects 'permission-denied' or
 *                                             // 'unsupported'
 *   await CodeScanner.readImage({ data });    // data: the picture as bare base64; { barcodes: [...] }
 * `format` uses ML Kit's names (QR_CODE, CODE_128, EAN_13…), which lib/qr.js normalizeFmt folds.
 */
@objc(CodeScannerPlugin)
public class CodeScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CodeScannerPlugin"
    public let jsName = "CodeScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readImage", returnType: CAPPluginReturnPromise),
    ]

    /// The live scan on screen, kept alive until it answers.
    private var session: AnyObject?

    @objc func isSupported(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.resolve(["supported": false]); return }
        Task { @MainActor in call.resolve(["supported": DataScannerViewController.isSupported]) }
    }

    @objc func scan(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.reject("unsupported", "unsupported"); return }
        AVCaptureDevice.requestAccess(for: .video) { granted in
            Task { @MainActor in
                guard granted else { call.reject("permission-denied", "permission-denied"); return }
                guard DataScannerViewController.isSupported, DataScannerViewController.isAvailable else {
                    call.reject("unsupported", "unsupported")
                    return
                }
                self.present(call)
            }
        }
    }

    @available(iOS 16.0, *)
    @MainActor private func present(_ call: CAPPluginCall) {
        guard let host = bridge?.viewController, session == nil else { call.reject("busy", "failed"); return }
        let scanner = DataScannerViewController(
            recognizedDataTypes: [.barcode()],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isHighlightingEnabled: true
        )
        let nav = UINavigationController(rootViewController: scanner)
        nav.modalPresentationStyle = .fullScreen
        let live = ScanSession(call: call, nav: nav) { [weak self] in self?.session = nil }
        scanner.delegate = live
        scanner.navigationItem.leftBarButtonItem = UIBarButtonItem(
            systemItem: .cancel,
            primaryAction: UIAction { _ in live.finish(nil) }
        )
        session = live
        host.present(nav, animated: true) {
            do { try scanner.startScanning() } catch { live.fail() }
        }
    }

    @objc func readImage(_ call: CAPPluginCall) {
        guard let b64 = call.getString("data"), let data = Data(base64Encoded: b64, options: .ignoreUnknownCharacters) else {
            call.reject("no image", "failed")
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            let request = VNDetectBarcodesRequest()
            do {
                try VNImageRequestHandler(data: data, options: [:]).perform([request])
            } catch {
                call.reject("could not read the image", "failed")
                return
            }
            let found = (request.results ?? []).compactMap { b -> [String: Any]? in
                guard let v = b.payloadStringValue, !v.isEmpty else { return nil }
                return ["rawValue": v, "format": CodeScannerPlugin.format(b.symbology)]
            }
            call.resolve(["barcodes": found])
        }
    }

    /// Vision's symbology under ML Kit's name for it.
    static func format(_ s: VNBarcodeSymbology) -> String {
        switch s {
        case .qr, .microQR: return "QR_CODE"
        case .code128: return "CODE_128"
        case .code39, .code39Checksum, .code39FullASCII, .code39FullASCIIChecksum: return "CODE_39"
        case .code93, .code93i: return "CODE_93"
        case .ean13: return "EAN_13"
        case .ean8: return "EAN_8"
        case .upce: return "UPC_E"
        case .itf14, .i2of5, .i2of5Checksum: return "ITF"
        case .pdf417, .microPDF417: return "PDF_417"
        case .aztec: return "AZTEC"
        case .dataMatrix: return "DATA_MATRIX"
        case .codabar: return "CODABAR"
        default: return s.rawValue
        }
    }
}

/// One live scan: answers the call with the first code that has a value, or none on Cancel.
@available(iOS 16.0, *)
@MainActor
private final class ScanSession: NSObject, DataScannerViewControllerDelegate {
    private let call: CAPPluginCall
    private weak var nav: UINavigationController?
    private let done: () -> Void
    private var answered = false

    init(call: CAPPluginCall, nav: UINavigationController, done: @escaping () -> Void) {
        self.call = call
        self.nav = nav
        self.done = done
    }

    func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
        for item in addedItems {
            guard case .barcode(let code) = item, let value = code.payloadStringValue, !value.isEmpty else { continue }
            finish(["rawValue": value, "format": CodeScannerPlugin.format(code.observation.symbology)])
            return
        }
    }

    func dataScanner(_ dataScanner: DataScannerViewController, becameUnavailableWithError error: DataScannerViewController.ScanningUnavailable) {
        fail()
    }

    func finish(_ code: [String: Any]?) {
        guard !answered else { return }
        answered = true
        nav?.dismiss(animated: true)
        call.resolve(["barcodes": code.map { [$0] } ?? []])
        done()
    }

    func fail() {
        guard !answered else { return }
        answered = true
        nav?.dismiss(animated: true)
        call.reject("unsupported", "unsupported")
        done()
    }
}
