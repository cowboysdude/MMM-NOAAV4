/* NOAAV4 Weather Card for Home Assistant
 * The MMM-NOAAV4 MagicMirror weather card, as a Home Assistant dashboard card.
 * By cowboysdude. MIT License.
 *
 * Uses Home Assistant's own data: any weather entity (current weather + daily forecast),
 * your home location (sunrise, sunset, countdown to sunset), and optional AQI and
 * weather-alert sensors.
 */
const NOAAV4_VERSION = "1.2.0";

const CONDITION_ICON = {
	"clear-night": "clear", sunny: "clear", partlycloudy: "partlycloudy", cloudy: "cloudy",
	fog: "fog", hail: "sleet", lightning: "tstorms", "lightning-rainy": "tstorms",
	pouring: "rain", rainy: "rain", snowy: "snow", "snowy-rainy": "sleet",
	windy: "wind", "windy-variant": "wind", exceptional: "cloudy"
};

const CONDITION_TEXT = {
	"clear-night": "Clear", sunny: "Sunny", partlycloudy: "Partly Cloudy", cloudy: "Cloudy",
	fog: "Fog", hail: "Hail", lightning: "Thunderstorms", "lightning-rainy": "Thunderstorms",
	pouring: "Heavy Rain", rainy: "Rain", snowy: "Snow", "snowy-rainy": "Sleet",
	windy: "Windy", "windy-variant": "Windy", exceptional: "Exceptional"
};

const CARD_CSS = `
:host { display: block; }
.nl {
	box-sizing: border-box;
	width: 100%;
	padding: 16px 18px 14px;
	border-radius: var(--ha-card-border-radius, 12px);
	background: #fff;
	box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15);
	color: #212121;
	text-align: left;
	font-family: "Roboto", "Segoe UI", sans-serif;
	line-height: 1.2;
	--nl-muted: #727272; --nl-muted2: #8a8a8a; --nl-line: #e6e6e6; --nl-strong: #212121;
}
.nl.nl-dark {
	background: #1f2125; color: #e8eaed; border: 1px solid #2f3237;
	box-shadow: 0 2px 4px rgba(0,0,0,0.5), 0 4px 14px rgba(0,0,0,0.45);
	--nl-muted: #9aa0a6; --nl-muted2: #8a9097; --nl-line: #34373c; --nl-strong: #e8eaed;
}
.nl.nl-theme {
	background: var(--ha-card-background, var(--card-background-color, #fff));
	color: var(--primary-text-color); box-shadow: var(--ha-card-box-shadow, none);
	border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
	--nl-muted: var(--secondary-text-color); --nl-muted2: var(--secondary-text-color);
	--nl-line: var(--divider-color, #e6e6e6); --nl-strong: var(--primary-text-color);
}
.nl.nl-glass {
	background: rgba(255,255,255,0.05);
	-webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
	border: 1px solid rgba(255,255,255,0.08);
	border-radius: 20px;
	box-shadow: 0 8px 24px rgba(0,0,0,0.4);
	color: #fff;
	--nl-muted: #9fb3c8; --nl-muted2: #8aa0b8; --nl-line: rgba(255,255,255,0.08); --nl-strong: #fff;
}
.nl-glass .nl-alert { background: rgba(255,167,38,0.15); color: #ffcc80; }
.nl-glass .nl-alert-severe { background: rgba(239,83,80,0.2); color: #ef9a9a; }
.nl-msg { font-size: 16px; color: var(--nl-muted); }
.nl-head { display: flex; align-items: center; gap: 14px; }
.nl-icon { flex: 0 0 66px; height: 66px; }
.nl-svg { width: 100%; height: 100%; display: block; }
.nl-cond { flex: 1; min-width: 0; }
.nl-desc { font-size: 28px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nl-place { font-size: 14px; color: var(--nl-muted); margin-top: 2px; }
.nl-now { text-align: right; }
.nl-temp { font-size: 30px; font-weight: 400; white-space: nowrap; }
.nl-sub { font-size: 13px; color: var(--nl-muted); margin-top: 2px; white-space: nowrap; }
.nl-fc { display: flex; justify-content: space-between; margin-top: 18px; }
.nl-day { flex: 1; text-align: center; }
.nl-dname { font-size: 15px; margin-bottom: 4px; }
.nl-dicon { width: 44px; height: 44px; margin: 0 auto 8px; }
.nl-hi { font-size: 16px; color: var(--nl-strong); }
.nl-lo { font-size: 15px; color: var(--nl-muted2); margin-top: 6px; }
.nl-row { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--nl-line); }
.nl-row + .nl-row { margin-top: 12px; }
.nl-item { flex: 1; text-align: center; min-width: 0; }
.nl-ilabel { font-size: 12px; color: var(--nl-muted); white-space: nowrap; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 3px; }
.nl-ilabel ha-icon { --mdc-icon-size: 15px; width: 15px; height: 15px; display: inline-flex; }
.nl-ivalue { font-size: 16px; color: var(--nl-strong); white-space: nowrap; }
.nl-iextra { font-size: 12px; color: var(--nl-muted2); }
.nl-countdown { font-variant-numeric: tabular-nums; }
.nl-moonsvg { width: 15px; height: 15px; }
.nl-moonname { font-size: 13px; white-space: normal; line-height: 1.15; }
.nl-moon .nl-iextra { display: block; margin-top: 1px; }
.nl-alert { margin-top: 14px; padding: 6px 10px; border-radius: 4px; background: #fff4e5; color: #b26a00; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
.nl-alert ha-icon { --mdc-icon-size: 18px; }
.nl-alert-severe { background: #fdecea; color: #c62828; }
.nl-dark .nl-alert { background: rgba(255,167,38,0.15); color: #ffb74d; }
.nl-dark .nl-alert-severe { background: rgba(239,83,80,0.18); color: #ef9a9a; }
`;

