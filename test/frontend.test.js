// Renders MMM-NOAAV4.js getDom() with a tiny fake DOM and checks the output.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class El {
	constructor (tag) { this.tag = tag; this.children = []; this.attrs = {}; this.innerHTML = ""; this.style = {}; this.className = ""; const self = this; this.classList = { add: (...c) => { self.className = [self.className, ...c].filter(Boolean).join(" "); } }; }
	appendChild (c) { this.children.push(c); return c; }
	setAttribute (k, v) { this.attrs[k] = v; }
	get outerHTML () {
		const a = Object.entries(this.attrs).map(([k, v]) => ` ${k}="${v}"`).join("");
		const cls = this.className ? ` class="${this.className}"` : "";
		return `<${this.tag}${cls}${a}>${this.innerHTML}${this.children.map((c) => c.outerHTML).join("")}</${this.tag}>`;
	}
}

// minimal moment stand-in (MagicMirror provides the real one in the browser)
function moment (x) {
	const d = x === undefined ? new Date() : new Date(x);
	const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const p = (n) => String(n).padStart(2, "0");
	return {
		format (f) {
			const h = d.getHours();
			return f.replace("YYYY", d.getFullYear()).replace("DD", p(d.getDate())).replace("MM", p(d.getMonth() + 1))
				.replace("M.D", `${d.getMonth() + 1}.${d.getDate()}`).replace("ddd", DAYS[d.getDay()])
				.replace("HH", p(h)).replace("h:mm", `${h % 12 || 12}:${p(d.getMinutes())}`).replace("mm", p(d.getMinutes()))
				.replace(" a", h < 12 ? " am" : " pm");
		}
	};
}

function load (globalConfig, moduleConfig) {
	let def;
	const ctx = {
		Module: { register: (name, d) => { def = d; } },
		Log: { info () {}, log () {} },
		config: globalConfig,
		moment,
		document: { createElement: (t) => new El(t) },
		setInterval: () => 1,
		console
	};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "MMM-NOAAV4.js"), "utf8"), ctx);
	const m = Object.create(def);
	m.name = "MMM-NOAAV4";
	m.identifier = "module_1_MMM-NOAAV4";
	m.data = { path: "modules/MMM-NOAAV4/" };
	m.config = { ...def.defaults, ...moduleConfig };
	m.sent = [];
	m.sendSocketNotification = (n, p) => m.sent.push([n, p]);
	m.sendNotification = () => {};
	m.updateDom = () => {};
	m.translate = (k) => k;
	m.file = (f) => `${m.data.path}/${f}`.replace("//", "/");
	m.start();
	return m;
}

const now = Date.now();
const payload = {
	identifier: "module_1_MMM-NOAAV4",
	provider: "nws",
	current: { desc: "Mostly Cloudy", icon: "mostlycloudy", tempC: 10.6, humidity: 61, pressureMb: 1017.3, visibilityKm: 16.09, windKph: 14.8, uv: 3.4, summary: "Partly sunny <b>today</b>" },
	forecast: [
		{ day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()], icon: "partlycloudy", desc: "Partly Sunny", highC: 11.1, lowC: 2.2 },
		{ day: "Mon", icon: "rain", desc: "Rain", highC: 8.3, lowC: -1.1 },
		{ day: "Tue", icon: "mostlycloudy", desc: "Mostly Cloudy", highC: 3.3, lowC: -3.9 },
		{ day: "Wed", icon: "mostlysunny", desc: "Sunny", highC: 6.7, lowC: -2.2 }
	],
	sun: { sunrise: new Date(now - 3600e3).toISOString(), sunset: new Date(now + 3600e3).toISOString(), daylightSeconds: 35100 },
	aqi: 42,
	moon: "Waxing Crescent",
	alerts: [{ title: "Winter Weather Advisory", severity: "Moderate", description: "Snow expected", regions: ["Chemung", "Steuben"] }],
	updated: new Date().toISOString()
};

