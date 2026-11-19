import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SOURCES, CONSUMERS, DEFAULT_SETTINGS, optimize, qualityChecks, parseSourcesCSV, clone } from './dist/model.mjs';
function verify(sources, settings) {
  const r = optimize(sources, settings), eps = 1e-5;
  assert.ok(Math.abs(r.fresh + r.reused - r.demand) < eps);
  assert.ok(Math.abs(r.discharge + r.reused - r.available) < eps);
  assert.ok(Math.abs(r.baselineCost - r.scenarioCost - r.dailySaving) < eps);
  assert.ok(Math.abs(r.routes.reduce((a, e) => a + e.dailySaving, 0) - r.dailySaving) < eps);
  for (const s of sources) assert.ok(r.routes.filter(e => e.source === s.id).reduce((a, e) => a + e.volume, 0) <= (settings.blocked.includes(s.id) ? 0 : s.volume) + eps);
  for (const d of r.consumers) assert.ok(r.routes.filter(e => e.consumer === d.id).reduce((a, e) => a + e.volume, 0) <= d.demand * d.reuseCap + eps);
  for (const e of r.routes) {
    assert.ok(e.volume > 0 && e.dailySaving > 0);
    assert.ok(qualityChecks(sources.find(s => s.id === e.source), CONSUMERS.find(d => d.id === e.consumer), e.treatment).every(c => c.ok));
    if (!settings.treatment) assert.equal(e.treatment, false);
  }
  return r;
}
test('Демо: объем, баланс, тарифы и простая окупаемость', () => {
  const r = verify(DEMO_SOURCES, DEFAULT_SETTINGS);
  assert.equal(r.reused, 1290); assert.equal(r.fresh, 1110); assert.equal(r.annualSaving, 52961700);
  assert.equal(r.paybackMonths, 24000000 / r.annualSaving * 12);
});
test('Водоподготовка повышает допустимый возврат с учетом своих затрат', () => {
  const r = verify(DEMO_SOURCES, { ...DEFAULT_SETTINGS, treatment: true, capex: 82000000 });
  assert.equal(r.reused, 1505); assert.equal(r.annualSaving, 60225000);
  assert.ok(r.routes.some(e => e.treatment));
});
test('Не добавлять воду и экономию при отключенных источниках или нулевых тарифах', () => {
  const a = verify(DEMO_SOURCES, { ...DEFAULT_SETTINGS, blocked: DEMO_SOURCES.map(s => s.id) });
  assert.equal(a.reused, 0); assert.equal(a.annualSaving, 0); assert.equal(a.paybackMonths, null);
  const b = verify(DEMO_SOURCES, { ...DEFAULT_SETTINGS, freshTariff: 0, dischargeTariff: 0 });
  assert.equal(b.reused, 0); assert.equal(b.annualSaving, 0);
});
test('Пустые и несовместимые источники не создают маршруты', () => {
  assert.equal(verify([], DEFAULT_SETTINGS).reused, 0);
  const sources = clone(DEMO_SOURCES).map(s => ({ ...s, ph: 1 }));
  assert.equal(verify(sources, { ...DEFAULT_SETTINGS, treatment: true }).reused, 0);
});
test('Проверка сохранения баланса для разных нагрузок и тарифов', () => {
  for (const demandFactor of [.5, .75, 1, 1.25, 1.5]) for (const treatment of [false, true]) for (const freshTariff of [0, 5, 50, 85]) verify(DEMO_SOURCES, { ...DEFAULT_SETTINGS, demandFactor, treatment, freshTariff });
});
test('CSV с запятой, BOM, редактированными данными и отказом без заголовков', () => {
  const src = parseSourcesCSV('\uFEFFid;name;volume;ph;tds;temp;oil\ns1;Поток;150;7,2;200;25;0,2');
  assert.equal(src[0].ph, 7.2); assert.equal(src[0].oil, .2); verify(src, DEFAULT_SETTINGS);
  assert.throws(() => parseSourcesCSV('bad;columns\n1;2'));
  assert.throws(() => parseSourcesCSV('id;name;volume;ph;tds;temp;oil\ns;X;-4;7;1;20;0'));
  assert.throws(() => parseSourcesCSV('id;name;volume;ph;tds;temp;oil\ns;X;4;7;1;20;0\ns;Y;4;7;1;20;0'));
});
test('Некорректные входные значения отклоняются', () => {
  assert.throws(() => optimize(DEMO_SOURCES, { ...DEFAULT_SETTINGS, operatingDays: 0 }));
  assert.throws(() => optimize(DEMO_SOURCES, { ...DEFAULT_SETTINGS, demandFactor: 4 }));
  assert.throws(() => optimize([{ ...DEMO_SOURCES[0], volume: NaN }]));
  assert.throws(() => optimize([DEMO_SOURCES[0], DEMO_SOURCES[0]]));
});
test('Остаточная сеть освобождает универсальный ресурс для единственного подходящего потребителя', () => {
  // Очень чистый холодный источник подходит котельной и другим участкам;
  // второй — только обычным процессам. Оба должны использоваться целиком.
  const sources = [
    { ...DEMO_SOURCES[0], id: 'clean', volume: 160, ph: 7, temp: 20, tds: 10, oil: 0, transferCost: 1 },
    { ...DEMO_SOURCES[1], id: 'regular', volume: 1345, ph: 7, temp: 25, tds: 350, oil: .5, transferCost: 2 },
  ];
  const r = verify(sources, DEFAULT_SETTINGS);
  assert.equal(r.reused, 1505);
  assert.ok(r.routes.some(e => e.source === 'clean' && e.consumer === 'boiler'));
});