class NOAAV4Card extends HTMLElement {
	static getStubConfig (hass) {
		const weather = Object.keys((hass && hass.states) || {}).find((e) => e.startsWith("weather."));
		return { entity: weather || "weather.home", css: "light" };
	}

	// visual editor in the dashboard (Home Assistant 2024.x and newer)
	static getConfigForm () {
		return {
			schema: [
				{ name: "entity", required: true, selector: { entity: { domain: "weather" } } },
				{ name: "title", selector: { text: {} } },
				{ name: "css", selector: { select: { mode: "dropdown", options: [
					{ value: "light", label: "White card" }, { value: "dark", label: "Dark card" }, { value: "theme", label: "Follow my theme" }, { value: "glass", label: "Frosted glass" }] } } },
				{ name: "forecast_days", selector: { number: { min: 0, max: 5, mode: "box" } } },
				{ name: "details", selector: { boolean: {} } },
				{ name: "sun", selector: { boolean: {} } },
				{ name: "aqi_entity", selector: { entity: { domain: "sensor" } } },
				{ name: "uv_entity", selector: { entity: { domain: "sensor" } } },
				{ name: "alerts_entity", selector: { entity: {} } }
			],
			computeLabel: (s) => ({
				entity: "Weather entity", title: "Name under the condition (default: your home's name)",
				css: "Look", forecast_days: "Forecast days (0-5)", details: "Show humidity / wind / AQI / UV row",
				sun: "Show sunrise / countdown / sunset row", aqi_entity: "Air quality (AQI) sensor (optional)",
				uv_entity: "UV index sensor (optional, if your weather has none)", alerts_entity: "Weather alerts sensor (optional)"
			}[s.name] || s.name)
		};
	}

	setConfig (config) {
		if (!config || !config.entity) throw new Error("Pick a weather entity (entity: weather.xxx)");
		this._config = { css: "light", forecast_days: 3, details: true, sun: true, ...config };
		if (this._sub && this._subEntity !== this._config.entity) this._unsubscribe();
		this._lastKey = null;
		if (this._hass) this.hass = this._hass;
	}

	getCardSize () {
		return 4 + (this._config && this._config.details !== false ? 1 : 0) + (this._config && this._config.sun !== false ? 1 : 0);
	}

