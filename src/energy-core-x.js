class EnergyCoreX extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = {
      name: "Florian",
      battery_capacity_kwh: 2.52,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 8;
  }

  _num(id, fallback = NaN) {
    const value = Number.parseFloat(this._hass?.states?.[id]?.state);
    return Number.isFinite(value) ? value : fallback;
  }

  _w(value) {
    return Number.isFinite(value)
      ? `${Math.round(Math.abs(value)).toLocaleString("de-DE")} W`
      : "—";
  }

  _kwh(value) {
    return Number.isFinite(value)
      ? `${value.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} kWh`
      : "—";
  }

  _pct(value) {
    return Number.isFinite(value) ? `${Math.round(value)} %` : "—";
  }

  _greeting() {
    const h = new Date().getHours();
    if (h < 5) return "GUTE NACHT";
    if (h < 11) return "GUTEN MORGEN";
    if (h < 18) return "GUTEN TAG";
    return "GUTEN ABEND";
  }

  _metric(label, value, detail, cls) {
    return `
      <div class="metric ${cls}">
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${detail}</small>
      </div>
    `;
  }

  _render() {
    if (!this._hass || !this._config) return;

    const c = this._config;
    const pv = this._num(c.pv_entity, 0);
    const pvToday = this._num(c.pv_today_entity);
    const soc = this._num(c.soc_entity);
    const output = this._num(c.output_entity, 0);
    const gridRaw = this._num(c.grid_entity, 0);
    const gridToday = this._num(c.grid_today_entity);
    const charge = this._num(c.charge_entity, 0);
    const discharge = this._num(c.discharge_entity, 0);

    const capacity = Number(c.battery_capacity_kwh) || 2.52;
    const stored = Number.isFinite(soc) ? capacity * soc / 100 : NaN;
    const house = Math.max(output + gridRaw, 0);
    const importPower = Math.max(gridRaw, 0);
    const exportPower = Math.max(-gridRaw, 0);

    const batteryMode =
      charge > 5 ? "LÄDT" :
      discharge > 5 ? "ENTLÄDT" :
      "BEREIT";

    const gridMode =
      importPower > 5 ? "BEZUG" :
      exportPower > 5 ? "EINSPEISUNG" :
      "NETZ";

    const gridFlow = importPower > 5 ? importPower : exportPower;

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>

      <ha-card class="card">
        <header>
          <div>
            <span class="greeting">${this._greeting()}</span>
            <h1>${c.name || "Florian"}</h1>
          </div>
          <time>${new Date().toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}</time>
        </header>

        <section class="metrics">
          ${this._metric("PV HEUTE", this._kwh(pvToday), "vom Dach", "solar")}
          ${this._metric("PV LIVE", this._w(pv), "aktuelle Leistung", "live")}
          ${this._metric("HAUS", this._w(house), "aktueller Verbrauch", "home")}
          ${this._metric("AKKU", this._pct(soc), `${this._kwh(stored)} / ${this._kwh(capacity)}`, "battery")}
          ${this._metric("NETZBEZUG", this._w(importPower), Number.isFinite(gridToday) ? `${this._kwh(gridToday)} heute` : "Tageswert fehlt", "grid")}
        </section>

        <section class="flow">
          <div class="flow-title">
            <div>
              <span>ENERGY FLOW</span>
              <h2>Jetzt im Haus</h2>
            </div>
            <b><i></i> LIVE</b>
          </div>

          <div class="diagram">
            <div class="node solar-node ${pv > 5 ? "active" : ""}">
              <div class="icon panel"><i></i><i></i><i></i></div>
              <span>SOLAR</span>
              <strong>${this._w(pv)}</strong>
            </div>

            <div class="line solar-line ${pv > 5 ? "active" : ""}">
              <i></i><i></i><i></i>
            </div>

            <div class="battery-box ${charge > 5 ? "charging" : discharge > 5 ? "discharging" : ""}">
              <div class="battery-top">
                <span>JACKERY</span>
                <b>${batteryMode}</b>
              </div>
              <strong>${this._pct(soc)}</strong>
              <small>${this._kwh(stored)} von ${this._kwh(capacity)}</small>
              <div class="bar"><i style="width:${Number.isFinite(soc) ? Math.max(0, Math.min(100, soc)) : 0}%"></i></div>
            </div>

            <div class="line house-line ${house > 5 ? "active" : ""}">
              <i></i><i></i><i></i>
            </div>

            <div class="node home-node ${house > 5 ? "active" : ""}">
              <div class="icon house-icon"></div>
              <span>HAUS</span>
              <strong>${this._w(house)}</strong>
            </div>

            <div class="line grid-line ${gridFlow > 5 ? "active" : ""} ${importPower > 5 ? "reverse" : ""}">
              <i></i><i></i><i></i>
            </div>

            <div class="node grid-node ${gridFlow > 5 ? "active" : ""}">
              <div class="icon grid-icon">⌁</div>
              <span>${gridMode}</span>
              <strong>${this._w(gridFlow)}</strong>
            </div>
          </div>
        </section>
      </ha-card>
    `;
  }

  _styles() {
    return `
      :host {
        display:block;
        --bg:#050a10;
        --bg2:#09131d;
        --text:#f7f9fb;
        --muted:#83909c;
        --line:rgba(255,255,255,.07);
        --solar:#ffc33d;
        --live:#65d6ff;
        --home:#9fd1ff;
        --battery:#72e58e;
        --grid:#c39cff;
        font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
      }

      * { box-sizing:border-box; }

      .card {
        padding:28px;
        border-radius:30px;
        color:var(--text);
        background:
          radial-gradient(circle at 10% 0%,rgba(255,195,61,.10),transparent 28%),
          linear-gradient(145deg,var(--bg2),var(--bg) 72%);
        border:1px solid rgba(141,178,210,.12);
        overflow:hidden;
      }

      header {
        display:flex;
        justify-content:space-between;
        align-items:flex-end;
        gap:20px;
        margin-bottom:26px;
      }

      .greeting {
        color:var(--muted);
        font-size:10px;
        font-weight:750;
        letter-spacing:.18em;
      }

      h1 {
        margin:6px 0 0;
        font-size:clamp(46px,6vw,76px);
        line-height:.94;
        letter-spacing:-.06em;
      }

      time {
        font-size:clamp(18px,2vw,27px);
        font-weight:650;
      }

      .metrics {
        display:grid;
        grid-template-columns:repeat(5,minmax(0,1fr));
        gap:10px;
        margin-bottom:18px;
      }

      .metric {
        min-width:0;
        padding:15px;
        border-radius:18px;
        background:rgba(255,255,255,.025);
        border:1px solid var(--line);
      }

      .metric span {
        display:block;
        margin-bottom:12px;
        color:var(--muted);
        font-size:8px;
        font-weight:750;
        letter-spacing:.11em;
      }

      .metric strong {
        display:block;
        font-size:clamp(22px,2.5vw,35px);
        line-height:1;
        white-space:nowrap;
        letter-spacing:-.04em;
      }

      .metric small {
        display:block;
        margin-top:8px;
        color:var(--muted);
        font-size:10px;
      }

      .solar strong { color:var(--solar); }
      .live strong { color:var(--live); }
      .home strong { color:var(--home); }
      .battery strong { color:var(--battery); }
      .grid strong { color:var(--grid); }

      .flow {
        padding:24px;
        border-radius:24px;
        background:rgba(255,255,255,.018);
        border:1px solid var(--line);
      }

      .flow-title {
        display:flex;
        justify-content:space-between;
        align-items:flex-end;
        margin-bottom:28px;
      }

      .flow-title span {
        color:var(--muted);
        font-size:9px;
        font-weight:750;
        letter-spacing:.17em;
      }

      .flow-title h2 {
        margin:5px 0 0;
        font-size:24px;
      }

      .flow-title b {
        color:var(--muted);
        font-size:9px;
        letter-spacing:.12em;
      }

      .flow-title b i {
        display:inline-block;
        width:7px;
        height:7px;
        margin-right:7px;
        border-radius:50%;
        background:var(--battery);
        box-shadow:0 0 12px var(--battery);
      }

      .diagram {
        display:grid;
        grid-template-columns:100px 1fr 220px 1fr 100px 1fr 100px;
        align-items:center;
        gap:12px;
        min-height:220px;
      }

      .node {
        text-align:center;
        opacity:.45;
        transition:.25s ease;
      }

      .node.active { opacity:1; }

      .icon {
        display:grid;
        place-items:center;
        width:70px;
        height:70px;
        margin:0 auto 12px;
        border-radius:22px;
        background:rgba(255,255,255,.035);
        border:1px solid var(--line);
      }

      .panel {
        grid-template-columns:repeat(3,1fr);
        gap:3px;
        padding:17px 12px;
      }

      .panel i {
        height:100%;
        border-radius:3px;
        background:linear-gradient(160deg,#ffe08b,#f7a91d);
      }

      .house-icon:before {
        content:"⌂";
        color:var(--home);
        font-size:42px;
      }

      .grid-icon {
        color:var(--grid);
        font-size:42px;
      }

      .node span {
        color:var(--muted);
        font-size:9px;
        font-weight:750;
        letter-spacing:.14em;
      }

      .node strong {
        display:block;
        margin-top:7px;
        font-size:23px;
      }

      .solar-node strong { color:var(--solar); }
      .home-node strong { color:var(--home); }
      .grid-node strong { color:var(--grid); }

      .battery-box {
        padding:22px;
        border-radius:28px;
        background:linear-gradient(180deg,rgba(17,28,39,.96),rgba(7,13,20,.98));
        border:1px solid rgba(255,255,255,.09);
        box-shadow:0 18px 40px rgba(0,0,0,.24);
      }

      .battery-box.charging {
        border-color:rgba(114,229,142,.35);
        box-shadow:0 0 35px rgba(114,229,142,.10);
      }

      .battery-box.discharging {
        border-color:rgba(101,214,255,.30);
        box-shadow:0 0 35px rgba(101,214,255,.08);
      }

      .battery-top {
        display:flex;
        justify-content:space-between;
        color:var(--muted);
        font-size:9px;
        font-weight:750;
        letter-spacing:.13em;
      }

      .battery-top b { color:var(--battery); }

      .battery-box > strong {
        display:block;
        margin-top:18px;
        color:var(--battery);
        font-size:52px;
        line-height:.95;
        letter-spacing:-.06em;
      }

      .battery-box > small {
        display:block;
        margin-top:9px;
        color:var(--muted);
      }

      .bar {
        height:8px;
        margin-top:20px;
        overflow:hidden;
        border-radius:999px;
        background:rgba(255,255,255,.07);
      }

      .bar i {
        display:block;
        height:100%;
        border-radius:inherit;
        background:linear-gradient(90deg,#43c86b,var(--battery));
        box-shadow:0 0 14px rgba(114,229,142,.5);
      }

      .line {
        position:relative;
        height:3px;
        border-radius:999px;
        background:rgba(255,255,255,.055);
      }

      .line.active {
        background:linear-gradient(90deg,rgba(255,255,255,.1),currentColor);
        box-shadow:0 0 12px currentColor;
      }

      .solar-line { color:var(--solar); }
      .house-line { color:var(--home); }
      .grid-line { color:var(--grid); }

      .line i {
        position:absolute;
        top:50%;
        left:-6px;
        width:7px;
        height:7px;
        margin-top:-3.5px;
        border-radius:50%;
        background:currentColor;
        box-shadow:0 0 12px currentColor;
        opacity:0;
      }

      .line.active i {
        opacity:1;
        animation:flow-right 2.2s linear infinite;
      }

      .line.reverse.active i {
        animation-name:flow-left;
      }

      .line i:nth-child(2) { animation-delay:.72s; }
      .line i:nth-child(3) { animation-delay:1.44s; }

      @keyframes flow-right {
        from { left:-6px; }
        to { left:calc(100% - 1px); }
      }

      @keyframes flow-left {
        from { left:calc(100% - 1px); }
        to { left:-6px; }
      }

      @media (max-width:1050px) {
        .metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .metric:last-child { grid-column:1/-1; }

        .diagram {
          grid-template-columns:1fr;
        }

        .line {
          width:3px;
          height:42px;
          margin:auto;
        }

        .line.active i {
          left:50%;
          top:-6px;
          margin-left:-3.5px;
          animation:flow-down 2s linear infinite;
        }

        @keyframes flow-down {
          from { top:-6px; }
          to { top:calc(100% - 1px); }
        }
      }

      @media (max-width:620px) {
        .card { padding:18px; border-radius:24px; }
        h1 { font-size:46px; }
        .metrics { grid-template-columns:1fr 1fr; }
        .metric { padding:13px; }
        .metric strong { font-size:23px; }
        .flow { padding:18px; }
      }
    `;
  }
}

if (!customElements.get("energy-core-x")) {
  customElements.define("energy-core-x", EnergyCoreX);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energy-core-x",
  name: "Energy Core X",
  description: "Minimalistisches Energie-Dashboard mit animiertem Energy Flow.",
  preview: false,
});

console.info("ENERGY CORE X v0.2.0");