test("loading message before data, and init is sent with identifier", () => {
	const m = load({ units: "imperial", timeFormat: 12, language: "en" }, { lat: 42, lon: -76, provider: "nws" });
	assert.equal(m.sent[0][0], "NOAA3_INIT");
	assert.equal(m.sent[0][1].identifier, "module_1_MMM-NOAAV4");
	assert.equal(m.sent[0][1].config.lang, "en");
	assert.match(m.getDom().outerHTML, /Gathering your weather info/);
});

test("error message shows when there is no data", () => {
	const m = load({ units: "imperial" }, {});
	m.socketNotificationReceived("NOAA3_ERROR", { identifier: m.identifier, message: "Set lat and lon" });
	assert.match(m.getDom().outerHTML, /MMM-NOAAV4: Set lat and lon/);
});

test("ignores data for other instances", () => {
	const m = load({ units: "imperial" }, {});
	m.socketNotificationReceived("NOAA3_DATA", { ...payload, identifier: "other" });
	assert.match(m.getDom().outerHTML, /Gathering/);
});

const card = { ...payload, current: { ...payload.current, feelsLikeC: 8.9, windDeg: 225, pressureTrend: "Steady" } };

test("white card is the default; dark is the option; one stylesheet", () => {
	const m = load({ units: "imperial" }, {});
	assert.deepEqual(m.getStyles(), ["modules/MMM-NOAAV4/css/MMM-NOAAV4.css"]);
	m.socketNotificationReceived("NOAA3_DATA", card);
	assert.match(m.getDom().outerHTML, /^<div class="nl">/);
	const d = load({ units: "imperial" }, { css: "dark" });
	d.socketNotificationReceived("NOAA3_DATA", card);
	assert.match(d.getDom().outerHTML, /^<div class="nl nl-dark">/);
	const old = load({ units: "imperial" }, { css: "NOAA3" });
	old.socketNotificationReceived("NOAA3_DATA", card);
	assert.match(old.getDom().outerHTML, /^<div class="nl">/, "old style names fall back to the white card");
});

