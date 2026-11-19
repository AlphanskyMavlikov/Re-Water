import { DEMO_SOURCES, CONSUMERS, DEFAULT_SETTINGS, clone, optimize, qualityChecks, parseSourcesCSV, validateSource, validateSettings } from './model.mjs';

const $ = s => document.querySelector(s);
const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const number = (n, decimals = 0) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: decimals });
const money = n => n >= 1e6 ? `${number(n / 1e6, 1)} млн ₸` : `${number(n)} ₸`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  flows: '<path d="M4 6h6c4 0 2 12 6 12h4M4 18h5c4 0 3-12 7-12h4"/><circle cx="3" cy="6" r="1.5"/><circle cx="3" cy="18" r="1.5"/><circle cx="21" cy="6" r="1.5"/><circle cx="21" cy="18" r="1.5"/>',
  sliders: '<path d="M4 6h7m5 0h4M4 12h2m5 0h9M4 18h10m5 0h1"/><circle cx="13.5" cy="6" r="2.5"/><circle cx="8.5" cy="12" r="2.5"/><circle cx="16.5" cy="18" r="2.5"/>',
  spark: '<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3ZM20 2v4m-2-2h4"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
  chart: '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
  leaf: '<path d="M20 3c-8-1-15 2-15 9a7 7 0 0 0 7 7c7 0 8-9 8-16ZM4 21l11-11"/>',
  drop: '<path d="M12 2C9 7 5 10 5 15a7 7 0 0 0 14 0c0-5-4-8-7-13Z"/><path d="M8 15c0 2 1 3 3 3"/>',
  down: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  factory: '<path d="M3 21V9l6 4V9l6 4V3h4l2 18H3ZM6 17h1m4 0h1m4 0h1"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 5V2m0 7v5l3 2"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
  shield: '<path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 16v5h16v-5"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
const pages = [ ['overview', 'Обзор', 'grid'], ['flows', 'Водные потоки', 'flows'], ['scenarios', 'Сценарии', 'sliders'], ['recommendations', 'Рекомендации', 'spark'], ['economics', 'Экономика', 'chart'], ['data', 'Данные предприятия', 'database'] ];
let state = { page: 'overview', settings: clone(DEFAULT_SETTINGS), sources: clone(DEMO_SOURCES), saved: [], view: 'after', period: '30' };
try {
  const cached = JSON.parse(localStorage.getItem('rewater-hackathon-v1'));
  if (cached?.version === 1) {
    if (cached.sources?.length && cached.sources.length <= 30) { cached.sources.forEach(validateSource); state.sources = cached.sources; }
    if (cached.settings) { validateSettings(cached.settings); state.settings = { ...DEFAULT_SETTINGS, ...cached.settings, blocked: Array.isArray(cached.settings.blocked) ? cached.settings.blocked : [] }; }
    if (Array.isArray(cached.saved)) state.saved = cached.saved.slice(0, 12);
  }
} catch { /* Безопасное восстановление демо, если данные браузера повреждены. */ }
let result = optimize(state.sources, state.settings), toastTimer;
function persist() { try { localStorage.setItem('rewater-hackathon-v1', JSON.stringify({ version: 1, sources: state.sources, settings: state.settings, saved: state.saved })); } catch { toast('Хранилище браузера недоступно. Изменения действуют до закрытия страницы.'); } }
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4300); }
function navigate(page) { if (![...pages.map(p => p[0]), 'about'].includes(page)) return; state.page = page; location.hash = page; render(); window.scrollTo({ top: 0, behavior: 'instant' }); }
function refresh(message) { result = optimize(state.sources, state.settings); persist(); render(); if (message) toast(message); }
const tag = (text, kind = '') => `<span class="tag ${kind}">${text}</span>`;
const button = (text, action, style = 'secondary', ico = '') => `<button class="button ${style}" data-action="${action}">${ico ? icon(ico) : ''}${text}</button>`;
const input = (label, name, value, suffix, min = 0, max = 10000, step = 1) => `<label class="field"><span>${label}</span><span class="input-wrap"><input name="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" required><span>${suffix}</span></span></label>`;

