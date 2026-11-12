import AppIntents
import SwiftUI
import UIKit
import WidgetKit

/*
 * Redrep's widgets (the widget extension, ios/ci/add-widgets.rb): today's workout on the Home
 * Screen in three sizes and on the Lock Screen, the streak on the Lock Screen, the configurable
 * "Redrep" widget (v1.4.4: you pick what it shows, below), and the running workout's Live
 * Activity (LiveActivityWidget.swift). A tap opens the screen it is about (lib/widget-links.js). What they show is the snapshot the app writes
 * to the App Group (WidgetBridgePlugin.swift, lib/widgets.js); the views are in
 * App/WidgetViews.swift, which the app compiles too for its CI pictures.
 */
@main
struct OpenGymWidgets: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        StreakWidget()
        ConfigurableWidget()
        WorkoutLiveActivity()
        if #available(iOS 18.0, *) {
            StartWorkoutControl()
            RestTimerControl()
            LogWeightControl()
            AddWaterControl()
        }
    }
}

struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

/// The snapshot as it is, with an entry for each coming midnight: the snapshot carries the next
/// week's plan, so the widget turns the page by itself while the app stays closed.
struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load())
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let snap = WidgetSnapshot.load()
        var entries = [SnapshotEntry(date: Date(), snapshot: snap)]
        let cal = Calendar.current
        var day = cal.startOfDay(for: Date())
        for _ in 0..<7 {
            guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
            entries.append(SnapshotEntry(date: day, snapshot: snap))
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct TodayWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var body: some View {
        let model = WidgetModel(snap: entry.snapshot, date: entry.date)
        Group {
            switch family {
            case .systemMedium: MediumWidgetView(model: model)
            case .systemLarge: LargeWidgetView(model: model)
            case .accessoryRectangular: NextRectView(model: model)
            case .accessoryInline: NextInlineView(model: model)
            default: SmallWidgetView(model: model)
            }
        }
        // A tap: back into the workout running, else today's (or the next) workout, else Home.
        .widgetURL(model.active != nil ? GymLink.workout : GymLink.start(model.nextWorkout?.ids))
        .containerBackground(for: .widget) {
            if family == .accessoryRectangular || family == .accessoryInline {
                Color.clear
            } else {
                Color(UIColor.systemBackground)
            }
        }
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "OpenGymToday", provider: SnapshotProvider()) { entry in
            TodayWidgetView(entry: entry)
        }
        .configurationDisplayName("Today’s workout")
        .description("Your plan for today, the week ahead and your streak.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
    }
}

struct StreakWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "OpenGymStreak", provider: SnapshotProvider()) { entry in
            StreakCircleView(model: WidgetModel(snap: entry.snapshot, date: entry.date))
                .widgetURL(GymLink.stats)
                .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("Streak")
        .description("Weeks in a row with a workout.")
        .supportedFamilies([.accessoryCircular])
    }
}

// MARK: - the configurable widget

extension GymWidgetKind: AppEnum {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "What to show"
    static let caseDisplayRepresentations: [GymWidgetKind: DisplayRepresentation] = [
        .streak: DisplayRepresentation(title: "Week streak", image: .init(systemName: "flame.fill")),
        .weight: DisplayRepresentation(title: "Weight goal", image: .init(systemName: "scalemass.fill")),
        .week: DisplayRepresentation(title: "This week", image: .init(systemName: "calendar")),
        .next: DisplayRepresentation(title: "Next workout", image: .init(systemName: "dumbbell.fill")),
        .records: DisplayRepresentation(title: "Records", image: .init(systemName: "trophy.fill")),
        .volume: DisplayRepresentation(title: "Volume", image: .init(systemName: "chart.bar.fill")),
        .challenges: DisplayRepresentation(title: "Challenges", image: .init(systemName: "rosette")),
    ]
}

/// The widget's "Edit" screen: what it shows, and on the wide one what goes beside it.
struct GymWidgetIntent: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "What to show"
    static let description = IntentDescription("Pick what the widget shows.")

    @Parameter(title: "What to show", default: .streak)
    var kind: GymWidgetKind

    @Parameter(title: "And beside it", default: .week)
    var second: GymWidgetKind

    init() {}
    init(kind: GymWidgetKind, second: GymWidgetKind) {
        self.kind = kind
        self.second = second
    }
}

