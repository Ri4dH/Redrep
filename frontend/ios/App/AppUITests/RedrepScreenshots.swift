import XCTest

/**
 * The App Store screenshots of the iPhone app (scripts/redrep/app-store-screenshots.sh). Runs only
 * when that script passes a folder to write them to (REDREP_SHOTS_DIR), against a phone build made
 * with VITE_SCREENSHOTS=1, which starts from the demo's example history (store/useStore.js boot).
 * Every other run of the UI tests skips it.
 */
final class RedrepScreenshots: XCTestCase {
    let app = XCUIApplication()
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    var dir: URL!

    override func setUpWithError() throws {
        continueAfterFailure = true
        guard let path = ProcessInfo.processInfo.environment["REDREP_SHOTS_DIR"], !path.isEmpty else {
            throw XCTSkip("App Store screenshots only (scripts/redrep/app-store-screenshots.sh)")
        }
        dir = URL(fileURLWithPath: path)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }

    /** The screen as a PNG in the folder, and the page's buttons beside it (to find the next tap). */
    private func shot(_ name: String) {
        sleep(2)
        let png = XCUIScreen.main.screenshot().pngRepresentation
        try? png.write(to: dir.appendingPathComponent("\(name).png"))
        let labels = app.buttons.allElementsBoundByIndex.prefix(80).map { $0.label }.filter { !$0.isEmpty }
        try? labels.joined(separator: "\n").write(to: dir.appendingPathComponent("\(name).buttons.txt"), atomically: true, encoding: .utf8)
    }

    @discardableResult
    private func tap(_ e: XCUIElement, _ what: String, timeout: TimeInterval = 15) -> Bool {
        guard e.waitForExistence(timeout: timeout) else { XCTFail("\(what) did not show up"); return false }
        e.tap()
        return true
    }

    private func button(startingWith prefix: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", prefix)).firstMatch
    }

    private func any(startingWith prefix: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", prefix)).firstMatch
    }

    private func dismissAlerts() {
        for label in ["Allow", "Don’t Allow", "Don't Allow"] {
            let b = springboard.alerts.buttons[label]
            if b.exists { b.tap(); return }
        }
    }

    private func tab(_ name: String) {
        dismissAlerts()
        let t = app.buttons.matching(NSPredicate(format: "label == %@", name)).element(boundBy: 0)
        tap(t, "the \(name) tab")
    }

    func testAppStoreScreenshots() {
        app.launch()
        let home = app.buttons.matching(NSPredicate(format: "label == %@", "Home")).firstMatch
        XCTAssertTrue(home.waitForExistence(timeout: 90), "home did not show up")
        if app.staticTexts["Want a 1-minute tour?"].waitForExistence(timeout: 8) { tap(app.buttons["Skip"], "Skip (tour)") }
        dismissAlerts()
        shot("1-home")

        tab("Exercises")
        let search = app.searchFields.firstMatch.exists ? app.searchFields.firstMatch : app.textFields.firstMatch
        if tap(search, "the exercise search") {
            search.typeText("barbell full squat")
            sleep(2)
            let row = app.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] %@", "barbell full squat")).firstMatch
            if row.waitForExistence(timeout: 10) { row.tap() } else { XCTFail("no squat row") }
            shot("3-exercise")
            let close = app.buttons.matching(NSPredicate(format: "label IN %@", ["Close", "Done"])).firstMatch
            if close.exists { close.tap() } else { app.swipeDown() }
        }

        tab("Stats")
        shot("4-stats")

        tab("Plan")
        shot("5-plan")

        tab("Start")
        sleep(2)
        let full = app.staticTexts["Full Body A"]
        let other = app.buttons["Choose a different workout"]
        if other.waitForExistence(timeout: 5) { other.tap() }
        if app.buttons["Start Full Body A"].waitForExistence(timeout: 5) { app.buttons["Start Full Body A"].tap() }
        else if full.waitForExistence(timeout: 5) { full.tap() }
        else { button(startingWith: "Start ").tap() }
        sleep(4)
        dismissAlerts()
        shot("2-workout")
        let tick = app.switches["Set 1 done"]
        if tick.waitForExistence(timeout: 10) {
            tick.tap()
            sleep(2)
            dismissAlerts()
            shot("6-rest")
        }
    }
}
