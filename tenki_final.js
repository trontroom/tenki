// メインページ（3日間の天気予報・地点管理・時計）のロジック

function showStatus(message) {
  document.getElementById('status-message').textContent = message;
}

async function fetchForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
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
  const data = await res.json();
  return data.daily;
}

function renderForecast(daily) {
  const offsetLabels = ['今日', '明日', '明後日'];

  for (let i = 0; i < 3; i++) {
    const date = new Date(`${daily.time[i]}T00:00:00`);
    const weekday = WEEKDAY_NAMES[date.getDay()];
    document.getElementById(`day${i}-label`).textContent = `${offsetLabels[i]}（${weekday}）`;

    const info = weatherCodeToInfo(daily.weather_code[i]);
    const weatherCell = document.getElementById(`day${i}-weather`);
    weatherCell.innerHTML = '';
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = info.emoji;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'weather-label';
    labelSpan.textContent = info.label;
    weatherCell.append(emojiSpan, labelSpan);

    document.getElementById(`day${i}-tmax`).textContent = `${Math.round(daily.temperature_2m_max[i])}°C`;
    document.getElementById(`day${i}-tmin`).textContent = `${Math.round(daily.temperature_2m_min[i])}°C`;
    document.getElementById(`day${i}-precip`).textContent = `${daily.precipitation_sum[i]} mm`;
    document.getElementById(`day${i}-pop`).textContent = `${daily.precipitation_probability_max[i]} %`;
    document.getElementById(`day${i}-wind`).textContent = `${Math.round(daily.wind_speed_10m_max[i])} km/h`;
  }
}

async function loadAndRenderWeather(location) {
  showStatus(`${location.name} の天気を取得中...`);
  try {
    const daily = await fetchForecast(location.lat, location.lon);
    renderForecast(daily);
    showStatus(`${location.name} の天気を表示しています。`);
  } catch (err) {
    showStatus('天気データの取得に失敗しました。しばらくしてから再度お試しください。');
  }
}

function renderLocationSelect(locations, selectedName) {
  const select = document.getElementById('location-select');
  select.innerHTML = '';
  locations.forEach((loc) => {
    const opt = document.createElement('option');
    opt.value = loc.name;
    opt.textContent = loc.name;
    select.appendChild(opt);
  });
  if (selectedName) {
    select.value = selectedName;
  }
}

function selectLocation(name) {
  const locations = loadLocations();
  const location = locations.find((l) => l.name === name);
  if (!location) return;
  setSelectedLocationName(name);
  document.getElementById('location-select').value = name;
  loadAndRenderWeather(location);
}

function addLocation(location) {
  const locations = loadLocations();
  const exists = locations.some((l) => l.name === location.name);
  if (exists) {
    showStatus(`「${location.name}」はすでに登録されています。`);
    renderLocationSelect(locations, location.name);
    selectLocation(location.name);
    return;
  }
  const updated = [...locations, location];
  saveLocations(updated);
  renderLocationSelect(updated, location.name);
  selectLocation(location.name);
  showStatus(`「${location.name}」を追加しました。`);
}

function deleteSelectedLocation() {
  const locations = loadLocations();
  if (locations.length <= 1) {
    showStatus('最後の1件は削除できません。');
    return;
  }
  const name = document.getElementById('location-select').value;
  const filtered = locations.filter((l) => l.name !== name);
  saveLocations(filtered);
  renderLocationSelect(filtered, filtered[0].name);
  selectLocation(filtered[0].name);
  showStatus(`「${name}」を削除しました。`);
}

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
      renderLocationSelect(updated, '現在地');
      selectLocation('現在地');
    },
    () => {
      showStatus('現在地を取得できませんでした。位置情報の利用を許可してください。');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  );
}

function updateClock() {
  const now = new Date();
  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  document.getElementById('clock').textContent = time;
}

function init() {
  updateClock();
  setInterval(updateClock, 1000);

  const locations = loadLocations();
  const selected = getSelectedLocation();
  renderLocationSelect(locations, selected.name);
  selectLocation(selected.name);

  document.getElementById('location-select').addEventListener('change', (event) => {
    selectLocation(event.target.value);
  });
  document.getElementById('delete-location-btn').addEventListener('click', deleteSelectedLocation);
  document.getElementById('add-location-form').addEventListener('submit', handleAddLocationSubmit);
  document.getElementById('geolocation-btn').addEventListener('click', handleGeolocationClick);
}

document.addEventListener('DOMContentLoaded', init);
