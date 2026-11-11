import Foundation
import SwiftUI

/*
 * What the watch app shows, for its complications and the Smart Stack widget (ios/App/Watch/
 * Widgets): written by the app whenever it changes, read by the widget through the App Group.
 * Compiled into both. Plain text and numbers, no media.
 *
 *   rest   the rest running, until restEndsAt
 *   set    the set up next: exercise and weight × reps
 *   today  no workout running, today's planned one ready to start
 *   idle   nothing to show but the app
 */
struct WidgetState: Codable, Equatable {
    var mode: String
    var title: String
    var detail: String
    var restEndsAt: Date?
    /// Work sets done and in all, today's session (the complications' ring).
    var done: Int = 0
    var total: Int = 0
    /// "2/4": the set up next, of its exercise's work sets.
    var setLabel: String = ""
    var updatedAt: Date = .distantPast
    /// The app's language (the phone's), so the complications speak it too.
    var lang: String?

    static let idle = WidgetState(mode: "idle", title: "Redrep", detail: "", restEndsAt: nil)
    static let groupId = "group.com.riadheydar.redrep"
    private static let key = "widgetState"

    static func == (a: WidgetState, b: WidgetState) -> Bool {
        a.mode == b.mode && a.title == b.title && a.detail == b.detail && a.restEndsAt == b.restEndsAt
            && a.done == b.done && a.total == b.total && a.setLabel == b.setLabel && a.lang == b.lang
    }

    /// The state as written, unless it is about a session the watch app has not touched for 45
    /// minutes (it was closed, or the workout runs on the phone alone): then nothing to show, and
    /// the iPhone's Live Activity has the Smart Stack to itself instead of two cards saying the same.
    static func read() -> WidgetState {
        guard let d = UserDefaults(suiteName: groupId)?.data(forKey: key),
              let s = try? JSONDecoder().decode(WidgetState.self, from: d) else { return .idle }
        if (s.mode == "set" || s.mode == "rest") && Date().timeIntervalSince(s.updatedAt) > 45 * 60 { return .idle }
        return s
    }

    func write() {
        var s = self
        s.updatedAt = Date()
        if let d = try? JSONEncoder().encode(s) { UserDefaults(suiteName: WidgetState.groupId)?.set(d, forKey: WidgetState.key) }
    }
}

extension WidgetState {
    /// The locale for the widget's words: the app's language where this bundle has it, else English
    /// (a phone in English never gets a German complication from a watch set to German).
    var locale: Locale {
        guard let l = lang else { return .current }
        if l == "en" { return Locale(identifier: "en") }
        let name = ["pt": "pt-PT", "zh": "zh-Hans", "zh-TW": "zh-Hant"][l] ?? l
        return Locale(identifier: Bundle.main.path(forResource: name, ofType: "lproj") != nil ? name : "en")
    }
}

/// Redrep's mark, the logo of the app icon (frontend/resources/logo.png), drawn as one shape so
/// it takes the watch face's tint and stays sharp at every complication size.
struct OpenGymLogo: Shape {
    // logo outline: written by frontend/scripts/app-icons.mjs, do not edit
    static let size = CGSize(width: 844, height: 757)
    static let loops: [[CGFloat]] = [
        [250, 0, 279, 2, 330, 28, 379, 59, 392, 72, 394, 81, 353, 74, 319, 74, 279, 81, 243, 94, 211, 112, 183, 134, 132, 193, 110, 233, 95, 277, 86, 320, 84, 363, 88, 400, 93, 416, 104, 435, 126, 455, 155, 470, 167, 473, 167, 477, 136, 475, 110, 464, 77, 439, 31, 397, 13, 375, 4, 349, 0, 325, 0, 274, 6, 234, 20, 190, 39, 151, 70, 105, 99, 72, 136, 41, 162, 26, 213, 6],
        [652, 219, 680, 219, 698, 226, 792, 279, 823, 306, 834, 321, 844, 344, 839, 345, 822, 332, 786, 314, 763, 310, 729, 310, 710, 314, 671, 332, 631, 358, 584, 402, 546, 451, 497, 536, 484, 568, 475, 602, 468, 662, 473, 690, 493, 715, 520, 736, 544, 745, 562, 745, 565, 751, 526, 757, 475, 752, 458, 743, 401, 697, 361, 659, 352, 643, 354, 550, 372, 476, 385, 442, 418, 381, 451, 337, 473, 314, 495, 294, 544, 259, 619, 226],
        [257, 224, 266, 224, 297, 239, 352, 270, 399, 292, 448, 321, 446, 327, 431, 341, 409, 371, 389, 409, 384, 409, 366, 398, 216, 291, 216, 270, 225, 250, 238, 235],
        [728, 391, 757, 402, 798, 428, 825, 451, 826, 457, 816, 459, 802, 455, 783, 455, 757, 459, 737, 466, 708, 484, 682, 507, 664, 528, 645, 556, 629, 592, 625, 624, 629, 653, 643, 670, 660, 677, 685, 675, 707, 668, 728, 657, 731, 657, 731, 661, 713, 679, 682, 697, 653, 703, 622, 701, 583, 671, 542, 631, 543, 596, 552, 555, 581, 495, 610, 457, 627, 440, 647, 422, 677, 404, 703, 395],
    ]
    // end of logo outline

    func path(in rect: CGRect) -> Path {
        // Each loop is x, y pairs in the logo's own box (Self.size); filled even-odd.
        let w = Self.size.width, h = Self.size.height
        let scale = min(rect.width / w, rect.height / h)
        let ox = rect.midX - w * scale / 2, oy = rect.midY - h * scale / 2
        var p = Path()
        for loop in Self.loops where loop.count >= 6 {
            p.move(to: CGPoint(x: ox + loop[0] * scale, y: oy + loop[1] * scale))
            for i in stride(from: 2, to: loop.count - 1, by: 2) {
                p.addLine(to: CGPoint(x: ox + loop[i] * scale, y: oy + loop[i + 1] * scale))
            }
            p.closeSubpath()
        }
        return p
    }
}