	getGridOptions () {
		return { columns: 12, min_columns: 6, rows: "auto" };
	}

	connectedCallback () {
		if (!this._timer) this._timer = setInterval(() => this._tick(), 1000);
		if (this._hass && !this._sub) this._subscribe();
	}

	disconnectedCallback () {
		clearInterval(this._timer);
		this._timer = null;
		this._unsubscribe();
	}

	set hass (hass) {
		this._hass = hass;
		if (!this._config) return;
		if (!this._sub && this.isConnected) this._subscribe();
		const c = this._config;
		const key = [c.entity, c.aqi_entity, c.uv_entity, c.alerts_entity, "sun.sun"]
			.map((e) => (e && hass.states[e] ? hass.states[e].last_updated + hass.states[e].state : "")).join("|");
		if (key !== this._lastKey) {
			this._lastKey = key;
			this._render();
		}
	}

	// ------------------------------------------------------------ forecast (HA 2024.3+: subscribe, no longer an attribute)
	async _subscribe () {
		const hass = this._hass;
		const entity = this._config && this._config.entity;
		const st = hass && hass.states[entity];
		if (!st || !hass.connection || this._sub) return;
		const features = Number(st.attributes.supported_features || 0);
		const type = features & 1 ? "daily" : features & 4 ? "twice_daily" : null;
		if (!type) {
			// old-style integrations still put the forecast in an attribute
			this._forecast = st.attributes.forecast || null;
			return;
		}
		this._subEntity = entity;
		this._sub = hass.connection.subscribeMessage((msg) => {
			this._forecast = type === "twice_daily" ? this._mergeTwiceDaily(msg.forecast || []) : (msg.forecast || []);
			this._render();
		}, { type: "weather/subscribe_forecast", forecast_type: type, entity_id: entity }).catch((err) => {
			console.warn("[noaav4-card] forecast:", err && err.message);
			this._sub = null;
		});
	}

	_unsubscribe () {
		if (this._sub) {
			const s = this._sub;
			this._sub = null;
			Promise.resolve(s).then((unsub) => typeof unsub === "function" && unsub()).catch(() => {});
		}
		this._forecast = null;
	}

	// NWS gives day and night halves: high from the day half, low from the night half
	_mergeTwiceDaily (list) {
		const days = [];
		list.forEach((f) => {
			const date = new Date(f.datetime);
			const key = date.toDateString();
			let d = days.find((x) => x.key === key);
			if (!d) {
				d = { key, datetime: f.datetime, condition: f.condition, temperature: null, templow: null };
				days.push(d);
			}
			if (f.is_daytime === false) d.templow = f.temperature;
			else {
				d.temperature = f.temperature;
				d.condition = f.condition;
			}
		});
		return days;
	}

	// ------------------------------------------------------------ sun (from the home location, so today's sunrise is always known)
	_sunTimes (date) {
		const lat = Number(this._hass.config.latitude);
		const lon = Number(this._hass.config.longitude);
		if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
		const rad = Math.PI / 180;
		const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
		const J = noon.getTime() / 86400000 + 2440587.5;          // Julian day
		const n = Math.round(J - 2451545.0 - 0.0009 + lon / 360) + 0.0009 - lon / 360;
		const M = (357.5291 + 0.98560028 * n) % 360;
		const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
		const L = (M + C + 180 + 102.9372) % 360;
		const Jtransit = 2451545.0 + n + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
		const decl = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
		const cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
		if (cosW < -1 || cosW > 1) return null;                  // polar day or night
		const W = Math.acos(cosW) / rad;
		const toDate = (j) => new Date((j - 2440587.5) * 86400000);
		return { sunrise: toDate(Jtransit - W / 360), sunset: toDate(Jtransit + W / 360) };
	}