function sidebar() {
  return `<aside class="sidebar"><a class="brand" href="#overview" aria-label="Re:Water — обзор"><span class="brand-mark">${icon('drop')}</span><span>Re<span class="brand-colon">:</span>Water<small>INDUSTRIAL INTELLIGENCE</small></span></a>
    <div class="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div><nav aria-label="Основная навигация">${pages.map(([id, name, ico]) => `<a href="#${id}" class="nav-link ${state.page === id ? 'active' : ''}" ${state.page === id ? 'aria-current="page"' : ''}>${icon(ico)}<span>${name}</span>${id === 'recommendations' ? `<span class="nav-count">${result.routes.length}</span>` : ''}</a>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="impact-note">${icon('leaf')}<strong>Каждый поток<br>имеет значение.</strong><p>Ресурсам — вторую жизнь.<br>Промышленности — новый подход.</p></div><a class="nav-link ${state.page === 'about' ? 'active' : ''}" href="#about">${icon('info')}<span>О проекте и методике</span></a><div class="sidebar-profile"><span class="avatar">RW</span><span><strong>Команда Re:Water</strong><small>Prototype · v1.0</small></span></div></div></aside>`;
}
function shell(content) {
  const name = pages.find(p => p[0] === state.page)?.[1] || 'О проекте';
  return `${sidebar()}<div class="workspace"><header class="topbar"><div class="breadcrumb">Рабочее пространство <span>/</span> <strong>${name}</strong></div><div class="header-actions">${tag('Демо-режим', 'demo')}<button class="button text" data-page="about">${icon('info')}Методика расчета</button><span class="header-divider"></span><span class="avatar small">RW</span></div></header><main id="main" tabindex="-1">${content}<footer class="main-footer"><span>Re:Water · устойчивость начинается с данных</span><span>Расчетная модель · демонстрационное предприятие</span></footer></main></div>`;
}
function pageHeader(title, subtitle, actions = '') { return `<div class="page-heading"><div><p class="eyebrow">RE:WATER / ${esc(pages.find(p => p[0] === state.page)?.[1]?.toUpperCase() || 'ПРОЕКТ')}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`; }
function kpis() {
  return `<div class="kpi-grid">
  <article class="kpi"><div class="kpi-top">Забор свежей воды ${icon('drop')}</div><div class="kpi-value">${number(result.fresh)}<span>м³/сут</span></div><div class="kpi-bottom"><span class="metric-change">−${number(result.share, 1)}%</span><span>к сценарию без возврата</span></div></article>
  <article class="kpi"><div class="kpi-top">Повторное использование ${icon('flows')}</div><div class="kpi-value">${number(result.reused)}<span>м³/сут</span></div><div class="kpi-bottom"><span class="tiny-line"><i style="width:${result.share}%"></i></span><span>${number(result.share, 1)}% потребности</span></div></article>
  <article class="kpi"><div class="kpi-top">Расчетная экономия ${icon('chart')}</div><div class="kpi-value">${number(result.annualSaving / 1e6, 1)}<span>млн ₸/год</span></div><div class="kpi-bottom"><span class="metric-change">${state.settings.operatingDays} дней</span><span>работы в год</span></div></article>
  <article class="kpi"><div class="kpi-top">Окупаемость проекта ${icon('timer')}</div><div class="kpi-value">${result.paybackMonths === null ? '—' : number(result.paybackMonths, 1)}<span>мес.</span></div><div class="kpi-bottom"><span>Инвестиции: ${money(state.settings.capex)}</span></div></article></div>`;
}
function network(compact = false) {
  const sources = state.sources.slice(0, compact ? 4 : 30), rows = Math.max(4, sources.length), height = 70 + rows * 100;
  const offsetY = index => 66 + index * 100;
  const posY = index => 66 + index * (rows - 1) * 100 / 3;
  const after = state.view === 'after';
  const rendered = result.routes.filter(r => sources.some(s => s.id === r.source));
  const pathsSVG = after ? rendered.map(r => {
    const source = state.sources.find(s => s.id === r.source), si = sources.findIndex(s => s.id === r.source), di = result.consumers.findIndex(d => d.id === r.consumer);
    return `<path class="water-path" d="M288 ${offsetY(si) + 25} C430 ${offsetY(si) + 25}, 550 ${posY(di) + 25}, 712 ${posY(di) + 25}" fill="none" stroke="${source.color}" stroke-opacity=".25" stroke-width="${Math.max(3, Math.min(22, r.volume / 20))}"><title>${esc(source.name)} → ${esc(result.consumers[di].name)}: ${number(r.volume)} м³/сут, ${r.treatment ? 'с подготовкой' : 'прямой возврат'}</title></path><path d="M288 ${offsetY(si) + 25} C430 ${offsetY(si) + 25}, 550 ${posY(di) + 25}, 712 ${posY(di) + 25}" fill="none" stroke="${source.color}" stroke-opacity=".7" stroke-width="1.5"/>`;
  }).join('') : `<path d="M290 92C470 92 540 392 710 392" class="inactive-path"/><path d="M290 392C460 392 550 92 710 92" class="inactive-path"/>`;
  return `<div class="network-scroll ${compact ? 'compact' : ''}"><svg class="network" viewBox="0 0 1000 ${height}" role="img" aria-label="Карта потоков. ${after ? 'Рассчитанные маршруты повторного использования' : 'Исходный сценарий без возврата воды'}"><text x="27" y="25" class="network-heading">ВТОРИЧНЫЕ ИСТОЧНИКИ</text><text x="722" y="25" class="network-heading">ПРОИЗВОДСТВЕННЫЕ ПРОЦЕССЫ</text>${pathsSVG}
  ${sources.map((s, i) => `<g class="network-node" data-action="source" data-id="${esc(s.id)}" role="button" tabindex="0" aria-label="Открыть источник ${esc(s.name)}"><rect x="24" y="${offsetY(i) - 10}" width="264" height="76" rx="12" fill="white" stroke="#dce6ec"/><rect x="24" y="${offsetY(i) + 7}" width="3" height="40" rx="1.5" fill="${s.color}"/><circle cx="49" cy="${offsetY(i) + 13}" r="5" fill="${s.color}"/><text x="64" y="${offsetY(i) + 20}" class="network-name">${esc(s.name.length > 22 ? s.name.slice(0, 21) + '…' : s.name)}</text><text x="44" y="${offsetY(i) + 47}" class="network-volume">${number(s.volume)} м³/сут</text><text x="267" text-anchor="end" y="${offsetY(i) + 47}" class="network-secondary">${number(s.temp, 1)} °C</text></g>`).join('')}
  ${result.consumers.map((d, i) => { const reused = after ? result.routes.filter(r => r.consumer === d.id).reduce((sum, r) => sum + r.volume, 0) : 0; return `<g><rect x="712" y="${posY(i) - 10}" width="264" height="76" rx="12" fill="white" stroke="#dce6ec"/><text x="732" y="${posY(i) + 20}" class="network-name">${esc(d.short)}</text><text x="732" y="${posY(i) + 47}" class="network-volume">${number(reused)} / ${number(d.demand)} м³</text><rect x="732" y="${posY(i) + 56}" width="220" height="3" rx="1.5" fill="#edf3f5"/><rect x="732" y="${posY(i) + 56}" width="${220 * reused / d.demand}" height="3" rx="1.5" fill="#24a99c"/></g>`; }).join('')}
  <rect x="418" y="${height / 2 - 13}" width="164" height="66" rx="33" fill="${after ? '#e5f5ef' : '#f0f3f5'}" stroke="${after ? '#bee6d6' : '#dce6ec'}"/><text x="500" y="${height / 2 + 14}" text-anchor="middle" class="network-total">${number(after ? result.reused : 0)} м³</text><text x="500" y="${height / 2 + 34}" text-anchor="middle" class="network-secondary">${after ? 'возврат в сутки' : 'нет возврата'}</text></svg></div>`;
}
function viewToggle() { return `<div class="segmented" aria-label="Сценарий карты"><button data-action="view-before" class="${state.view === 'before' ? 'selected' : ''}" aria-pressed="${state.view === 'before'}">До</button><button data-action="view-after" class="${state.view === 'after' ? 'selected' : ''}" aria-pressed="${state.view === 'after'}">После</button></div>`; }
function overview() {
  return `${pageHeader('Вода работает.<br><span class="heading-soft">Теперь — эффективнее.</span>', 'Увидеть потери. Найти возможности. Замкнуть водный цикл.', button('Экспорт отчета', 'report', 'secondary', 'down'))}
  <div class="plant-line"><div class="plant-name">${icon('factory')}<span>Демо-предприятие «Металлургия»</span>${tag('Темиртау', 'neutral')}</div><button class="inline-button" data-page="data">Параметры предприятия ${icon('sliders')}</button></div>
  ${kpis()}
  <div class="overview-grid"><section class="panel balance-panel"><div class="panel-header"><div><h2>У воды есть следующий маршрут</h2><p>Расчетная карта повторного использования</p></div>${viewToggle()}</div>${network(true)}<div class="panel-legend"><span><i class="legend-line blue"></i>Вторичная вода</span><span><i class="legend-line teal"></i>Совместимость проверена</span><button class="inline-button" data-page="flows">Открыть карту ${icon('flows')}</button></div></section>
  <aside class="opportunity-panel"><span class="spark-badge">${icon('spark')}</span><p class="eyebrow">РЕКОМЕНДАЦИЯ RE:WATER</p><h2>Не больше ресурсов.<br>Больше оборота.</h2><p>В вашей модели можно вернуть в производство <strong>${number(result.reused)} м³ воды в сутки</strong> с учетом объема и требований качества.</p><div class="opportunity-stat"><span>${number(result.share, 1)}<small>%</small></span><p>потребности может покрыть<br>повторное использование</p></div>${button('Исследовать сценарий', 'open-scenarios', 'mint', 'sliders')}<div class="model-note">${icon('info')}<span>Демо-расчет по правилам.<br>Требует проверки инженером.</span></div></aside></div>
  <div class="bottom-grid"><section class="panel trend-panel"><div class="panel-header"><div><h2>Меньше забора — каждый день</h2><p>Сравнение расчетных профилей потребления</p></div><select id="period" aria-label="Период графика"><option value="7" ${state.period === '7' ? 'selected' : ''}>7 дней</option><option value="30" ${state.period === '30' ? 'selected' : ''}>30 дней</option><option value="90" ${state.period === '90' ? 'selected' : ''}>90 дней</option></select></div>${trendChart()}<div class="chart-legend"><span><i class="legend-line light"></i>Без возврата</span><span><i class="legend-line teal"></i>Ваш сценарий</span><span class="small-muted">м³/сут · модельный профиль</span></div></section>
  <section class="panel shortlist"><div class="panel-header"><div><h2>Точки роста</h2><p>Где начать улучшения</p></div>${icon('leaf')}</div>${sourceInsights().slice(0, 3).map((s, i) => `<button class="insight-row" data-action="source" data-id="${esc(s.id)}"><span class="insight-icon ${i === 1 ? 'lilac' : ''}">${icon(i === 1 ? 'timer' : 'drop')}</span><span><strong>${esc(s.name)}</strong><small>${number(s.used)} м³/сут можно вернуть</small></span>${icon('chevron')}</button>`).join('') || '<p class="empty">Для заданных ограничений выгодных маршрутов нет. Измените параметры сценария.</p>'}<button class="inline-button" data-page="recommendations">Все рекомендации</button></section></div>`;
}
function trendChart() {
  const count = Number(state.period), ticks = 7, width = 720, height = 210, plotTop = 20, plotBottom = 175, max = Math.max(result.demand * 1.18, 1);
  const values = Array.from({ length: 15 }, (_, i) => 1 + Math.sin(i * 1.43) * 0.035 + Math.cos(i * .8) * .025);
  const path = volume => values.map((factor, i) => `${i ? 'L' : 'M'}${52 + i * 45},${plotBottom - volume * factor / max * (plotBottom - plotTop)}`).join(' ');
  const green = path(result.fresh);
  return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Сравнение потребления свежей воды до и после оптимизации. Расчетный профиль, не фактические измерения."><defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27aa9a" stop-opacity=".18"/><stop offset="1" stop-color="#27aa9a" stop-opacity="0"/></linearGradient></defs>${[0, 1, 2, 3].map(i => { const y = plotTop + i * (plotBottom - plotTop) / 3; return `<line x1="52" x2="686" y1="${y}" y2="${y}" stroke="#edf1f4" stroke-dasharray="4 5"/><text x="40" y="${y + 4}" text-anchor="end" class="axis-label">${number(max * (3 - i) / 3)}</text>`; }).join('')}<path d="${green} L682,175 L52,175Z" fill="url(#trend-fill)"/><path d="${path(result.demand)}" fill="none" stroke="#b2c2cc" stroke-width="2" stroke-dasharray="5 6"/><path d="${green}" fill="none" stroke="#209e91" stroke-width="3" stroke-linejoin="round"/>${Array.from({ length: ticks }, (_, i) => `<text x="${52 + i * 105}" y="201" text-anchor="middle" class="axis-label">${1 + Math.round(i * (count - 1) / (ticks - 1))} день</text>`).join('')}</svg></div>`;
}
function sourceInsights() {
  return state.sources.map(s => ({ ...s, used: result.routes.filter(r => r.source === s.id).reduce((a, r) => a + r.volume, 0), saving: result.routes.filter(r => r.source === s.id).reduce((a, r) => a + r.dailySaving, 0) })).filter(s => s.used > 0).sort((a, b) => b.saving - a.saving);
}
function flows() {
  return `${pageHeader('Потоки связаны.<br><span class="heading-soft">Возможности — тоже.</span>', 'Исследуйте источники, назначения и ограничения каждого маршрута.', button('Изменить исходные данные', 'open-data', 'secondary', 'edit'))}
  <div class="stat-strip"><div><span>Потребность процессов</span><strong>${number(result.demand)} <small>м³/сут</small></strong></div><div><span>Доступные вторичные потоки</span><strong>${number(result.available)} <small>м³/сут</small></strong></div><div><span>Возврат в сценарии</span><strong>${number(result.reused)} <small>м³/сут</small></strong></div><div><span>Отведение после возврата</span><strong>${number(result.discharge)} <small>м³/сут</small></strong></div></div>
  <section class="panel"><div class="panel-header"><div><h2>Цифровая карта водного цикла</h2><p>Выберите источник, чтобы изучить параметры и назначения</p></div>${viewToggle()}</div>${network()}<div class="panel-legend"><span>Линии показывают рассчитанный объем возврата</span><span>${state.settings.treatment ? 'Подготовка разрешена' : 'Только прямое использование'}</span></div></section>
  <section class="panel table-panel"><div class="panel-header"><div><h2>Рассчитанные маршруты</h2><p>Каждая связь проверена по четырем показателям качества</p></div>${tag(`${result.routes.length} маршрутов`, 'success')}</div><div class="table-scroll"><table><thead><tr><th>Источник</th><th>Назначение</th><th>Подготовка</th><th>Объем, м³/сут</th><th>Экономия, ₸/сут</th><th>Проверка</th></tr></thead><tbody>${result.routes.map(r => `<tr><td>${esc(state.sources.find(s => s.id === r.source).name)}</td><td>${esc(CONSUMERS.find(d => d.id === r.consumer).name)}</td><td>${r.treatment ? 'Фильтрация + охлаждение' : 'Прямой возврат'}</td><td class="numeric">${number(r.volume)}</td><td class="numeric">${number(r.dailySaving)}</td><td><button class="table-button" data-action="route" data-id="${r.id}">Почему подходит</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Нет допустимых экономически выгодных маршрутов. Проверьте тарифы, источники и ограничения.</td></tr>'}</tbody></table></div></section>`;
}
function settingsForm() {
  return `<form id="scenario-form"><div class="form-section-title">Производственный сценарий</div><label class="field range-field"><span>Загрузка производства <strong id="load-label">${number(state.settings.demandFactor * 100)}%</strong></span><input type="range" name="demandPercent" min="50" max="150" step="5" value="${state.settings.demandFactor * 100}"><span class="range-labels"><span>50%</span><span>Базовая — 100%</span><span>150%</span></span></label>
  <label class="field"><span>Доступная инфраструктура</span><select name="treatment"><option value="direct" ${!state.settings.treatment ? 'selected' : ''}>Прямой возврат</option><option value="treatment" ${state.settings.treatment ? 'selected' : ''}>Возврат с водоподготовкой</option></select></label>
  <div class="form-section-title">Экономические параметры</div><div class="field-grid">${input('Свежая вода', 'freshTariff', state.settings.freshTariff, '₸/м³', 0, 10000, 0.1)}${input('Водоотведение', 'dischargeTariff', state.settings.dischargeTariff, '₸/м³', 0, 10000, 0.1)}</div>${input('Рабочие дни', 'operatingDays', state.settings.operatingDays, 'дн./год', 1, 366)}${input('Инвестиции в сценарий', 'capex', state.settings.capex, '₸', 0, 10000000000, 1000)}<button class="button primary full" type="submit">${icon('spark')}Рассчитать сценарий</button><p class="field-help">Тарифы и инвестиции — учебные допущения. Можно изменить под предприятие.</p></form>`;
}
function scenarios() {
  return `${pageHeader('Проверить идею.<br><span class="heading-soft">До первого вложения.</span>', 'Меняйте параметры и сравнивайте результат с исходным водным балансом.', button('Сохранить сценарий', 'save-scenario', 'secondary', 'plus'))}
  <div class="preset-row"><button data-action="preset-direct" class="preset"><span class="preset-icon">${icon('flows')}</span><span><strong>Быстрый старт</strong><small>Прямое повторное использование</small></span></button><button data-action="preset-treatment" class="preset"><span class="preset-icon lilac">${icon('sliders')}</span><span><strong>Глубокий оборот</strong><small>Дополнительная водоподготовка</small></span></button><button data-action="preset-load" class="preset"><span class="preset-icon amber">${icon('factory')}</span><span><strong>Рост производства</strong><small>Потребность выше на 25%</small></span></button></div>
  <div class="scenario-layout"><section class="panel form-panel">${settingsForm()}</section><div><section class="panel result-panel"><div class="panel-header"><div><p class="eyebrow">РЕЗУЛЬТАТ МОДЕЛИ</p><h2>Ваш сценарий в цифрах</h2></div>${tag('Расчет выполнен', 'success')}</div><div class="scenario-big"><span>${number(result.share, 1)}<small>%</small></span><p>снижение забора свежей воды<br>при заданных ограничениях</p></div><div class="compare-bars">${compareBar('Свежая вода', result.demand, result.fresh, 'м³/сут')}${compareBar('Водоотведение', result.available, result.discharge, 'м³/сут')}${compareBar('Операционные затраты', result.baselineCost, result.scenarioCost, '₸/сут')}</div><div class="scenario-result-footer"><div><span>Экономия за год</span><strong>${money(result.annualSaving)}</strong></div><div><span>Простая окупаемость</span><strong>${result.paybackMonths === null ? 'Нет экономии' : number(result.paybackMonths, 1) + ' мес.'}</strong></div></div></section><div class="explain-note">${icon('shield')}<p>Маршруты ограничены объемом источников, потребностью участков, долей допустимого возврата и качеством воды. Экономически невыгодные соединения исключаются.</p></div></div></div>
  <section class="panel saved-panel"><div class="panel-header"><div><h2>Сохраненные сценарии</h2><p>Хранятся в этом браузере, вместе с исходными данными</p></div>${tag(`${state.saved.length} из 12`, 'neutral')}</div>${state.saved.length ? `<div class="saved-grid">${state.saved.map((s, i) => `<article class="saved-card"><h3>${esc(s.name)}</h3><p>${s.settings.treatment ? 'С водоподготовкой' : 'Прямой возврат'} · нагрузка ${number(s.settings.demandFactor * 100)}%</p><strong>${money(s.result.annualSaving)}<small>/год</small></strong><div><button class="table-button" data-action="restore-scenario" data-index="${i}">Загрузить</button><button class="table-button danger-text" data-action="remove-scenario" data-index="${i}">Удалить</button></div></article>`).join('')}</div>` : '<div class="empty-state">' + icon('sliders') + '<h3>Первый сценарий начинается с вопроса «а что, если?»</h3><p>Настройте расчет и сохраните результат для сравнения.</p></div>'}</section>`;
}
function compareBar(label, before, after, unit) { return `<div class="compare-item"><div class="compare-label"><strong>${label}</strong><span>${number(before)} <span class="small-muted">→</span> <b>${number(after)}</b> ${unit}</span></div><div class="bar-track"><span class="bar-baseline"></span><span class="bar-result" style="width:${before ? Math.max(0, Math.min(100, after / before * 100)) : 0}%"></span></div></div>`; }
function recommendations() {
  return `${pageHeader('Возможности,<br><span class="heading-soft">которые можно объяснить.</span>', 'Каждая рекомендация опирается на объем, качество и экономику потока.', button('Параметры модели', 'open-scenarios', 'secondary', 'sliders'))}
  <div class="notice">${icon('spark')}<div><strong>Объяснимые рекомендации · демо-режим</strong><p>Здесь работает расчетная модель, а не обученная нейросеть. Оценки помогают подготовить инженерное решение, но не заменяют его проверку.</p></div></div>
  <div class="recommendation-grid">${state.sources.map(s => { const routes = result.routes.filter(r => r.source === s.id), used = routes.reduce((a, r) => a + r.volume, 0), saving = routes.reduce((a, r) => a + r.dailySaving, 0), blocked = state.settings.blocked.includes(s.id); return `<article class="panel recommendation-card"><div class="rec-top"><span class="rec-symbol" style="--source:${s.color}">${icon('drop')}</span>${tag(blocked ? 'Исключен из расчета' : used ? 'Есть подходящие маршруты' : 'Нет выгодного назначения', blocked ? 'neutral' : used ? 'success' : 'amber')}</div><p class="eyebrow">${esc(s.area)}</p><h2>${esc(s.name)}</h2><p>${used ? `Вернуть ${number(used)} из ${number(s.volume)} м³/сут: ${routes.map(r => esc(CONSUMERS.find(d => d.id === r.consumer).short.toLowerCase())).join(', ')}.` : blocked ? 'Источник выключен из сценария. Включите его, чтобы проверить доступные назначения.' : 'При текущих ограничениях источник не используется. Проверьте качество, загрузку и настройки водоподготовки.'}</p><div class="rec-metrics"><div><span>Возврат</span><strong>${number(used)} <small>м³/сут</small></strong></div><div><span>Экономия</span><strong>${money(saving * state.settings.operatingDays)}<small>/год</small></strong></div></div><div class="quality-mini"><span>pH <b>${number(s.ph, 1)}</b></span><span>TDS <b>${number(s.tds)}</b></span><span>t <b>${number(s.temp, 1)} °C</b></span></div><div class="rec-actions"><button class="button secondary" data-action="source" data-id="${esc(s.id)}">Объяснение</button><button class="button ${blocked ? 'primary' : 'text'}" data-action="toggle-source" data-id="${esc(s.id)}">${blocked ? 'Включить источник' : 'Исключить'}</button></div></article>`; }).join('')}</div>`;
}
function economics() {
  const annualFresh = result.reused * state.settings.freshTariff * state.settings.operatingDays;
  const annualDischarge = result.reused * state.settings.dischargeTariff * state.settings.operatingDays;
  const annualCosts = result.treatmentCost * state.settings.operatingDays;
  return `${pageHeader('Устойчивость,<br><span class="heading-soft">выраженная в цифрах.</span>', 'Прозрачный расчет без двойного учета экономии.', button('Экспорт отчета', 'report', 'secondary', 'down'))}${kpis()}
  <div class="economics-layout"><section class="panel"><div class="panel-header"><div><h2>Из чего складывается эффект</h2><p>За ${state.settings.operatingDays} рабочих дней</p></div>${tag('₸ / год', 'neutral')}</div><div class="economic-lines"><div><span><i class="econ-dot blue"></i>Снижение затрат на свежую воду</span><strong>+ ${money(annualFresh)}</strong></div><div><span><i class="econ-dot teal"></i>Снижение затрат на водоотведение</span><strong>+ ${money(annualDischarge)}</strong></div><div><span><i class="econ-dot amber"></i>Перенаправление и водоподготовка</span><strong>− ${money(annualCosts)}</strong></div><div class="economic-total"><span>Чистая операционная экономия</span><strong>${money(result.annualSaving)}</strong></div></div><div class="formula-note">Экономия = предотвращенные расходы на воду и стоки − затраты на возврат. Инвестиции учитываются отдельно, в расчете окупаемости.</div></section><aside class="panel impact-card"><span class="impact-icon">${icon('leaf')}</span><p class="eyebrow">РЕСУРСНЫЙ ЭФФЕКТ</p><strong>${number(result.annualVolume)}</strong><span>м³ свежей воды в год<br>можно сохранить в этой модели</span><div class="impact-scale"><span style="width:${result.share}%"></span></div><p>Цели устойчивого развития<br><b>6 · 9 · 12</b></p></aside></div>
  <section class="panel table-panel"><div class="panel-header"><div><h2>Допущения, которые можно проверить</h2><p>Расчетный результат не является подтвержденной экономией предприятия</p></div><button class="inline-button" data-page="scenarios">Изменить параметры</button></div><div class="assumptions-grid"><div><span>Свежая вода</span><strong>${number(state.settings.freshTariff, 1)} ₸/м³</strong></div><div><span>Водоотведение</span><strong>${number(state.settings.dischargeTariff, 1)} ₸/м³</strong></div><div><span>Инвестиции</span><strong>${money(state.settings.capex)}</strong></div><div><span>Рабочие дни</span><strong>${state.settings.operatingDays} в год</strong></div></div><p class="panel-description">Простая окупаемость = инвестиции / годовая операционная экономия × 12. Налоги, дисконтирование, финансирование, изменение тарифов и стоимость лабораторных исследований отдельно не учитываются.</p></section>`;
}
function dataPage() {
  return `${pageHeader('Хорошие решения<br><span class="heading-soft">начинаются с данных.</span>', 'Редактируйте демонстрационные источники или загрузите свой CSV.', `<div class="button-row">${button('Шаблон CSV', 'template', 'secondary', 'down')}${button('Импорт CSV', 'import', 'primary', 'upload')}</div>`)}
  <div class="notice neutral">${icon('database')}<div><strong>Локальное рабочее пространство</strong><p>Данные сохраняются только в вашем браузере и не отправляются на сервер. CSV заменяет список источников; потребители остаются демонстрационными.</p></div></div>
  <section class="panel table-panel"><div class="panel-header"><div><h2>Источники вторичной воды</h2><p>Фиксированный суточный срез · объем и результаты условного анализа</p></div>${tag(`${state.sources.length} источника`, 'neutral')}</div><div class="table-scroll"><table><thead><tr><th>Источник</th><th>Объем, м³/сут</th><th>pH</th><th>TDS, мг/л</th><th>Темп., °C</th><th>Нефтепр., мг/л</th><th></th></tr></thead><tbody>${state.sources.map(s => `<tr><td><span class="source-label"><i style="background:${s.color}"></i><span><strong>${esc(s.name)}</strong><small>${esc(s.area)}</small></span></span></td><td>${number(s.volume)}</td><td>${number(s.ph, 1)}</td><td>${number(s.tds)}</td><td>${number(s.temp, 1)}</td><td>${number(s.oil, 2)}</td><td><button class="icon-button" data-action="edit-source" data-id="${esc(s.id)}" aria-label="Изменить ${esc(s.name)}">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div></section>
  <section class="panel table-panel"><div class="panel-header"><div><h2>Требования производственных процессов</h2><p>Учебные ограничения качества, не нормативные значения</p></div>${icon('shield')}</div><div class="table-scroll"><table><thead><tr><th>Процесс</th><th>Потребность, м³/сут</th><th>Макс. доля возврата</th><th>pH</th><th>Макс. TDS</th><th>Макс. темп.</th><th>Макс. нефтепр.</th></tr></thead><tbody>${result.consumers.map(d => `<tr><td>${esc(d.name)}</td><td>${number(d.demand)}</td><td>${number(d.reuseCap * 100)}%</td><td>${d.phMin}–${d.phMax}</td><td>${d.tdsMax} мг/л</td><td>${d.tempMax} °C</td><td>${d.oilMax} мг/л</td></tr>`).join('')}</tbody></table></div></section><div class="data-bottom"><p>CSV: id;name;volume;ph;tds;temp;oil;transferCost;area. Дробные значения в файле с «;» можно записывать через точку или запятую.</p>${button('Восстановить демо-данные', 'reset', 'secondary', 'reset')}</div>`;
}
function about() {
  return `${pageHeader('Производить больше.<br><span class="heading-soft">Потреблять меньше.</span>', 'Re:Water — прототип интеллектуального планирования промышленного водопользования.')}
  <section class="about-hero"><span class="about-mark">${icon('drop')}</span><div><p class="eyebrow">НАША МИССИЯ</p><h2>У воды может быть<br>не одна жизнь.</h2><p>Соединяем производственные данные с понятным планом действий. Вместо еще одного экрана мониторинга — объяснимые маршруты повторного использования и экономика каждого решения.</p></div></section>
  <div class="method-grid"><article class="panel"><span class="method-icon">${icon('database')}</span><h2>Данные</h2><p>Объемы источников, pH, минерализация, температура и нефтепродукты. Исходные значения можно редактировать и импортировать из CSV.</p></article><article class="panel"><span class="method-icon">${icon('flows')}</span><h2>Совместимость</h2><p>Сопоставление каждого потока с требованиями потребителей. Все четыре показателя должны соответствовать ограничениям.</p></article><article class="panel"><span class="method-icon">${icon('chart')}</span><h2>Решение</h2><p>Распределение доступных объемов с учетом экономии и пропускных ограничений. Положительный экономический эффект — условие включения маршрута.</p></article></div>
  <section class="panel prose-panel"><h2>Что уже работает в прототипе</h2><p>Карта потоков, оптимизация распределения, проверка качества, сценарии нагрузки, расчет затрат и простой окупаемости, сохранение сценариев в браузере, импорт источников из CSV и экспорт расчетного отчета. Все цифры основаны на демонстрационном наборе данных либо на введенных вами значениях.</p><h2>Как устроена модель</h2><p>Решается задача минимальной стоимости потока. Ограничения задают доступный объем источника и допустимый объем вторичной воды у потребителя. Стоимость маршрута включает перенаправление и, если выбрано, подготовку воды. Из нее вычитаются предотвращенные расходы на свежую воду и водоотведение. Доступные экономически выгодные маршруты распределяются с возможностью перерасчета назначений.</p><p>Режим водоподготовки — условная модель: TDS снижается на 35%, нефтепродукты на 90%, температура ограничивается 27 °C, pH не меняется. Дополнительная стоимость — 22 ₸/м³. Эти параметры иллюстрируют сценарий и не описывают производительность реальной установки.</p><p>Модель использует фиксированный суточный баланс, не рассчитывает гидравлику трубопроводов, динамику накопителей, потери при очистке и химические взаимодействия. График показывает синтетический профиль, а не прогноз нейросети. Перед внедрением нужны обследование, лабораторный анализ, проверка санитарных и технологических требований и согласование инженером.</p><h2>Следующий этап</h2><p>Подключение приборов учета и лабораторных данных, калибровка модели на предприятии, прогнозирование потребления, обнаружение аномалий, обработка ограничений инфраструктуры и ИИ-ассистент с доступом к проверенным данным. Живая нейросеть, автоматическое управление оборудованием и промышленная интеграция в текущей версии не подключены.</p></section>`;
}

function render() {
  $('#app').innerHTML = shell(({ overview, flows, scenarios, recommendations, economics, data: dataPage, about }[state.page] || overview)());
}
function modal(title, body, footer = '') {
  const d = $('#modal');
  d.innerHTML = `<div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Закрыть">${icon('close')}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ''}`;
  if (!d.open) d.showModal();
}
function routeDetail(id) {
  const r = result.routes.find(r => r.id === id); if (!r) return;
  const s = state.sources.find(s => s.id === r.source), d = CONSUMERS.find(d => d.id === r.consumer);
  modal('Почему этот маршрут подходит', `<p class="route-title">${esc(s.name)} <span>→</span> ${esc(d.name)}</p>${tag(r.treatment ? 'После условной подготовки' : 'Прямое использование', 'success')}<div class="check-list">${qualityChecks(s, d, r.treatment).map(c => `<div>${icon(c.ok ? 'check' : 'close')}<span>${c.name}</span><strong>${number(c.value, 2)} ${c.unit}</strong><small>Требование: ${c.limit} ${c.unit}</small></div>`).join('')}</div><div class="detail-metrics"><div><span>Объем</span><strong>${number(r.volume)} м³/сут</strong></div><div><span>Экономия</span><strong>${money(r.dailySaving)} /сут</strong></div></div><p class="field-help">Учтены ограничения доступного объема и допустимой доли возврата. Допустимость в модели не является разрешением на промышленное использование.</p>`, button('Понятно', 'close-modal', 'primary'));
}
function sourceDetail(id) {
  const s = state.sources.find(s => s.id === id); if (!s) return;
  const routes = result.routes.filter(r => r.source === id), used = routes.reduce((a, r) => a + r.volume, 0);
  modal(esc(s.name), `<p class="subtitle">${esc(s.area)} · ${number(s.volume)} м³/сут</p><div class="detail-metrics"><div><span>Возврат в сценарии</span><strong>${number(used)} м³/сут</strong></div><div><span>Остаток источника</span><strong>${number(s.volume - used)} м³/сут</strong></div></div><h3>Рекомендуемые назначения</h3>${routes.length ? routes.map(r => `<button class="source-route" data-action="route" data-id="${r.id}"><span><strong>${esc(CONSUMERS.find(d => d.id === r.consumer).name)}</strong><small>${r.treatment ? 'Фильтрация и охлаждение' : 'Прямой возврат'}</small></span><b>${number(r.volume)} м³</b>${icon('chevron')}</button>`).join('') : '<p>В этом сценарии выгодных допустимых назначений нет.</p>'}<h3>Что ограничивает прямое использование</h3>${CONSUMERS.map(d => { const fail = qualityChecks(s, d).filter(c => !c.ok); return `<p class="compat-line"><strong>${esc(d.short)}</strong><span>${fail.length ? fail.map(c => c.name.toLowerCase()).join(', ') + ' вне заданных пределов' : 'Качество подходит; объем зависит от распределения'}</span></p>`; }).join('')}`, `<button class="button secondary" data-action="edit-source" data-id="${esc(s.id)}">${icon('edit')}Изменить источник</button>${button('Закрыть', 'close-modal', 'primary')}`);
}
function editSource(id) {
  const s = state.sources.find(s => s.id === id); if (!s) return;
  modal('Параметры источника', `<form id="source-form" data-id="${esc(id)}"><label class="field"><span>Название</span><input name="name" maxlength="70" value="${esc(s.name)}" required></label><div class="field-grid">${input('Объем', 'volume', s.volume, 'м³/сут', 0, 100000, 0.1)}${input('pH', 'ph', s.ph, '', 0, 14, 0.1)}${input('Минерализация TDS', 'tds', s.tds, 'мг/л', 0, 100000, 0.1)}${input('Температура', 'temp', s.temp, '°C', 0, 100, 0.1)}${input('Нефтепродукты', 'oil', s.oil, 'мг/л', 0, 1000, 0.01)}${input('Перенаправление', 'transferCost', s.transferCost, '₸/м³', 0, 10000, 0.1)}</div><p class="field-help">Сохранение обновит водный баланс и все расчеты в приложении.</p><button class="button primary full" type="submit">Сохранить и пересчитать</button></form>`);
}
function download(name, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function exportTemplate() {
  const headers = ['id', 'name', 'volume', 'ph', 'tds', 'temp', 'oil', 'transferCost', 'area'];
  download('rewater-sources.csv', '\uFEFF' + [headers.join(';'), ...state.sources.map(s => headers.map(h => String(s[h]).replace(/[;\r\n]/g, ' ')).join(';'))].join('\r\n'), 'text/csv;charset=utf-8');
  toast('CSV скачан. Измените значения и загрузите файл обратно.');
}
function report() {
  const headers = 'Re:Water — расчетный отчет\nДемонстрационная модель. Не является инженерным заключением.\n';
  const text = `${headers}\nПотребность: ${number(result.demand)} м³/сут\nСвежая вода после возврата: ${number(result.fresh)} м³/сут\nПовторное использование: ${number(result.reused)} м³/сут (${number(result.share, 1)}%)\nОтведение после возврата: ${number(result.discharge)} м³/сут\nОперационная экономия: ${money(result.dailySaving)}/сут; ${money(result.annualSaving)}/год\nРабочие дни: ${state.settings.operatingDays}\nСвежая вода: ${state.settings.freshTariff} ₸/м³; водоотведение: ${state.settings.dischargeTariff} ₸/м³\nИнвестиции: ${money(state.settings.capex)}\nПростая окупаемость: ${result.paybackMonths === null ? 'не определена' : number(result.paybackMonths, 1) + ' мес.'}\n\nМАРШРУТЫ\n${result.routes.map(r => `${state.sources.find(s => s.id === r.source).name} → ${CONSUMERS.find(d => d.id === r.consumer).name}; ${number(r.volume)} м³/сут; ${r.treatment ? 'с подготовкой' : 'прямой возврат'}; экономия ${money(r.dailySaving)}/сут`).join('\n')}\n\nДОПУЩЕНИЯ\nФиксированный суточный баланс. Требования процессов учебные. Экономия включает предотвращенные расходы на свежую воду и стоки за вычетом затрат на возврат. Нет налогов, дисконтирования и расчета гидравлики. Подготовка: снижение TDS на 35%, нефтепродуктов на 90%, температура не выше 27 °C; 22 ₸/м³. Требуется проверка инженером.\n\nИСХОДНЫЕ ДАННЫЕ\n${JSON.stringify({ sources: state.sources, settings: state.settings }, null, 2)}`;
  download('ReWater-report.txt', '\uFEFF' + text); toast('Отчет с расчетами и исходными данными скачан.');
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action],[data-page]'); if (!el) return;
  if (el.dataset.page) { navigate(el.dataset.page); return; }
  const { action, id, index } = el.dataset;
  if (action === 'close-modal') { $('#modal').close(); }
  else if (action === 'source') sourceDetail(id);
  else if (action === 'route') routeDetail(id);
  else if (action === 'edit-source') editSource(id);
  else if (action === 'view-before' || action === 'view-after') { state.view = action === 'view-before' ? 'before' : 'after'; render(); }
  else if (action === 'open-scenarios') navigate('scenarios');
  else if (action === 'open-data') navigate('data');
  else if (action === 'toggle-source') { state.settings.blocked = state.settings.blocked.includes(id) ? state.settings.blocked.filter(s => s !== id) : [...state.settings.blocked, id]; refresh('Водный баланс пересчитан.'); }
  else if (action === 'preset-direct') { state.settings = { ...clone(DEFAULT_SETTINGS) }; refresh('Сценарий «Быстрый старт» рассчитан.'); }
  else if (action === 'preset-treatment') { state.settings = { ...clone(DEFAULT_SETTINGS), treatment: true, capex: 82000000 }; refresh('Сценарий с водоподготовкой рассчитан.'); }
  else if (action === 'preset-load') { state.settings = { ...clone(DEFAULT_SETTINGS), demandFactor: 1.25, capex: 30000000 }; refresh('Сценарий роста производства рассчитан.'); }
  else if (action === 'save-scenario') {
    if (state.saved.length >= 12) { toast('Можно сохранить до 12 сценариев. Удалите один из старых.'); return; }
    modal('Сохранить сценарий', '<form id="save-form"><label class="field"><span>Название</span><input name="scenarioName" maxlength="60" placeholder="Например, оборотное охлаждение" required autofocus></label><button class="button primary full" type="submit">Сохранить</button></form>');
  }
  else if (action === 'restore-scenario') { const s = state.saved[Number(index)]; if (s) { state.sources = clone(s.sources); state.settings = clone(s.settings); refresh('Сценарий и исходные данные восстановлены.'); } }
  else if (action === 'remove-scenario') { state.saved.splice(Number(index), 1); persist(); render(); toast('Сценарий удален из локального списка.'); }
  else if (action === 'template') exportTemplate();
  else if (action === 'import') $('#csv-file').click();
  else if (action === 'report') report();
  else if (action === 'reset') modal('Восстановить демонстрационные данные?', '<p>Источники и текущие параметры вернутся к исходным. Сохраненные сценарии останутся в списке.</p>', `${button('Отмена', 'close-modal', 'secondary')}${button('Восстановить', 'confirm-reset', 'primary')}`);
  else if (action === 'confirm-reset') { state.sources = clone(DEMO_SOURCES); state.settings = clone(DEFAULT_SETTINGS); $('#modal').close(); refresh('Демонстрационные данные восстановлены.'); }
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.network-node')) { e.preventDefault(); sourceDetail(e.target.dataset.id); } });
document.addEventListener('input', e => { if (e.target.name === 'demandPercent') $('#load-label').textContent = `${e.target.value}%`; });
document.addEventListener('change', async e => {
  if (e.target.id === 'period') { state.period = e.target.value; render(); }
  if (e.target.id === 'csv-file' && e.target.files[0]) {
    const file = e.target.files[0];
    try {
      if (file.size > 200000) throw new Error('Размер CSV не должен превышать 200 КБ.');
      const sources = parseSourcesCSV(await file.text());
      state.sources = sources; state.settings.blocked = []; refresh(`Импортировано источников: ${sources.length}. Все расчеты обновлены.`);
    } catch (error) { toast(error.message); }
    e.target.value = '';
  }
});
document.addEventListener('submit', e => {
  if (!['scenario-form', 'source-form', 'save-form'].includes(e.target.id)) return;
  e.preventDefault(); const f = new FormData(e.target);
  try {
    if (e.target.id === 'scenario-form') {
      const next = { ...state.settings, demandFactor: Number(f.get('demandPercent')) / 100, treatment: f.get('treatment') === 'treatment' };
      for (const key of ['freshTariff', 'dischargeTariff', 'operatingDays', 'capex']) next[key] = Number(f.get(key));
      validateSettings(next); state.settings = next; refresh('Сценарий пересчитан с новыми параметрами.');
    } else if (e.target.id === 'source-form') {
      const index = state.sources.findIndex(s => s.id === e.target.dataset.id), next = { ...state.sources[index], name: String(f.get('name')).trim() };
      for (const key of ['volume', 'ph', 'tds', 'temp', 'oil', 'transferCost']) next[key] = Number(f.get(key));
      validateSource(next); state.sources[index] = next; $('#modal').close(); refresh('Источник обновлен. Маршруты пересчитаны.');
    } else {
      const name = String(f.get('scenarioName')).trim(); if (!name) throw new Error('Введите название сценария.');
      state.saved.push({ name, settings: clone(state.settings), sources: clone(state.sources), result: { annualSaving: result.annualSaving } });
      persist(); $('#modal').close(); render(); toast('Сценарий сохранен в этом браузере.');
    }
  } catch (error) { toast(error.message); }
});
window.addEventListener('hashchange', () => { const page = location.hash.slice(1); if (pages.some(p => p[0] === page) || page === 'about') { state.page = page; render(); } });
const initial = location.hash.slice(1); if (pages.some(p => p[0] === initial) || initial === 'about') state.page = initial;
render();
window.ReWaterDemo = { getResult: () => clone(result), getState: () => clone(state) };
