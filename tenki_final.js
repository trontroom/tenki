// メインページ（現在の天気 + 3日間予報・地点管理・時計）のロジック

function showStatus(message) {
  document.getElementById('status-message').textContent = message;
}

// 現在の天気(current) + 3日間の日別予報(daily)を1回のリクエストで取得
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: ['temperature_2m', 'weather_code'].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
    ].join(','),
    timezone: 'auto',
    forecast_days: 3,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) {
    throw new Error('天気データの取得に失敗しました');
  }
  return res.json();
}

// ===== 現在の天気を表示 =====
function renderCurrent(name, current) {
  const info = weatherCodeToInfo(current.weather_code);
  document.getElementById('current-name').textContent = name;
  document.getElementById('current-emoji').textContent = info.emoji;
  document.getElementById('current-temp').textContent = `${Math.round(current.temperature_2m)}℃`;
  document.getElementById('current-desc').textContent = info.label;
}

// ===== 3日間の予報カードを表示 =====
function renderForecast(daily) {
  const offsetLabels = ['今日', '明日', '明後日'];
  const list = document.getElementById('forecast-list');
  list.innerHTML = '';

  for (let i = 0; i < 3; i++) {
    const date = new Date(`${daily.time[i]}T00:00:00`);
    const weekday = WEEKDAY_NAMES[date.getDay()];
    const info = weatherCodeToInfo(daily.weather_code[i]);
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const precip = daily.precipitation_sum[i];
    const pop = daily.precipitation_probability_max[i];
    const wind = Math.round(daily.wind_speed_10m_max[i]);

    const card = document.createElement('div');
    card.className = 'forecast-card' + (pop >= 50 ? ' rainy' : '');
    card.innerHTML = `
      <p class="day">${offsetLabels[i]}（${weekday}）</p>
      <p class="emoji">${info.emoji}</p>
      <p class="weather-label">${info.label}</p>
      <p class="temps"><span class="temp-max">${max}°</span> / <span class="temp-min">${min}°</span></p>
      <p class="pop">☂ ${pop}%（${precip}mm）</p>
      <p class="wind">💨 ${wind}km/h</p>
    `;
    list.appendChild(card);
  }
}

async function loadAndRenderWeather(location) {
  showStatus(`${location.name} の天気を取得中...`);
  try {
    const data = await fetchWeather(location.lat, location.lon);
    renderCurrent(location.name, data.current);
    renderForecast(data.daily);
    showStatus(`${location.name} の天気を表示しています。`);
  } catch (err) {
    showStatus('天気データの取得に失敗しました。しばらくしてから再度お試しください。');
  }
}

// ===== 地点ピルボタンの描画 =====
function renderLocationButtons(locations, selectedName) {
  const container = document.getElementById('location-buttons');
  container.innerHTML = '';

  locations.forEach((loc) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'loc-btn' + (loc.name === selectedName ? ' active' : '');
    btn.textContent = loc.name;
    btn.addEventListener('click', () => selectLocation(loc.name));

    const remove = document.createElement('span');
    remove.className = 'remove';
    remove.textContent = '×';
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteLocation(loc.name);
    });

    btn.appendChild(remove);
    container.appendChild(btn);
  });
}

function selectLocation(name) {
  const locations = loadLocations();
  const location = locations.find((l) => l.name === name);
  if (!location) return;
  setSelectedLocationName(name);
  renderLocationButtons(locations, name);
  loadAndRenderWeather(location);
}

function addLocation(location) {
  const locations = loadLocations();
  const exists = locations.some((l) => l.name === location.name);
  if (exists) {
    showStatus(`「${location.name}」はすでに登録されています。`);
    renderLocationButtons(locations, location.name);
    selectLocation(location.name);
    return;
  }
  const updated = [...locations, location];
  saveLocations(updated);
  renderLocationButtons(updated, location.name);
  selectLocation(location.name);
  showStatus(`「${location.name}」を追加しました。`);
}

function deleteLocation(name) {
  const locations = loadLocations();
  if (locations.length <= 1) {
    showStatus('最後の1件は削除できません。');
    return;
  }
  if (!confirm(`「${name}」を削除しますか？`)) return;

  const filtered = locations.filter((l) => l.name !== name);
  saveLocations(filtered);

  const currentSelected = getSelectedLocation();
  const nextName = currentSelected.name === name ? filtered[0].name : currentSelected.name;
  renderLocationButtons(filtered, nextName);
  selectLocation(nextName);
  showStatus(`「${name}」を削除しました。`);
}

// ===== 地名検索（Nominatim） =====
async function searchPlace(query) {
  const params = new URLSearchParams({
    format: 'json',
    'accept-language': 'ja',
    limit: 8,
    q: query,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error('地点の検索に失敗しました');
  }
  return res.json();
}

function dedupeResults(results) {
  const seen = new Set();
  const deduped = [];
  for (const result of results) {
    const key = `${result.name}_${Math.round(parseFloat(result.lat) * 100)}_${Math.round(parseFloat(result.lon) * 100)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }
  return deduped.slice(0, 5);
}

function renderSearchResults(results) {
  const ul = document.getElementById('search-results');
  ul.innerHTML = '';
  results.forEach((result) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = result.display_name;
    button.addEventListener('click', () => {
      const shortName = (result.name && result.name.trim()) || result.display_name.split(',')[0].trim();
      addLocation({
        name: shortName,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      });
      ul.innerHTML = '';
      document.getElementById('location-input').value = '';
      document.querySelector('.add-form').removeAttribute('open');
    });
    li.appendChild(button);
    ul.appendChild(li);
  });
}

function handleAddLocationSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('location-input');
  const query = input.value.trim();
  if (!query) return;

  showStatus(`「${query}」を検索中...`);
  searchPlace(query)
    .then((rawResults) => {
      const results = dedupeResults(rawResults);
      if (results.length === 0) {
        showStatus('該当する地点が見つかりませんでした。別の表記でお試しください。');
        return;
      }
      renderSearchResults(results);
      showStatus('候補から地点を選択してください。');
    })
    .catch(() => {
      showStatus('地点の検索に失敗しました。しばらくしてから再度お試しください。');
    });
}

// ===== 現在地の天気（Geolocation API） =====
function handleGeolocationClick() {
  if (!('geolocation' in navigator)) {
    showStatus('このブラウザは現在地取得に対応していません。');
    return;
  }
  showStatus('現在地を取得中...');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = {
        name: '現在地',
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
      const locations = loadLocations().filter((l) => l.name !== '現在地');
      const updated = [...locations, location];
      saveLocations(updated);
      renderLocationButtons(updated, '現在地');
      selectLocation('現在地');
    },
    () => {
      showStatus('現在地を取得できませんでした。位置情報の利用を許可してください。');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  );
}

// ===== 時計：1秒ごとに更新 =====
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
}

function init() {
  updateClock();
  setInterval(updateClock, 1000);

  const locations = loadLocations();
  const selected = getSelectedLocation();
  renderLocationButtons(locations, selected.name);
  loadAndRenderWeather(selected);

  document.getElementById('add-location-form').addEventListener('submit', handleAddLocationSubmit);
  document.getElementById('geolocation-btn').addEventListener('click', handleGeolocationClick);

  // 1時間ごとに天気を再取得
  setInterval(() => loadAndRenderWeather(getSelectedLocation()), 60 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
