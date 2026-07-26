class EnergyCoreX extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._renderQueued = false;
    this._clockTimer = null;
  }

  static getStubConfig() {
    return {
      type: "custom:energy-core-x",
      name: "Florian",
      battery_capacity_kwh: 2.52,
      pv_entity: "sensor.zuhause_jackery_solarvault_3_pro_solar_power",
      pv_today_entity: "sensor.energy_core_pv_heute",
      soc_entity: "sensor.zuhause_jackery_solarvault_3_pro_battery_soc",
      output_entity: "sensor.zuhause_jackery_solarvault_3_pro_grid_port_output_power",
      grid_entity: "sensor.verbrauch_gesamt_total_active_power",
      grid_today_entity: "sensor.zuhause_verbrauch_gesamt_netzbezug_heute"
    };
  }

  connectedCallback() {
    this._startClock();
  }

  disconnectedCallback() {
    if (this._clockTimer) clearInterval(this._clockTimer);
  }

  setConfig(config) {
    if (!config) throw new Error("ENERGY CORE X: Konfiguration fehlt.");
    this._config = { name: "Florian", battery_capacity_kwh: 2.52, ...config };
    this._queueRender();
  }

  set hass(hass) {
    this._hass = hass;
    this._queueRender();
  }

  getCardSize() { return 5; }

  _startClock() {
    if (this._clockTimer) return;
    this._clockTimer = setInterval(() => this._queueRender(), 30000);
  }

  _queueRender() {
    if (this._renderQueued) return;
    this._renderQueued = true;
    requestAnimationFrame(() => {
      this._renderQueued = false;
      this._render();
    });
  }

  _state(entityId) {
    return entityId && this._hass?.states?.[entityId] ? this._hass.states[entityId] : null;
  }

  _number(entityId, fallback = Number.NaN) {
    const value = Number.parseFloat(this._state(entityId)?.state);
    return Number.isFinite(value) ? value : fallback;
  }

  _formatW(value) {
    return Number.isFinite(value) ? `${Math.round(Math.abs(value)).toLocaleString("de-DE")} W` : "—";
  }

  _formatKwh(value) {
    return Number.isFinite(value)
      ? `${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`
      : "—";
  }

  _formatPercent(value) {
    return Number.isFinite(value) ? `${Math.round(value)} %` : "—";
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _greeting() {
    const hour = new Date().getHours();
    if (hour < 5) return "GUTE NACHT";
    if (hour < 11) return "GUTEN MORGEN";
    if (hour < 18) return "GUTEN TAG";
    return "GUTEN ABEND";
  }

  _time() {
    return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  _metric(label, value, detail, tone, symbol) {
    return `<article class="metric metric--${tone}"><div class="metric__header"><span class="metric__symbol">${symbol}</span><span class="metric__label">${label}</span></div><div class="metric__value">${value}</div><div class="metric__detail">${detail}</div></article>`;
  }

  _render() {
    if (!this._hass || !this._config) return;
    const c = this._config;
    const pvToday = this._number(c.pv_today_entity);
    const pvLive = this._number(c.pv_entity);
    const soc = this._number(c.soc_entity);
    const output = this._number(c.output_entity, 0);
    const gridRaw = this._number(c.grid_entity, 0);
    const gridToday = this._number(c.grid_today_entity);
    const capacity = Number(c.battery_capacity_kwh) || 2.52;
    const storedKwh = Number.isFinite(soc) ? Math.max(0, Math.min(capacity, capacity * soc / 100)) : Number.NaN;
    const gridImport = Math.max(gridRaw, 0);
    const housePower = Math.max(output + gridRaw, 0);

    this.shadowRoot.innerHTML = `<style>${this._styles()}</style><ha-card class="shell"><div class="glow glow--warm"></div><div class="glow glow--cool"></div><header class="hero"><div><div class="eyebrow">${this._greeting()}</div><h1>${this._escape(c.name)}</h1></div><time>${this._time()}</time></header><section class="metrics">${this._metric("PV HEUTE", this._formatKwh(pvToday), "vom Dach erzeugt", "solar", "☀")}${this._metric("PV LIVE", this._formatW(pvLive), "aktuelle Leistung", "live", "ϟ")}${this._metric("HAUS", this._formatW(housePower), "aktueller Verbrauch", "home", "⌂")}${this._metric("AKKU", this._formatPercent(soc), `${this._formatKwh(storedKwh)} von ${this._formatKwh(capacity)}`, "battery", "▰")}${this._metric("NETZBEZUG", this._formatW(gridImport), Number.isFinite(gridToday) ? `${this._formatKwh(gridToday)} heute` : "Tageswert nicht verfügbar", "grid", "⌁")}</section></ha-card>`;
  }

  _styles() {
    return String.raw`:host{display:block;--ec-bg:#050a10;--ec-bg-2:#09121c;--ec-text:#f6f8fa;--ec-muted:#8a98a6;--ec-line:rgba(255,255,255,.07);--ec-solar:#ffc33d;--ec-live:#6dd7ff;--ec-home:#a6d7ff;--ec-battery:#74e791;--ec-grid:#c7a4ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}.shell{position:relative;overflow:hidden;border-radius:30px;padding:30px;color:var(--ec-text);background:linear-gradient(145deg,var(--ec-bg-2),var(--ec-bg) 72%);border:1px solid rgba(143,181,214,.12);box-shadow:0 24px 70px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.035)}.glow{position:absolute;width:420px;height:420px;border-radius:50%;filter:blur(2px);pointer-events:none}.glow--warm{left:-220px;top:-280px;background:radial-gradient(circle,rgba(255,195,61,.13),transparent 68%)}.glow--cool{right:-260px;top:-250px;background:radial-gradient(circle,rgba(69,154,224,.08),transparent 68%)}.hero,.metrics{position:relative;z-index:1}.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:30px}.eyebrow{margin-bottom:7px;color:var(--ec-muted);font-size:10px;font-weight:750;letter-spacing:.19em}h1{margin:0;font-size:clamp(44px,5.6vw,76px);line-height:.94;font-weight:760;letter-spacing:-.058em}time{color:rgba(255,255,255,.72);font-size:clamp(18px,2.1vw,27px);font-weight:650;font-variant-numeric:tabular-nums}.metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-top:1px solid var(--ec-line);border-bottom:1px solid var(--ec-line)}.metric{min-width:0;padding:25px 21px 23px;border-right:1px solid var(--ec-line)}.metric:last-child{border-right:0}.metric__header{display:flex;align-items:center;gap:9px;margin-bottom:19px}.metric__symbol{display:grid;place-items:center;width:31px;height:31px;border-radius:10px;font-size:18px}.metric__label{color:var(--ec-muted);font-size:9px;font-weight:750;letter-spacing:.12em;white-space:nowrap}.metric__value{font-size:clamp(26px,3vw,43px);line-height:1;font-weight:720;letter-spacing:-.045em;white-space:nowrap;font-variant-numeric:tabular-nums}.metric__detail{margin-top:10px;color:var(--ec-muted);font-size:11px;line-height:1.35}.metric--solar .metric__symbol{color:var(--ec-solar);background:rgba(255,195,61,.10)}.metric--solar .metric__value{color:var(--ec-solar)}.metric--live .metric__symbol{color:var(--ec-live);background:rgba(109,215,255,.10)}.metric--live .metric__value{color:var(--ec-live)}.metric--home .metric__symbol{color:var(--ec-home);background:rgba(166,215,255,.10)}.metric--home .metric__value{color:var(--ec-home)}.metric--battery .metric__symbol{color:var(--ec-battery);background:rgba(116,231,145,.10)}.metric--battery .metric__value{color:var(--ec-battery)}.metric--grid .metric__symbol{color:var(--ec-grid);background:rgba(199,164,255,.10)}.metric--grid .metric__value{color:var(--ec-grid)}@media(max-width:1050px){.shell{padding:23px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.metric{border-bottom:1px solid var(--ec-line)}.metric:nth-child(2n){border-right:0}.metric:last-child{grid-column:1/-1;border-bottom:0}}@media(max-width:620px){.shell{padding:19px;border-radius:24px}.hero{align-items:flex-start;margin-bottom:21px}h1{font-size:46px}.metrics{grid-template-columns:1fr}.metric,.metric:nth-child(2n){display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px 18px;padding:18px 4px;border-right:0;border-bottom:1px solid var(--ec-line)}.metric:last-child{grid-column:auto}.metric__header{margin:0}.metric__value{grid-column:2;grid-row:1;text-align:right;font-size:31px}.metric__detail{grid-column:1/-1;margin-top:1px;padding-left:40px}}`;
  }
}

if (!customElements.get("energy-core-x")) customElements.define("energy-core-x", EnergyCoreX);
window.customCards = window.customCards || [];
window.customCards.push({ type: "energy-core-x", name: "Energy Core X", description: "Minimalistisches Energie-Dashboard für Jackery und Shelly.", preview: false });
console.info("%c ENERGY CORE X %c v0.1.0 ","background:#111;color:#fff;padding:3px 7px;border-radius:4px 0 0 4px;font-weight:700","background:#74e791;color:#07110a;padding:3px 7px;border-radius:0 4px 4px 0;font-weight:700");
