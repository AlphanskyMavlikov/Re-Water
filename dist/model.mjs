export const DEMO_SOURCES = [
  { id: 'cooling', name: 'Возврат охлаждения', area: 'Плавильный цех', volume: 720, ph: 7.4, tds: 580, temp: 36, oil: 1.2, transferCost: 6, color: '#2489d5' },
  { id: 'rinse', name: 'Промывные воды', area: 'Участок подготовки', volume: 380, ph: 7.8, tds: 320, temp: 29, oil: 0.6, transferCost: 4, color: '#24a99c' },
  { id: 'condensate', name: 'Паровой конденсат', area: 'Энергетический цех', volume: 240, ph: 7.0, tds: 55, temp: 75, oil: 0, transferCost: 5, color: '#8e80d5' },
  { id: 'treated', name: 'Очищенный сток', area: 'Очистные сооружения', volume: 390, ph: 7.2, tds: 480, temp: 24, oil: 0.2, transferCost: 7, color: '#d59c3f' },
];
export const CONSUMERS = [
  { id: 'tower', name: 'Оборотное охлаждение', short: 'Охлаждение', demand: 1100, reuseCap: 0.6, phMin: 6.5, phMax: 8.8, tdsMax: 1000, tempMax: 32, oilMax: 3 },
  { id: 'washing', name: 'Техническая промывка', short: 'Промывка', demand: 650, reuseCap: 0.5, phMin: 6.8, phMax: 8.5, tdsMax: 400, tempMax: 45, oilMax: 1 },
  { id: 'utility', name: 'Вспомогательные процессы', short: 'Техн. нужды', demand: 450, reuseCap: 0.8, phMin: 6, phMax: 9, tdsMax: 900, tempMax: 40, oilMax: 3 },
  { id: 'boiler', name: 'Подпитка котельной', short: 'Котельная', demand: 200, reuseCap: 0.8, phMin: 6.5, phMax: 8.5, tdsMax: 80, tempMax: 85, oilMax: 0.1 },
];
export const DEFAULT_SETTINGS = { freshTariff: 85, dischargeTariff: 45, operatingDays: 330, demandFactor: 1, treatment: false, capex: 24000000, blocked: [] };
export const clone = value => JSON.parse(JSON.stringify(value));
export function qualityAfter(source, treatment) {
  return treatment ? { ...source, tds: source.tds * 0.65, temp: Math.min(source.temp, 27), oil: source.oil * 0.1 } : { ...source };
}
export function qualityChecks(source, consumer, treatment = false) {
  const q = qualityAfter(source, treatment);
  return [
    { name: 'pH', value: q.ph, limit: `${consumer.phMin}–${consumer.phMax}`, ok: q.ph >= consumer.phMin && q.ph <= consumer.phMax, unit: '' },
    { name: 'Минерализация', value: q.tds, limit: `≤ ${consumer.tdsMax}`, ok: q.tds <= consumer.tdsMax, unit: 'мг/л' },
    { name: 'Температура', value: q.temp, limit: `≤ ${consumer.tempMax}`, ok: q.temp <= consumer.tempMax, unit: '°C' },
    { name: 'Нефтепродукты', value: q.oil, limit: `≤ ${consumer.oilMax}`, ok: q.oil <= consumer.oilMax, unit: 'мг/л' },
  ];
}
export function validateSource(s) {
  if (!s || typeof s.id !== 'string' || !s.id || typeof s.name !== 'string' || !s.name.trim()) throw new Error('У источника должны быть ID и название.');
  for (const key of ['volume', 'ph', 'tds', 'temp', 'oil', 'transferCost']) if (!Number.isFinite(s[key])) throw new Error(`Источник «${s.name}»: неверное числовое поле ${key}.`);
  if (s.volume < 0 || s.volume > 100000 || s.ph < 0 || s.ph > 14 || s.tds < 0 || s.tds > 100000 || s.temp < 0 || s.temp > 100 || s.oil < 0 || s.oil > 1000 || s.transferCost < 0 || s.transferCost > 10000) throw new Error(`Источник «${s.name}»: значение вне допустимого диапазона.`);
  return true;
}
export function validateSettings(settings) {
  for (const k of ['freshTariff', 'dischargeTariff', 'operatingDays', 'demandFactor', 'capex']) if (!Number.isFinite(settings[k])) throw new Error('Параметры сценария должны быть числами.');
  if (settings.freshTariff < 0 || settings.freshTariff > 10000 || settings.dischargeTariff < 0 || settings.dischargeTariff > 10000 || settings.operatingDays < 1 || settings.operatingDays > 366 || !Number.isInteger(settings.operatingDays) || settings.demandFactor < 0.5 || settings.demandFactor > 1.5 || settings.capex < 0 || settings.capex > 1e10) throw new Error('Проверьте тарифы, число рабочих дней, нагрузку и инвестиции.');
}
// Минимальная стоимость потока: отрицательная стоимость означает положительную
// экономию. Обратные ребра позволяют перераспределить уже выбранные назначения.
export function optimize(sources = DEMO_SOURCES, settings = DEFAULT_SETTINGS) {
  sources.forEach(validateSource); validateSettings(settings);
  if (new Set(sources.map(s => s.id)).size !== sources.length) throw new Error('ID источников должны быть уникальными.');
  const consumers = CONSUMERS.map(d => ({ ...d, demand: d.demand * settings.demandFactor }));
  const n = sources.length + consumers.length + 2, start = n - 2, finish = n - 1;
  const graph = Array.from({ length: n }, () => []), candidates = [];
  function add(from, to, cap, cost, meta) {
    const f = { to, cap, initial: cap, cost, reverse: graph[to].length, meta };
    const r = { to: from, cap: 0, initial: 0, cost: -cost, reverse: graph[from].length };
    graph[from].push(f); graph[to].push(r);
    return f;
  }
  sources.forEach((s, i) => {
    add(start, i, settings.blocked.includes(s.id) ? 0 : s.volume, 0);
    consumers.forEach((d, j) => {
      for (const treatment of settings.treatment ? [false, true] : [false]) {
        if (!qualityChecks(s, d, treatment).every(c => c.ok)) continue;
        const unitCost = s.transferCost + (treatment ? 22 : 0);
        const edge = add(i, sources.length + j, s.volume, unitCost - settings.freshTariff - settings.dischargeTariff, { source: s.id, consumer: d.id, treatment, unitCost });
        candidates.push(edge);
      }
    });
  });
  consumers.forEach((d, j) => add(sources.length + j, finish, d.demand * d.reuseCap, 0));
  for (let step = 0; step < 1000; step++) {
    const distance = Array(n).fill(Infinity), prev = Array(n).fill(null); distance[start] = 0;
    for (let pass = 0; pass < n - 1; pass++) {
      let changed = false;
      for (let u = 0; u < n; u++) {
        if (!Number.isFinite(distance[u])) continue;
        graph[u].forEach((e, index) => {
          if (e.cap > 1e-8 && distance[e.to] > distance[u] + e.cost + 1e-8) { distance[e.to] = distance[u] + e.cost; prev[e.to] = [u, index]; changed = true; }
        });
      }
      if (!changed) break;
    }
    if (!Number.isFinite(distance[finish]) || distance[finish] >= -1e-8) break;
    let amount = Infinity;
    for (let v = finish; v !== start;) { if (!prev[v]) throw new Error('Не удалось построить маршрут.'); const [u, i] = prev[v]; amount = Math.min(amount, graph[u][i].cap); v = u; }
    for (let v = finish; v !== start;) { const [u, i] = prev[v], e = graph[u][i]; e.cap -= amount; graph[v][e.reverse].cap += amount; v = u; }
  }
  const routes = candidates.map(e => ({ ...e.meta, volume: Math.max(0, e.initial - e.cap) })).filter(r => r.volume > 1e-6).map(r => ({ ...r, id: `${r.source}-${r.consumer}-${r.treatment ? 'filter' : 'direct'}`, dailySaving: r.volume * (settings.freshTariff + settings.dischargeTariff - r.unitCost) }));
  const demand = consumers.reduce((a, d) => a + d.demand, 0), available = sources.reduce((a, s) => a + s.volume, 0);
  const reused = routes.reduce((a, r) => a + r.volume, 0), treatmentCost = routes.reduce((a, r) => a + r.volume * r.unitCost, 0);
  const fresh = demand - reused, discharge = available - reused;
  const baselineCost = demand * settings.freshTariff + available * settings.dischargeTariff;
  const scenarioCost = fresh * settings.freshTariff + discharge * settings.dischargeTariff + treatmentCost;
  const dailySaving = baselineCost - scenarioCost, annualSaving = dailySaving * settings.operatingDays;
  return { routes, consumers, demand, available, reused, fresh, discharge, treatmentCost, baselineCost, scenarioCost, dailySaving, annualSaving, annualVolume: reused * settings.operatingDays, share: reused / demand * 100, paybackMonths: annualSaving > 0 ? settings.capex / annualSaving * 12 : null };
}
export function parseSourcesCSV(text, fallback = DEMO_SOURCES) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (lines.length < 2 || lines.length > 31) throw new Error('Нужны заголовок и от 1 до 30 источников.');
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(s => s.trim());
  const required = ['id', 'name', 'volume', 'ph', 'tds', 'temp', 'oil'];
  if (required.some(k => !headers.includes(k))) throw new Error('Нужны столбцы: id;name;volume;ph;tds;temp;oil. Скачайте шаблон.');
  const result = lines.slice(1).filter(s => s.trim()).map((line, i) => {
    const values = line.split(sep).map(s => s.trim());
    if (values.length !== headers.length) throw new Error(`Строка ${i + 2}: неверное количество столбцов. Используйте шаблон без разделителей внутри названий.`);
    const raw = Object.fromEntries(headers.map((h, j) => [h, values[j]]));
    const old = fallback.find(s => s.id === raw.id);
    const s = { id: raw.id, name: raw.name, area: raw.area || old?.area || 'Импорт CSV', color: old?.color || ['#2489d5', '#24a99c', '#8e80d5', '#d59c3f'][i % 4] };
    for (const k of ['volume', 'ph', 'tds', 'temp', 'oil']) { if (!raw[k]) throw new Error(`Строка ${i + 2}: пустое поле ${k}.`); s[k] = Number(raw[k].replace(',', '.')); }
    s.transferCost = raw.transferCost !== undefined && raw.transferCost !== '' ? Number(raw.transferCost.replace(',', '.')) : old?.transferCost ?? 6;
    validateSource(s); return s;
  });
  if (!result.length || new Set(result.map(s => s.id)).size !== result.length) throw new Error('Источники должны иметь уникальные ID.');
  return result;
}
