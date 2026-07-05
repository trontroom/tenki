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
  const tbody = document.getElementById('hourly-body');
  tbody.innerHTML = '';

  const now = new Date();
  let startIndex = hourly.time.findIndex((t) => new Date(t) >= now);
  if (startIndex === -1) startIndex = 0;

  const count = Math.min(24, hourly.time.length - startIndex);
  for (let i = startIndex; i < startIndex + count; i++) {
    const date = new Date(hourly.time[i]);
    const timeLabel = `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:00`;
    const info = weatherCodeToInfo(hourly.weather_code[i]);

    const tr = document.createElement('tr');

    const tdTime = document.createElement('td');
    tdTime.textContent = timeLabel;

    const tdWeather = document.createElement('td');
    tdWeather.textContent = `${info.emoji} ${info.label}`;

    const tdTemp = document.createElement('td');
    tdTemp.textContent = `${Math.round(hourly.temperature_2m[i])}°C`;

    const tdPrecip = document.createElement('td');
    tdPrecip.textContent = `${hourly.precipitation[i]} mm`;

    const tdPop = document.createElement('td');
    tdPop.textContent = `${hourly.precipitation_probability[i]} %`;

    tr.append(tdTime, tdWeather, tdTemp, tdPrecip, tdPop);
    tbody.appendChild(tr);
  }
}

async function init() {
  const location = getSelectedLocation();
  document.getElementById('location-name').textContent = `${location.name} の24時間天気`;
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
