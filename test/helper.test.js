// Run with:  NODE_PATH=test/stubs/node_modules node --test test/
const test = require("node:test");
const assert = require("node:assert");
const fx = require("./fixtures");
const util = require("../lib/util");

const calls = [];
function route (url) {
	const u = new URL(url);
	if (u.host === "api.open-meteo.com") return fx.openmeteo;
	if (u.host === "air-quality-api.open-meteo.com") return fx.aqi;
	if (u.host === "api.weather.gov") {
		if (u.pathname.startsWith("/points/")) return fx.nwsPoint;
		if (u.pathname.endsWith("/forecast")) return fx.nwsForecast;
		if (u.pathname.endsWith("/stations")) return fx.nwsStations;
		if (u.pathname.includes("KELM")) return fx.nwsObsEmpty; // first station has no temp
		if (u.pathname.includes("KAVP")) return fx.nwsObs;
		if (u.pathname.startsWith("/alerts/active")) return fx.nwsAlerts;
	}
	if (u.host === "api.pirateweather.net") return fx.pirate;
	if (u.host === "api.openweathermap.org") return u.pathname.endsWith("/weather") ? fx.owmWeather : fx.owmForecast;
	if (u.host === "api.weatherbit.io") return u.pathname.endsWith("/current") ? fx.wbCurrent : fx.wbDaily;
	if (u.host === "dataservice.accuweather.com") return u.pathname.includes("currentconditions") ? fx.accuCurrent : fx.accuDaily;
	return null;
}
global.fetch = async (url, opts) => {
	calls.push({ url: String(url), opts });
	const body = route(String(url));
	return { ok: !!body, status: body ? 200 : 404, json: async () => body };
};

const helper = require("../node_helper");

async function run (config) {
	helper.start();
	helper.sent = [];
	helper.socketNotificationReceived("NOAA3_INIT", { identifier: "m1", config });
	for (let i = 0; i < 50 && helper.sent.length === 0; i++) await new Promise((r) => setTimeout(r, 5));
	helper.stop();
	return helper.sent[0];
}

function checkShape (data) {
	assert.ok(data.current, "current");
	assert.equal(typeof data.current.tempC, "number");
	assert.ok(data.current.icon && data.current.icon !== "unknown", `current icon (${data.current.icon})`);
	assert.equal(data.forecast.length, 4, "4 forecast days");
	for (const f of data.forecast) {
		assert.ok(util.DAYS.includes(f.day), `day ${f.day}`);
		assert.equal(typeof f.highC, "number");
		assert.equal(typeof f.lowC, "number");
		assert.ok(f.highC >= f.lowC, "high >= low");
		assert.ok(f.icon && f.icon !== "unknown", `forecast icon (${f.icon})`);
	}
	assert.ok(data.sun && data.sun.sunrise && data.sun.sunset, "sun times");
	assert.equal(data.aqi, 42);
	assert.ok(typeof data.moon === "string");
}

const LOC = { lat: 42.09, lon: -76.84 };

test("openmeteo (default, no key)", async () => {
	const [n, d] = await run({ ...LOC });
	assert.equal(n, "NOAA3_DATA");
	checkShape(d);
	assert.equal(d.provider, "openmeteo");
	assert.equal(d.current.uv, 3.4);
	assert.equal(d.sun.daylightSeconds, 35101);
	assert.equal(d.alerts.length, 1, "NWS alerts attached");
});

test("old userlat/userlon config still works", async () => {
	const [n, d] = await run({ userlat: "42.09", userlon: "-76.84" });
	assert.equal(n, "NOAA3_DATA");
	checkShape(d);
});

test("nws (NOAA) - skips a station with no reading", async () => {
	calls.length = 0;
	const [n, d] = await run({ ...LOC, provider: "nws" });
	assert.equal(n, "NOAA3_DATA");
	checkShape(d);
	assert.equal(d.current.desc, "Mostly Cloudy");
	assert.equal(d.current.pressureMb, 1017.3);
	assert.equal(d.forecast[0].icon, "partlycloudy");
	assert.equal(Math.round(d.forecast[0].highC * 9 / 5 + 32), 52);
	assert.equal(Math.round(d.forecast[0].lowC * 9 / 5 + 32), 36);
	assert.equal(d.current.uv, 3.4, "UV filled in from Open-Meteo");
	const nwsCall = calls.find((c) => c.url.includes("api.weather.gov"));
	assert.match(nwsCall.opts.headers["User-Agent"], /MMM-NOAA3/);
});

