// The supplement reminder on the phone (lib/intake.js supplementNotifications): cancelled and
// scheduled again whenever the workout reminder is (lib/mobile.js syncReminder runs after every
// save and on every return to the app), so ticking today off takes today's reminder away.
// `interactive` lets the Settings switch ask for permission; a background resync never does.
import { isOn } from './modules.js'
import { t } from './i18n.js'
import { supplementNotifications, reminderIds } from './intake.js'

export async function syncSupplementReminder(S, interactive = false) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: reminderIds() }).catch(() => {})
    if (!isOn(S, 'nutrition')) return true
    const notifications = supplementNotifications(S, new Date(), { title: t('Supplements'), body: names => t('Time for {0}.', names) })
    if (!notifications.length) return true
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && interactive) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    await LocalNotifications.schedule({ notifications })
    return true
  } catch { return false }
}
