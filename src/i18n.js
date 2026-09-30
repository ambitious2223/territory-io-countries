const EN = {
  'app.title': 'Territory With Flags',
  'sidebar.leaderboard': 'Leaderboard',
  'control.pause': 'Pause',
  'control.play': 'Play',
  'control.speed': 'Speed:',
  'control.map': 'Map:',
  'control.debug': 'Debug',
  'control.mute': 'Mute',
  'control.unmute': 'Unmute',
  'control.restart': 'Restart',
  'control.start': 'Start',
  'control.end': 'End',
  'control.auto': 'Auto',
  'gameover.title': 'VICTORY',
  'gameover.playAgain': 'Play Again',
  'gameover.hint': 'or press R to restart',
  'gameover.kills': 'Total Kills',
  'gameover.tiles': 'Tiles',
  'gameover.duration': 'Match Duration',
  'gameover.domination': 'Dominated the arena',
  'gameover.timeout': 'Highest territory at time expiry',
  'gameover.elimination': 'Last marble standing',
  'debug.header': 'Debug',
  'debug.connection': 'Connection',
  'debug.bridge': 'Bridge',
  'debug.state': 'State',
  'debug.source': 'Source',
  'debug.events': 'Events',
  'debug.error': 'Error',
  'debug.connect': 'Connect',
  'debug.disconnect': 'Disconnect',
  'debug.viewers': 'Viewers',
  'debug.activeViewers': 'Active',
  'debug.queuedViewers': 'Queued',
  'debug.totalViewers': 'Total',
  'debug.cap': 'Cap',
  'debug.aiFill': 'AI Fill',
  'debug.cinematic': 'Cinematic',
  'debug.queue': 'Queue',
  'debug.blur': 'Blur',
  'debug.skip': 'Skip Intro',
  'debug.mockEvent': 'Mock Event',
  'debug.inject': 'Inject',
  'debug.teams': 'Teams',
  'debug.addTeam': 'Add Team',
  'debug.content': 'Content — Gift Mappings',
  'debug.addMapping': 'Add',
  'debug.save': 'Save',
  'debug.language': 'Language',
  'debug.uploadFlag': 'Flag',
  'debug.remove': 'Remove',
  'debug.performance': 'Performance',
  'debug.frameTime': 'Frame Time',
  'debug.claimable': 'Claimable',
  'debug.particles': 'Particles',
  'debug.active': 'Active',
  'debug.poolFree': 'Pool Free',
  'debug.tileOwnership': 'Tile Ownership',
  'pause.paused': 'PAUSED',
  'pause.hint': 'Press Space to resume'
}

const AR = {
  'app.title': 'إقليم الأعلام',
  'sidebar.leaderboard': 'لوحة الصدارة',
  'control.pause': 'إيقاف',
  'control.play': 'تشغيل',
  'control.speed': 'السرعة:',
  'control.map': 'الخريطة:',
  'control.debug': 'تصحيح',
  'control.mute': 'كتم',
  'control.unmute': 'إلغاء الكتم',
  'control.restart': 'إعادة',
  'control.start': 'ابدأ',
  'control.end': 'إنهاء',
  'control.auto': 'تلقائي',
  'gameover.title': 'الفوز',
  'gameover.playAgain': 'العب مرة أخرى',
  'gameover.hint': 'أو اضغط R لإعادة التشغيل',
  'gameover.kills': 'إجمالي القتلى',
  'gameover.tiles': 'المربعات',
  'gameover.duration': 'مدة المباراة',
  'gameover.domination': 'سيطر على الساحة',
  'gameover.timeout': 'أعلى أراضٍ عند انتهاء الوقت',
  'gameover.elimination': 'آخر لاعب صامد',
  'debug.header': 'تصحيح',
  'debug.connection': 'الاتصال',
  'debug.bridge': 'الجسر',
  'debug.state': 'الحالة',
  'debug.source': 'المصدر',
  'debug.events': 'الأحداث',
  'debug.error': 'خطأ',
  'debug.connect': 'اتصال',
  'debug.disconnect': 'قطع',
  'debug.viewers': 'المشاهدون',
  'debug.activeViewers': 'نشط',
  'debug.queuedViewers': 'بالانتظار',
  'debug.totalViewers': 'الإجمالي',
  'debug.cap': 'الحد',
  'debug.aiFill': 'تعبئة آلية',
  'debug.cinematic': 'المشهد السينمائي',
  'debug.queue': 'قائمة الانتظار',
  'debug.blur': 'الضبابية',
  'debug.skip': 'تخطي المقدمة',
  'debug.mockEvent': 'حدث تجريبي',
  'debug.inject': 'إرسال',
  'debug.teams': 'الفرق',
  'debug.addTeam': 'إضافة فريق',
  'debug.content': 'المحتوى — ربط الهدايا',
  'debug.addMapping': 'إضافة',
  'debug.save': 'حفظ',
  'debug.language': 'اللغة',
  'debug.uploadFlag': 'العلم',
  'debug.remove': 'إزالة',
  'debug.performance': 'الأداء',
  'debug.frameTime': 'زمن الإطار',
  'debug.claimable': 'قابل للسيطرة',
  'debug.particles': 'الجزيئات',
  'debug.active': 'نشط',
  'debug.poolFree': 'متاح',
  'debug.tileOwnership': 'ملكية المربعات',
  'pause.paused': 'متوقف',
  'pause.hint': 'اضغط مسافة للاستئناف'
}

const DICTIONARIES = { en: EN, ar: AR }
const STORAGE_KEY = 'twf_language'

let language = readLanguage()

function readLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && DICTIONARIES[saved]) return saved
  } catch {
    void 0
  }
  return 'en'
}

export function t(key, fallback) {
  return DICTIONARIES[language]?.[key] ?? EN[key] ?? fallback ?? key
}

export function getLanguage() {
  return language
}

export function setLanguage(next) {
  language = DICTIONARIES[next] ? next : 'en'
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    void 0
  }
  applyLanguage()
}

export function applyLanguage(root = document) {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n)
  })
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle)
  })
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder)
  })
}