test("imperial daytime: header, 3-day forecast, details row, alert", () => {
	const m = load({ units: "imperial", timeFormat: 12, language: "en" }, { title: "Home Weather" });
	m.socketNotificationReceived("NOAA3_DATA", card);
	const html = m.getDom().outerHTML;
	fs.writeFileSync(path.join(__dirname, "render-card.html"), html);
	assert.match(html, /nl-desc">Mostly Cloudy/);
	assert.match(html, /nl-place">Home Weather/);
	assert.match(html, /nl-temp">51&deg;F/);
	assert.match(html, /nl-sub">52 &deg;F \/ 36 &deg;F/, "today's high / low");
	assert.match(html, /<svg class="nl-svg"/);
	assert.equal((html.match(/class="nl-day"/g) || []).length, 3);
	assert.doesNotMatch(html, /nl-dname">Today/);
	assert.match(html, /nl-dname">Mon<.*nl-hi">47&deg;.*nl-lo">30&deg;/s);
	assert.match(html, /Humidity<\/div>\s*<div class="nl-ivalue">61%/);
	assert.match(html, /Wind<\/div>\s*<div class="nl-ivalue">9 mph <span class="nl-iextra">SW/);
	assert.match(html, /AQI<\/div>\s*<div class="nl-ivalue">42 <span class="nl-iextra">Good/);
	assert.match(html, /UV Index<\/div>\s*<div class="nl-ivalue">3 <span class="nl-iextra">Moderate/);
	assert.doesNotMatch(html, /Pressure/);
	assert.match(html, /Winter Weather Advisory/);
	assert.match(html, /&lt;b&gt;|Mostly Cloudy/);
	assert.doesNotMatch(html, /NaN|undefined|null/);
});

test("metric at night shows the moon icon", () => {
	const m = load({ units: "metric", timeFormat: 24, language: "en" }, {});
	const night = { ...card, current: { ...card.current, icon: "clear", desc: "Clear" }, sun: { sunrise: new Date(now + 3600e3).toISOString(), sunset: new Date(now + 7200e3).toISOString(), daylightSeconds: 30000 }, alerts: [] };
	m.socketNotificationReceived("NOAA3_DATA", night);
	const html = m.getDom().outerHTML;
	assert.match(html, /nl-temp">11&deg;C/);
	assert.match(html, /15 km\/h <span class="nl-iextra">SW/);
	assert.match(html, /M27 6a14/, "moon shape, not the sun");
	assert.doesNotMatch(html, /nl-alert/);
});

test("forecastDays: 0 shows humidity and one decimal; details: false hides the row", () => {
	const m = load({ units: "imperial", timeFormat: 12, language: "en" }, { forecastDays: 0, details: false, title: "Porch" });
	m.socketNotificationReceived("NOAA3_DATA", { ...card, alerts: [] });
	const html = m.getDom().outerHTML;
	assert.match(html, /nl-temp">51\.1&deg;F/);
	assert.match(html, /Humidity 61 %/);
	assert.match(html, /nl-place">Porch/);
	assert.doesNotMatch(html, /nl-day|nl-details|nl-alert/);
});

test("missing values show -- instead of NaN/undefined", () => {
	const m = load({ units: "imperial", timeFormat: 12 }, {});
	m.socketNotificationReceived("NOAA3_DATA", { ...payload, current: { desc: "Clear", icon: "clear", tempC: 5 }, aqi: null, sun: null, alerts: [], forecast: [] });
	const html = m.getDom().outerHTML;
	assert.doesNotMatch(html, /NaN|undefined|null/);
	assert.match(html, /41&deg;F/);
	assert.match(html, /--/);
});

test("text from the weather service is escaped", () => {
	const m = load({ units: "imperial" }, {});
	m.socketNotificationReceived("NOAA3_DATA", { ...card, current: { ...card.current, desc: "<b>Hot</b>" } });
	assert.match(m.getDom().outerHTML, /&lt;b&gt;Hot&lt;\/b&gt;/);
});

test("daytime: sun row shows sunrise, a seconds countdown to sunset, and sunset", () => {
	const m = load({ units: "imperial", timeFormat: 24 }, {});
	m.socketNotificationReceived("NOAA3_DATA", card);
	const html = m.getDom().outerHTML;
	assert.match(html, /class="nl-sunrow"/);
	assert.match(html, /fa-arrow-up.*Sunrise/s);
	assert.match(html, /fa-hourglass-half.*Day left<\/div>\s*<div class="nl-ivalue nl-countdown">0:59:\d\d/s, "sunset is 1 hour away");
	assert.match(html, /fa-arrow-down.*Sunset/s);
	assert.doesNotMatch(html, /nl-night/);
});

test("after sunset (or before sunrise) the middle cell says Night with a moon", () => {
	const m = load({ units: "imperial", timeFormat: 24 }, {});
	const after = { ...card, sun: { sunrise: new Date(now - 7200e3).toISOString(), sunset: new Date(now - 60e3).toISOString() } };
	m.socketNotificationReceived("NOAA3_DATA", after);
	const html = m.getDom().outerHTML;
	assert.match(html, /fa-moon.*nl-ivalue nl-night">Night/s);
	assert.doesNotMatch(html, /hourglass|nl-countdown/);
});

test("sun: false hides the sun row; countdown formats h:mm:ss", () => {
	const m = load({ units: "imperial" }, { sun: false });
	m.socketNotificationReceived("NOAA3_DATA", card);
	assert.doesNotMatch(m.getDom().outerHTML, /nl-sunrow/);
	assert.equal(m.countdown((4 * 3600 + 12 * 60 + 9) * 1000), "4:12:09");
	assert.equal(m.countdown(-5000), "0:00:00");
});

test("card is 330px wide by default; width option changes it", () => {
	const a = load({ units: "imperial" }, {});
	a.socketNotificationReceived("NOAA3_DATA", card);
	assert.equal(a.getDom().style.width, "330px");
	const b = load({ units: "imperial" }, { width: 300 });
	b.socketNotificationReceived("NOAA3_DATA", card);
	assert.equal(b.getDom().style.width, "300px");
});