struct GymEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
    let kind: GymWidgetKind
    let second: GymWidgetKind
}

/// The same snapshot and midnights as the other widgets (SnapshotProvider), with the choice.
struct GymProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> GymEntry {
        GymEntry(date: Date(), snapshot: WidgetSnapshot.load(), kind: .streak, second: .week)
    }

    func snapshot(for configuration: GymWidgetIntent, in context: Context) async -> GymEntry {
        GymEntry(date: Date(), snapshot: WidgetSnapshot.load(), kind: configuration.kind, second: configuration.second)
    }

    func timeline(for configuration: GymWidgetIntent, in context: Context) async -> Timeline<GymEntry> {
        let snap = WidgetSnapshot.load()
        var entries = [GymEntry(date: Date(), snapshot: snap, kind: configuration.kind, second: configuration.second)]
        let cal = Calendar.current
        var day = cal.startOfDay(for: Date())
        for _ in 0..<7 {
            guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
            entries.append(GymEntry(date: day, snapshot: snap, kind: configuration.kind, second: configuration.second))
        }
        return Timeline(entries: entries, policy: .atEnd)
    }
}

struct ConfigurableWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "OpenGymPick", intent: GymWidgetIntent.self, provider: GymProvider()) { entry in
            ConfigurableWidgetView(entry: entry)
        }
        .configurationDisplayName("Redrep")
        .description("Your streak, weight goal, week, next workout, records or volume. You pick.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct ConfigurableWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: GymEntry

    var body: some View {
        KindWidgetView(model: WidgetModel(snap: entry.snapshot, date: entry.date), kind: entry.kind, second: entry.second)
            .containerBackground(for: .widget) {
                if family == .systemSmall || family == .systemMedium {
                    Color(UIColor.systemBackground)
                } else {
                    Color.clear
                }
            }
    }
}


// MARK: - Control Center, the Lock Screen and the Action button (iOS 18)
//
// Four buttons you can put in Control Center, on the Lock Screen or on the Action button. Each
// opens the app with one of its links (lib/widget-links.js), so a control does no more than the
// same tap in the app would: a start still asks the weigh-in and the readiness check, and water
// is only added when the Protein, water and supplements module is on.

@available(iOS 18.0, *)
struct OpenRedrepLinkIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Redrep"
    static let isDiscoverable = false

    @Parameter(title: "Link")
    var link: String

    init() { link = GymLink.home.absoluteString }
    init(_ url: URL) { link = url.absoluteString }

    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(URL(string: link) ?? GymLink.home))
    }
}

@available(iOS 18.0, *)
enum ControlLink {
    static let today = URL(string: "redrep://start?today=1")!
    static let rest = URL(string: "redrep://rest")!
    static let water = URL(string: "redrep://water?ml=250")!
}

@available(iOS 18.0, *)
struct StartWorkoutControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.riadheydar.redrep.control.start") {
            ControlWidgetButton(action: OpenRedrepLinkIntent(ControlLink.today)) {
                Label("Start workout", systemImage: "play.fill")
            }
        }
        .displayName("Start workout")
    }
}

@available(iOS 18.0, *)
struct RestTimerControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.riadheydar.redrep.control.rest") {
            ControlWidgetButton(action: OpenRedrepLinkIntent(ControlLink.rest)) {
                Label("Rest timer", systemImage: "timer")
            }
        }
        .displayName("Rest timer")
    }
}

@available(iOS 18.0, *)
struct LogWeightControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.riadheydar.redrep.control.weigh-in") {
            ControlWidgetButton(action: OpenRedrepLinkIntent(GymLink.weighIn)) {
                Label("Log weight", systemImage: "scalemass.fill")
            }
        }
        .displayName("Log weight")
    }
}

@available(iOS 18.0, *)
struct AddWaterControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.riadheydar.redrep.control.water") {
            ControlWidgetButton(action: OpenRedrepLinkIntent(ControlLink.water)) {
                Label("Add water", systemImage: "drop.fill")
            }
        }
        .displayName("Add water")
    }
}
