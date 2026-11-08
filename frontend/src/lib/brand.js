// Redrep's own addresses and choices in one place. openGym's live on in the code only where they
// credit it. APP_STORE_ID is App Store Connect's numeric Apple ID for the app; empty until the app
// record exists, and the rows that need it stay hidden until then.
export const APP_NAME = 'Redrep'
export const APP_STORE_ID = ''
export const REPO_SLUG = 'Ri4dH/Redrep'
export const SOURCE_URL = 'https://github.com/' + REPO_SLUG
export const ISSUES_URL = SOURCE_URL + '/issues'
export const DOCS_URL = SOURCE_URL + '/blob/main/docs'
export const UPSTREAM_URL = 'https://github.com/DuarteSantos8/openGym'
// Redrep has no website: the features that only work through one (plan links, NFC stickers) are
// off, and plans travel as files instead.
export const LINKS_OFF = true
// The phone app is free and needs no account: it keeps everything on the phone and never asks to
// sign in or connect to a server.
export const LOCAL_ONLY = true
