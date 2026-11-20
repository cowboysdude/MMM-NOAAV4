// Renders MMM-NOAAV4.js getDom() with a tiny fake DOM and checks the output.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class El {
	constructor (tag) { this.tag = tag; this.children = []; this.attrs = {}; this.innerHTML = ""; this.className = ""; const self = this; this.classList = { add: (...c) => { self.className = [self.className, ...c].filter(Boolean).join(" "); } }; }
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

test("imperial, 12-hour, daytime render", () => {
	const m = load({ units: "imperial", timeFormat: 12, language: "en" }, { css: "NOAA3", nupdate: true });
	m.socketNotificationReceived("NOAA3_DATA", payload);
	const html = m.getDom().outerHTML;
	fs.writeFileSync(path.join(__dirname, "render-imperial.html"), html);
	assert.match(html, /51&deg;/, "10.6C -> 51F");
	assert.match(html, /30\.04 inHg/);
	assert.match(html, /10 Mi/);
	assert.match(html, /9 mph/);
	assert.match(html, />42</, "AQI");
	assert.match(html, />3</, "UV in daytime");
	assert.match(html, /images\/mostlycloudy\.png/, "day icon");
	assert.match(html, /Today/);
	assert.match(html, /52\/36/);
	assert.match(html, /Winter Weather Advisory/);
	assert.match(html, /Chemung, Steuben/);
	assert.match(html, /9:45/, "daylight h:mm");
	assert.match(html, /Updated:/);
	assert.match(html, /&lt;b&gt;today&lt;\/b&gt;/, "text is escaped");
	assert.deepEqual(m.getStyles(), ["modules/MMM-NOAAV4/css/MMM-NOAA3.css"]);
});

test("metric, 24-hour, night render shows moon and night icon", () => {
	const m = load({ units: "metric", timeFormat: 24, language: "en" }, {});
	const night = { ...payload, sun: { sunrise: new Date(now + 3600e3).toISOString(), sunset: new Date(now + 7200e3).toISOString(), daylightSeconds: 30000 }, alerts: [] };
	m.socketNotificationReceived("NOAA3_DATA", night);
	const html = m.getDom().outerHTML;
	assert.match(html, /11&deg;/);
	assert.match(html, /1017 mb/);
	assert.match(html, /16 Km/);
	assert.match(html, /15 km\/h/);
	assert.match(html, /images\/nt_mostlycloudy\.png/);
	assert.match(html, /images\/moon\/waxingcrescent\.png/);
	assert.match(html, />Night</);
	assert.doesNotMatch(html, /Advisory/);
	assert.deepEqual(m.getStyles(), ["modules/MMM-NOAAV4/css/MMM-NOAA4.css"]);
});

test("missing values show -- instead of NaN/undefined", () => {
	const m = load({ units: "imperial", timeFormat: 12 }, {});
	m.socketNotificationReceived("NOAA3_DATA", { ...payload, current: { desc: "Clear", icon: "clear", tempC: 5 }, aqi: null, sun: null, alerts: [] });
	const html = m.getDom().outerHTML;
	assert.doesNotMatch(html, /NaN|undefined|null/);
	assert.match(html, /--/);
});

test("overriding one moon picture keeps the others", () => {
	const m = load({ units: "imperial" }, { moon: { "Full Moon": "images/moon/mine.png" } });
	assert.equal(m.config.moon["Full Moon"], "images/moon/mine.png");
	assert.equal(m.config.moon["New Moon"], "images/moon/newmoon.png");
});
