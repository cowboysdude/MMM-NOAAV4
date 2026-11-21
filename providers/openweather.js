/* MMM-NOAA3 provider: OpenWeather (free key) - https://openweathermap.org
 * Uses the free 2.5 "weather" and 5-day/3-hour "forecast" endpoints.
 */
const { fetchJson, iconFromOwm, DAYS } = require("../lib/util");

async function getWeather (cfg) {
	if (!cfg.apiKey) throw new Error("OpenWeather needs an apiKey (free at openweathermap.org)");
	const q = `lat=${cfg.lat}&lon=${cfg.lon}&units=metric&lang=${encodeURIComponent(cfg.lang || "en")}&appid=${encodeURIComponent(cfg.apiKey)}`;
	const [w, f] = await Promise.all([
		fetchJson(`https://api.openweathermap.org/data/2.5/weather?${q}`),
		fetchJson(`https://api.openweathermap.org/data/2.5/forecast?${q}`)
	]);

	// group 3-hour slots into local days
	const tz = (f.city && f.city.timezone) || 0;
	const byDay = new Map();
	for (const s of f.list || []) {
		const local = new Date((s.dt + tz) * 1000);
		const key = local.toISOString().slice(0, 10);
		if (!byDay.has(key)) byDay.set(key, { day: DAYS[local.getUTCDay()], hi: -Infinity, lo: Infinity, slots: [] });
		const d = byDay.get(key);
		d.hi = Math.max(d.hi, s.main.temp_max);
		d.lo = Math.min(d.lo, s.main.temp_min);
		d.slots.push({ hour: local.getUTCHours(), w: s.weather[0] });
	}
	const forecast = [...byDay.values()].slice(0, 6).map((d) => {
		const mid = d.slots.reduce((a, b) => (Math.abs(b.hour - 13) < Math.abs(a.hour - 13) ? b : a));
		return { day: d.day, icon: iconFromOwm(mid.w.icon), desc: mid.w.description, highC: d.hi, lowC: d.lo };
	});

	const cw = (w.weather && w.weather[0]) || {};
	return {
		current: {
			desc: cw.description ? cw.description.replace(/^./, (s) => s.toUpperCase()) : cw.main,
			icon: iconFromOwm(cw.icon),
			tempC: w.main && w.main.temp,
			humidity: w.main && w.main.humidity,
			pressureMb: w.main && w.main.pressure,
			visibilityKm: w.visibility !== undefined ? w.visibility / 1000 : null,
			windKph: w.wind && w.wind.speed !== undefined ? w.wind.speed * 3.6 : null,
			isDay: String(cw.icon || "").endsWith("d"),
			summary: forecast[0] ? forecast[0].desc : ""
		},
		forecast
	};
}

module.exports = { getWeather };
