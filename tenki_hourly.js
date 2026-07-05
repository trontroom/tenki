// 24時間天気ページ（1時間ごとの天気・気温・降水量）のロジック

async function fetchHourly(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: ['temperature_2m', 'precipitation', 'precipitation_probability', 'weather_code'].join(','),
    timezone: 'auto',
    forecast_days: 2,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) {
    throw new Error('天気データの取得に失敗しました');
  }
  const data = await res.json();
  return data.hourly;
}

function renderHourly(hourly) {
  const list = document.getElementById('hourly-list');
  list.innerHTML = '';

  const now = new Date();
  let startIndex = hourly.time.findIndex((t) => new Date(t) >= now);
  if (startIndex === -1) startIndex = 0;

  const count = Math.min(24, hourly.time.length - startIndex);
  let lastDate = '';

  for (let i = startIndex; i < startIndex + count; i++) {
    const date = new Date(hourly.time[i]);
    const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;

    // 日付が変わったら区切りを入れる
    if (dateKey !== lastDate) {
      const sep = document.createElement('li');
      sep.className = 'hour-day-sep';
      sep.textContent = `${dateKey}（${WEEKDAY_NAMES[date.getDay()]}）`;
      list.appendChild(sep);
      lastDate = dateKey;
    }

    const info = weatherCodeToInfo(hourly.weather_code[i]);
    const temp = Math.round(hourly.temperature_2m[i]);
    const precip = hourly.precipitation[i];
    const pop = hourly.precipitation_probability[i];

    const li = document.createElement('li');
    li.className = 'hour-row' + (i === startIndex ? ' now' : '');
    li.innerHTML = `
      <span class="hour-time">${date.getHours()}時</span>
      <span class="hour-emoji">${info.emoji}</span>
      <span class="hour-temp">${temp}°</span>
      <span class="hour-rain">
        <span class="rain-bar"><span class="rain-fill" style="width:${pop}%"></span></span>
        <span class="rain-text">${pop}% ・ ${precip}mm</span>
      </span>
    `;
    list.appendChild(li);
  }
}

async function init() {
  const location = getSelectedLocation();
  document.getElementById('location-name').textContent = location.name;
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = '読み込み中...';
  try {
    const hourly = await fetchHourly(location.lat, location.lon);
    renderHourly(hourly);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = '天気データの取得に失敗しました。しばらくしてから再度お試しください。';
  }
}

document.addEventListener('DOMContentLoaded', init);
