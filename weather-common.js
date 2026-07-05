// 天気予報アプリ共通処理（tenki_final.js / tenki_hourly.js から利用）

const LOCATIONS_KEY = 'tenkiLocations';
const SELECTED_KEY = 'tenkiSelectedLocation';
const DEFAULT_LOCATIONS = [{ name: '東京', lat: 35.6812, lon: 139.7671 }];

const WEATHER_CODE_MAP = {
  0: { emoji: '☀️', label: '快晴' },
  1: { emoji: '🌤️', label: 'ほぼ晴れ' },
  2: { emoji: '⛅', label: '一部くもり' },
  3: { emoji: '☁️', label: 'くもり' },
  45: { emoji: '🌫️', label: '霧' },
  48: { emoji: '🌫️', label: '霧（霜）' },
  51: { emoji: '🌦️', label: '小雨' },
  53: { emoji: '🌦️', label: '小雨' },
  55: { emoji: '🌧️', label: '雨' },
  56: { emoji: '🌧️', label: '着氷性の小雨' },
  57: { emoji: '🌧️', label: '着氷性の雨' },
  61: { emoji: '🌧️', label: '雨' },
  63: { emoji: '🌧️', label: '雨' },
  65: { emoji: '🌧️', label: '大雨' },
  66: { emoji: '🌧️', label: '着氷性の雨' },
  67: { emoji: '🌧️', label: '着氷性の大雨' },
  71: { emoji: '🌨️', label: '雪' },
  73: { emoji: '🌨️', label: '雪' },
  75: { emoji: '❄️', label: '大雪' },
  77: { emoji: '❄️', label: '雪' },
  80: { emoji: '🌦️', label: 'にわか雨' },
  81: { emoji: '🌧️', label: 'にわか雨' },
  82: { emoji: '⛈️', label: '激しいにわか雨' },
  85: { emoji: '🌨️', label: 'にわか雪' },
  86: { emoji: '❄️', label: 'にわか雪' },
  95: { emoji: '⛈️', label: '雷雨' },
  96: { emoji: '⛈️', label: '雷雨（ひょう）' },
  99: { emoji: '⛈️', label: '雷雨（ひょう）' },
};

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

function weatherCodeToInfo(code) {
  return WEATHER_CODE_MAP[code] || { emoji: '❓', label: '不明' };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function loadLocations() {
  try {
    const raw = localStorage.getItem(LOCATIONS_KEY);
    if (!raw) return DEFAULT_LOCATIONS.slice();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_LOCATIONS.slice();
  } catch (err) {
    return DEFAULT_LOCATIONS.slice();
  }
}

function saveLocations(locations) {
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
}

function getSelectedLocation() {
  const locations = loadLocations();
  const savedName = localStorage.getItem(SELECTED_KEY);
  const found = locations.find((l) => l.name === savedName);
  return found || locations[0];
}

function setSelectedLocationName(name) {
  localStorage.setItem(SELECTED_KEY, name);
}