test("darksky config is routed to pirateweather and uses its alerts", async () => {
	const [n, d] = await run({ ...LOC, provider: "darksky", apiKey: "k" });
	assert.equal(n, "NOAA3_DATA");
	checkShape(d);
	assert.equal(d.provider, "pirateweather");
	assert.equal(d.alerts[0].title, "Flood Watch");
	assert.equal(d.current.humidity, 71);
	assert.equal(Math.round(d.current.windKph), 16);
});

test("openweather (free endpoints)", async () => {
	const [n, d] = await run({ ...LOC, provider: "openweather", apiKey: "k" });
	assert.equal(n, "NOAA3_DATA");
	checkShape(d);
	assert.equal(d.current.desc, "Broken clouds");
	assert.equal(d.current.uv, 3.4);
});

test("weatherbit", async () => {
	const [n, d] = await run({ ...LOC, provider: "weatherbit", apiKey: "k" });
	assert.equal(n, "NOAA3_DATA");
	checkShape(d);
	assert.equal(d.forecast[1].icon, "rain");
});

test("accuweather with zip = location key", async () => {
	calls.length = 0;
	const [n, d] = await run({ ...LOC, provider: "accuweather", apiKey: "k", zip: "330275" });
	assert.equal(n, "NOAA3_DATA");
	checkShape(d);
	assert.ok(calls.some((c) => c.url.includes("/currentconditions/v1/330275")));
});

test("retired providers fall back to openmeteo", async () => {
	for (const p of ["wunderground", "apixu", "msn", "weatherunlocked", "Yahoo"]) {
		const [n, d] = await run({ ...LOC, provider: p });
		assert.equal(n, "NOAA3_DATA");
		assert.equal(d.provider, "openmeteo");
	}
});

test("missing location gives a clear error", async () => {
	const [n, p] = await run({ provider: "openmeteo" });
	assert.equal(n, "NOAA3_ERROR");
	assert.match(p.message, /lat and lon/);
});

test("missing key gives a clear error", async () => {
	const [n, p] = await run({ ...LOC, provider: "openweather" });
	assert.equal(n, "NOAA3_ERROR");
	assert.match(p.message, /apiKey/);
});

test("air quality failure does not break the update", async () => {
	const orig = global.fetch;
	global.fetch = async (url, o) => (String(url).includes("air-quality") ? { ok: false, status: 503 } : orig(url, o));
	const [n, d] = await run({ ...LOC });
	global.fetch = orig;
	assert.equal(n, "NOAA3_DATA");
	assert.equal(d.aqi, null);
});

test("moon phase matches known dates", () => {
	assert.equal(util.moonPhase(new Date("2024-04-08T18:00:00Z")), "New Moon");   // solar eclipse
	assert.equal(util.moonPhase(new Date("2024-04-23T23:49:00Z")), "Full Moon");
	assert.equal(util.moonPhase(new Date("2024-04-15T19:13:00Z")), "First Quarter");
	assert.equal(util.moonPhase(new Date("2024-05-01T11:27:00Z")), "Last Quarter");
});

test("every icon the providers can return exists in images/", () => {
	const fs = require("node:fs");
	const path = require("node:path");
	const files = new Set(fs.readdirSync(path.join(__dirname, "..", "images")));
	const names = new Set();
	for (let i = 0; i <= 99; i++) names.add(util.iconFromWmo(i));
	for (let i = 0; i <= 44; i++) names.add(util.iconFromAccu(i));
	for (let i = 200; i <= 900; i++) names.add(util.iconFromWeatherbit(i));
	["01d", "02d", "03d", "04d", "09d", "10d", "11d", "13d", "50d"].forEach((c) => names.add(util.iconFromOwm(c)));
	["skc", "few", "sct", "bkn", "ovc", "rain", "snow", "tsra", "fog", "haze", "wind_bkn", "fzra", "hot"].forEach((t) => names.add(util.iconFromNws(`https://x/icons/land/day/${t}`)));
	for (const n of names) {
		assert.ok(files.has(`${n}.png`), `images/${n}.png missing`);
		if (n !== "unknown") assert.ok(files.has(`nt_${n}.png`), `images/nt_${n}.png missing`);
	}
});
