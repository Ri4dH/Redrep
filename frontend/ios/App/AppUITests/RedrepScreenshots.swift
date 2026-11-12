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
        // One snapshot of the whole page: walking app.buttons one by one fails when the page
        // changes under it.
        var labels: [String] = []
        func walk(_ e: XCUIElementSnapshot) {
            if e.elementType == .button, !e.label.isEmpty { labels.append(e.label) }
            e.children.forEach(walk)
        }
        if let root = try? app.snapshot() { walk(root) }
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

    /// Taps a web-view element by its middle: many are not exposed as hittable buttons.
    @discardableResult
    private func press(_ e: XCUIElement, _ what: String, timeout: TimeInterval = 10) -> Bool {
        guard e.waitForExistence(timeout: timeout) else { XCTFail("\(what) did not show up"); return false }
        e.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        return true
    }

    private func label(_ text: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", text)).firstMatch
    }

    /// Scrolls the page until `e` is on screen (at most a few swipes).
    private func reveal(_ e: XCUIElement) {
        for _ in 0..<6 where !(e.exists && e.isHittable) { app.swipeUp(velocity: .slow) }
    }

    /// The bottom sheet that has no close button, dragged down by its handle.
    private func dragSheetAway() {
        for _ in 0..<4 where app.buttons["Add to my plan"].exists {
            let top = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.115))
            top.press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.98)))
            sleep(2)
        }
    }

    func testAppStoreScreenshots() {
        app.launch()
        // The welcome can still show on a fresh install: the example history is added after the
        // app has decided whether to show it. Skip it if it is there.
        let skip = app.buttons["Skip"]
        if skip.waitForExistence(timeout: 20), !app.buttons["Home"].exists { skip.tap() }
        let home = app.buttons.matching(NSPredicate(format: "label == %@", "Home")).firstMatch
        XCTAssertTrue(home.waitForExistence(timeout: 90), "home did not show up")
        if app.staticTexts["Want a 1-minute tour?"].waitForExistence(timeout: 8) { tap(app.buttons["Skip"], "Skip (tour)") }
        dismissAlerts()
        shot("01-home")

        // Protein, water and supplements, further down Home.
        let protein = label("Protein and water")
        reveal(protein)
        if protein.exists {
            protein.coordinate(withNormalizedOffset: .zero).press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.12)))
            sleep(1)
            shot("10-protein")
        }

        // The pain map: the example history's sore shoulders.
        let painCard = button(startingWith: "Pain and injuries")
        reveal(painCard)
        if press(painCard, "the pain card") {
            sleep(3)
            shot("04-pain")
            press(app.buttons["Back"], "Back")
            sleep(1)
        }

        tab("Exercises")
        let search = app.searchFields.firstMatch.exists ? app.searchFields.firstMatch : app.textFields.firstMatch
        if tap(search, "the exercise search") {
            search.typeText("barbell full squat\n")
            sleep(2)
            // The keyboard covers the list: put it away, then open the first result by its name.
            let done = app.toolbars.buttons["Done"]
            if done.exists { done.tap() } else if app.keyboards.count > 0 { app.swipeDown() }
            sleep(1)
            // The rows are not buttons in the web view: the name's text, or failing that the spot
            // just under "Create your own exercise", which is where the first result sits.
            let name = NSPredicate(format: "label ==[c] %@ OR value ==[c] %@", "barbell full squat", "barbell full squat")
            let row = app.staticTexts.matching(name).firstMatch
            let create = any(startingWith: "Create your own exercise")
            if row.waitForExistence(timeout: 10) {
                row.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            } else if create.exists {
                create.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).withOffset(CGVector(dx: 0, dy: 78)).tap()
            } else { XCTFail("no squat row") }
            shot("06-exercise")
            dragSheetAway()
        }

        tab("Stats")
        shot("07-stats")

        tab("Plan")
        shot("08-plan")

        // Max day: the bench press, the opener made, the second attempt up.
        // Start begins today's plan: "Choose a different workout" leads to the Start screen.
        tab("Start")
        sleep(2)
        let chooser = app.buttons["Choose a different workout"]
        if chooser.waitForExistence(timeout: 5) { chooser.tap(); sleep(2) }
        let maxDay = button(startingWith: "Max day")
        reveal(maxDay)
        if press(maxDay, "Max day") {
            sleep(2)
            if press(any(startingWith: "Barbell Bench Press"), "the bench press") {
                sleep(2)
                press(app.buttons["On to the attempts"], "On to the attempts")
                sleep(1)
                press(app.buttons["Made it, felt easy"], "Made it, felt easy")
                // The rest timer's first start asks for notifications: answered before the picture.
                sleep(2)
                dismissAlerts()
                sleep(1)
                shot("05-maxday")
            }
            let skipRest = app.buttons["Skip"]
            if skipRest.exists { skipRest.tap() }
            press(app.buttons["Back"], "Back")
            sleep(2)
        }

        tab("Start")
        sleep(2)
        let other = app.buttons["Choose a different workout"]
        if other.waitForExistence(timeout: 5) { other.tap() }
        press(button(startingWith: "Start "), "today's Start")
        // The quick weigh-in asks first, then the readiness check.
        let skipWeigh = app.buttons["Start without weighing in"]
        if skipWeigh.waitForExistence(timeout: 6) { skipWeigh.tap() }
        if app.staticTexts["How do you feel today?"].waitForExistence(timeout: 6) {
            // In a labelled group per question, so found by their label rather than as buttons.
            for answer in ["Great", "Fresh", "High"] { press(label(answer), answer, timeout: 3) }
            sleep(1)
            shot("03-readiness")
            press(app.buttons["Start workout"], "Start workout")
        }
        sleep(4)
        dismissAlerts()
        shot("02-workout")
        let tick = any(startingWith: "Set 1 done")   // a checkbox in the web view: a switch or a check box
        if tick.waitForExistence(timeout: 10) {
            tick.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            sleep(2)
            dismissAlerts()
            shot("09-rest")
        }
    }
}