	// today's sunrise/sunset: Home Assistant's exact sun.sun times where they're for today, calculated otherwise
	_todaySun () {
		const calc = this._sunTimes(new Date());
		if (!calc) return null;
		const sun = this._hass.states["sun.sun"];
		const today = new Date().toDateString();
		if (sun && sun.attributes) {
			const set = sun.attributes.next_setting ? new Date(sun.attributes.next_setting) : null;
			const rise = sun.attributes.next_rising ? new Date(sun.attributes.next_rising) : null;
			if (set && set.toDateString() === today) calc.sunset = set;
			if (rise && rise.toDateString() === today) calc.sunrise = rise;
		}
		return calc;
	}

	_isDay () {
		const s = this._todaySun();
		if (s) {
			const now = Date.now();
			return now >= s.sunrise && now < s.sunset;
		}
		const sun = this._hass.states["sun.sun"];
		return sun ? sun.state === "above_horizon" : true;
	}

	// ------------------------------------------------------------ helpers
	_esc (s) {
		return String(s === null || s === undefined ? "" : s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	}

	_num (n, digits = 0) {
		if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "--";
		return Number(n).toFixed(digits);
	}

	_time (d) {
		const loc = this._hass.locale || {};
		const opts = { hour: "numeric", minute: "2-digit" };
		if (loc.time_format === "24") opts.hour12 = false;
		else if (loc.time_format === "12") opts.hour12 = true;
		try {
			return d.toLocaleTimeString(loc.language || undefined, { ...opts, timeZone: loc.time_zone === "server" ? this._hass.config.time_zone : undefined });
		} catch (e) {
			return d.toLocaleTimeString(undefined, opts);
		}
	}

	_countdown (ms) {
		const s = Math.max(0, Math.floor(ms / 1000));
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
	}

	_compass (deg) {
		if (deg === null || deg === undefined) return "";
		if (typeof deg === "string" && Number.isNaN(Number(deg))) return deg;
		const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
		return dirs[Math.round(((Number(deg) % 360) + 360) % 360 / 22.5) % 16];
	}

	_aqiText (n) {
		if (n <= 50) return "Good";
		if (n <= 100) return "Moderate";
		if (n <= 150) return "Unhealthy for some";
		if (n <= 200) return "Unhealthy";
		return "Very Unhealthy";
	}

	_uvText (n) {
		if (n <= 2) return "Low";
		if (n <= 5) return "Moderate";
		if (n <= 7) return "High";
		return "Very High";
	}

	_condText (state) {
		const hass = this._hass;
		const local = hass.localize && hass.localize(`component.weather.entity_component._.state.${state}`);
		return local || CONDITION_TEXT[state] || state;
	}

	// moon phase from the date (no internet needed); shown in place of UV at night
	_moonPhase (date) {
		const synodic = 29.530588853;
		const jd = date.getTime() / 86400000 + 2440587.5;
		const age = (((jd - 2451550.1) % synodic) + synodic) % synodic;   // days since new moon
		const frac = age / synodic;                                       // 0 = new, 0.5 = full
		const illum = Math.round((1 - Math.cos(2 * Math.PI * frac)) / 2 * 100);
		const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
		const name = names[Math.floor((age / synodic) * 8 + 0.5) % 8];
		return { frac, illum, name, age };
	}

	// small moon drawing: lit part on the right while waxing, on the left while waning
	_moonSvg (frac, cls) {
		const r = 10, cx = 12, top = 2, bottom = 22;
		const k = Math.abs(Math.cos(2 * Math.PI * frac)) * r;
		const waxing = frac < 0.5;
		const crescent = frac < 0.25 || frac > 0.75;
		const outer = waxing ? 1 : 0;
		const inner = crescent ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
		const lit = frac < 0.02 || frac > 0.98 ? "" :
			Math.abs(frac - 0.5) < 0.02 ? `<circle cx="${cx}" cy="12" r="${r}" fill="#fff3c4"/>` :
			`<path d="M${cx} ${top}A${r} ${r} 0 0 ${outer} ${cx} ${bottom}A${k.toFixed(2)} ${r} 0 0 ${inner} ${cx} ${top}z" fill="#fff3c4"/>`;
		return `<svg class="${cls}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="${cx}" cy="12" r="${r}" fill="#607d8b"/>${lit}<circle cx="${cx}" cy="12" r="${r}" fill="none" stroke="#90a4ae" stroke-width="1"/></svg>`;
	}

	// Flat weather icons (same drawings as MMM-NOAAV4)
	_icon (name, night) {
		const n = String(name || "unknown");
		const sun = '<circle cx="20" cy="20" r="14" fill="#fdd835"/>';
		const moon = '<path d="M27 6a14 14 0 1 0 7 22A12 12 0 0 1 27 6z" fill="#cfd8dc"/>';
		const smallSun = '<circle cx="31" cy="15" r="8" fill="#fdd835"/>';
		const smallMoon = '<path d="M33 7a8 8 0 1 0 4 13 7 7 0 0 1-4-13z" fill="#cfd8dc"/>';
		const cloud = (fill) => `<path d="M14 36h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0-1 18z" fill="${fill}"/>`;
		const lightCloud = cloud("#eceff1") + '<path d="M14 36h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0-1 18z" fill="none" stroke="#cfd8dc" stroke-width="1"/>';
		const drops = (k) => Array.from({ length: k }, (_, i) => `<path d="M${15 + i * 7} 40l-2 5" stroke="#42a5f5" stroke-width="2.2" stroke-linecap="round"/>`).join("");
		const flakes = (k) => Array.from({ length: k }, (_, i) => `<circle cx="${15 + i * 7}" cy="43" r="1.8" fill="#90caf9"/>`).join("");
		const bolt = '<path d="M24 37l-4 7h4l-3 6 8-9h-4l3-4z" fill="#fdd835"/>';
		const fogLines = '<path d="M8 40h30M12 45h26" stroke="#b0bec5" stroke-width="2.5" stroke-linecap="round"/>';
		const windLines = '<path d="M6 16h22a5 5 0 1 0-5-5M6 24h30a5 5 0 1 1-5 5M6 32h16" fill="none" stroke="#b0bec5" stroke-width="2.6" stroke-linecap="round"/>';
		const body = {
			clear: night ? moon : sun,
			partlycloudy: (night ? smallMoon : smallSun) + lightCloud,
			cloudy: lightCloud,
			fog: lightCloud + fogLines,
			rain: cloud("#cfd8dc") + drops(4),
			sleet: lightCloud + drops(2) + '<circle cx="29" cy="43" r="1.8" fill="#90caf9"/>',
			snow: cloud("#cfd8dc") + flakes(4),
			tstorms: cloud("#b0bec5") + bolt,
			wind: windLines
		}[n] || lightCloud;
		return `<svg class="nl-svg" viewBox="0 0 48 50" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
	}

	_item (icon, color, label, value, extra = "", valueClass = "") {
		return `<div class="nl-item">
			<div class="nl-ilabel">${icon ? `<ha-icon icon="${icon}" style="color:${color}"></ha-icon>` : ""}${label}</div>
			<div class="nl-ivalue ${valueClass}">${value}${extra ? ` <span class="nl-iextra">${extra}</span>` : ""}</div>
		</div>`;
	}

	_moonItem () {
		const m = this._moonPhase(new Date());
		return `<div class="nl-item nl-moon" title="${this._esc(m.name)}, ${m.illum}%">
			<div class="nl-ilabel">${this._moonSvg(m.frac, "nl-moonsvg")}Moon</div>
			<div class="nl-ivalue nl-moonname">${this._esc(m.name)}</div>
			<div class="nl-iextra">${m.illum}% lit</div>
		</div>`;
	}

	// ------------------------------------------------------------ render
	_render () {
		const hass = this._hass;
		const cfg = this._config;
		if (!hass || !cfg) return;
		if (!this.shadowRoot) this.attachShadow({ mode: "open" });

		const look = String(cfg.css || "light").toLowerCase();
		const cls = look === "dark" ? "nl nl-dark" : look === "theme" ? "nl nl-theme" : look === "glass" ? "nl nl-glass" : "nl";
		const st = hass.states[cfg.entity];
		let html;

		if (!st) {
			html = `<div class="${cls}"><div class="nl-msg">Weather entity not found: ${this._esc(cfg.entity)}</div></div>`;
		} else if (st.state === "unavailable" || st.state === "unknown") {
			html = `<div class="${cls}"><div class="nl-msg">Waiting for weather from ${this._esc(st.attributes.friendly_name || cfg.entity)}…</div></div>`;
		} else {
			html = `<div class="${cls}">${this._body(st)}</div>`;
		}
		this.shadowRoot.innerHTML = `<style>${CARD_CSS}</style><ha-card style="background:none;border:none;box-shadow:none">${html}</ha-card>`;
	}

	_body (st) {
		const hass = this._hass;
		const cfg = this._config;
		const a = st.attributes;
		const day = this._isDay();
		const tUnit = a.temperature_unit || (hass.config.unit_system && hass.config.unit_system.temperature) || "°";
		const want = Number(cfg.forecast_days);
		const nDays = Math.max(0, Math.min(5, Number.isNaN(want) ? 3 : want));

		const fc = (this._forecast || a.forecast || []).slice();
		const todayKey = new Date().toDateString();
		const todayFc = fc.length && new Date(fc[0].datetime).toDateString() === todayKey ? fc[0] : null;
		const days = (todayFc ? fc.slice(1) : fc).slice(0, nDays);

		let sub = "";
		if (nDays > 0 && todayFc && todayFc.temperature !== null && todayFc.temperature !== undefined) {
			sub = `${this._num(todayFc.temperature)} ${tUnit}${todayFc.templow !== null && todayFc.templow !== undefined ? ` / ${this._num(todayFc.templow)} ${tUnit}` : ""}`;
		} else if (a.humidity !== undefined) {
			sub = `Humidity ${this._num(a.humidity)} %`;
		}

		const title = cfg.title || hass.config.location_name || "Home";
		let html = `<div class="nl-head">
			<div class="nl-icon">${this._icon(CONDITION_ICON[st.state], !day || st.state === "clear-night")}</div>
			<div class="nl-cond">
				<div class="nl-desc">${this._esc(this._condText(st.state))}</div>
				<div class="nl-place">${this._esc(title)}</div>
			</div>
			<div class="nl-now">
				<div class="nl-temp">${this._num(a.temperature)}${this._esc(tUnit)}</div>
				${sub ? `<div class="nl-sub">${this._esc(sub)}</div>` : ""}
			</div>
		</div>`;

		if (days.length) {
			const lang = (hass.locale && hass.locale.language) || undefined;
			html += `<div class="nl-fc">${days.map((f) => `
				<div class="nl-day">
					<div class="nl-dname">${this._esc(new Date(f.datetime).toLocaleDateString(lang, { weekday: "short" }))}</div>
					<div class="nl-dicon" title="${this._esc(this._condText(f.condition))}">${this._icon(CONDITION_ICON[f.condition], false)}</div>
					<div class="nl-hi">${this._num(f.temperature)}&deg;</div>
					<div class="nl-lo">${f.templow === null || f.templow === undefined ? "&nbsp;" : `${this._num(f.templow)}&deg;`}</div>
				</div>`).join("")}
			</div>`;
		}

		if (cfg.details !== false) {
			const hum = a.humidity === undefined || a.humidity === null ? "--" : `${this._num(a.humidity)}%`;
			let wind = "--";
			let windDir = "";
			if (a.wind_speed !== undefined && a.wind_speed !== null) {
				wind = `${this._num(a.wind_speed)} ${this._esc(a.wind_speed_unit || "")}`.trim();
				if (Number(a.wind_speed) > 0) windDir = this._compass(a.wind_bearing);
			}
			const aqiSt = cfg.aqi_entity && hass.states[cfg.aqi_entity];
			const aqiN = aqiSt && !Number.isNaN(Number(aqiSt.state)) ? Math.round(Number(aqiSt.state)) : null;
			const uvSt = cfg.uv_entity && hass.states[cfg.uv_entity];
			const uvRaw = uvSt ? uvSt.state : a.uv_index;
			const uvN = uvRaw === undefined || uvRaw === null || Number.isNaN(Number(uvRaw)) ? null : Math.round(Number(uvRaw));
			html += `<div class="nl-row">
				${this._item("mdi:water-percent", "#42a5f5", "Humidity", hum)}
				${this._item("mdi:weather-windy", "#78909c", "Wind", wind, windDir)}
				${this._item("mdi:leaf", "#43a047", "AQI", aqiN === null ? "--" : String(aqiN), aqiN === null ? "" : this._aqiText(aqiN))}
				${day ? this._item("mdi:white-balance-sunny", "#f9a825", "UV Index", uvN === null ? "--" : String(uvN), uvN === null ? "" : this._uvText(uvN)) : this._moonItem()}
			</div>`;
		}

		this._sunState = null;
		const sun = cfg.sun !== false ? this._todaySun() : null;
		if (sun) {
			const now = Date.now();
			const daytime = now >= sun.sunrise && now < sun.sunset;
			this._sunState = { daytime, sunrise: sun.sunrise.getTime(), sunset: sun.sunset.getTime(), day: new Date().toDateString() };
			const middle = daytime
				? this._item("mdi:timer-sand", "#fb8c00", "Day left", this._countdown(sun.sunset - now), "", "nl-countdown")
				: this._item("mdi:weather-night", "#b0bec5", "", "Night");
			html += `<div class="nl-row">
				${this._item("mdi:weather-sunset-up", "#f9a825", "Sunrise", this._esc(this._time(sun.sunrise)))}
				${middle}
				${this._item("mdi:weather-sunset-down", "#ef6c00", "Sunset", this._esc(this._time(sun.sunset)))}
			</div>`;
		}

		const alert = this._alert();
		if (alert) {
			html += `<div class="nl-alert ${alert.severe ? "nl-alert-severe" : ""}"><ha-icon icon="mdi:alert"></ha-icon>${this._esc(alert.text)}</div>`;
		}
		return html;
	}

	// works with the NWS Alerts integration (attribute "Alerts") or any sensor that counts alerts
	_alert () {
		const id = this._config.alerts_entity;
		const st = id && this._hass.states[id];
		if (!st) return null;
		const list = st.attributes.Alerts || st.attributes.alerts;
		if (Array.isArray(list) && list.length) {
			const first = list[0];
			const sev = String(first.Severity || first.severity || "").toLowerCase();
			const text = first.Event || first.event || first.Headline || first.headline || first.title || "Weather alert";
			return { text: list.length > 1 ? `${text} (+${list.length - 1} more)` : text, severe: sev === "severe" || sev === "extreme" };
		}
		const n = Number(st.state);
		if (!Number.isNaN(n)) return n > 0 ? { text: `${n} weather alert${n > 1 ? "s" : ""}`, severe: false } : null;
		if (["off", "none", "unknown", "unavailable", "", "0"].includes(String(st.state).toLowerCase())) return null;
		return { text: String(st.state), severe: false };
	}

	// every second: tick the countdown, redraw when the sun sets or rises
	_tick () {
		const s = this._sunState;
		if (!s || !this.shadowRoot) return;
		const now = Date.now();
		if (s.daytime) {
			const left = s.sunset - now;
			if (left <= 0) {
				this._render();
				return;
			}
			const el = this.shadowRoot.querySelector(".nl-countdown");
			if (el) el.textContent = this._countdown(left);
		} else if (now >= s.sunrise && now < s.sunset) {
			this._render();
		} else if (s.day !== new Date().toDateString()) {
			this._render();   // just past midnight: today's sunrise/sunset times
		}
	}
}

customElements.define("noaav4-card", NOAAV4Card);
window.customCards = window.customCards || [];
window.customCards.push({
	type: "noaav4-card",
	name: "NOAAV4 Weather Card",
	description: "The MMM-NOAAV4 weather card: conditions, forecast, humidity/wind/AQI/UV, and sunrise with a live countdown to sunset.",
	preview: true,
	documentationURL: "https://github.com/cowboysdude/MMM-NOAAV4"
});
console.info(`%c NOAAV4-CARD %c ${NOAAV4_VERSION} `, "color:#fff;background:#f9a825;font-weight:bold", "color:#f9a825;background:#fff");
