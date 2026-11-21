/* MMM-NOAA3 provider: Pirate Weather (Dark Sky-compatible, free key) - https://pirateweather.net
 * Old "darksky" configs are routed here; you need a Pirate Weather key.
 */
const { fetchJson, iconFromPirate, DAYS } = require("../lib/util");

async function getWeather (cfg) {
	if (!cfg.apiKey) throw new Error("Pirate Weather needs an apiKey (free at pirateweather.net)");
	const lang = String(cfg.lang || "en").split(/[-_]/)[0];
	const d = await fetchJson(`https://api.pirateweather.net/forecast/${encodeURIComponent(cfg.apiKey)}/${cfg.lat},${cfg.lon}?units=si&exclude=minutely,hourly&lang=${lang}`);
	const c = d.currently || {};
	const offset = (d.offset || 0) * 3600;
	const forecast = ((d.daily && d.daily.data) || []).slice(0, 6).map((x) => ({
		day: DAYS[new Date((x.time + offset) * 1000).getUTCDay()],
		icon: iconFromPirate(x.icon),
		desc: x.summary,
		highC: x.temperatureHigh !== undefined ? x.temperatureHigh : x.temperatureMax,
		lowC: x.temperatureLow !== undefined ? x.temperatureLow : x.temperatureMin
	}));
	return {
		current: {
			desc: c.summary,
			icon: iconFromPirate(c.icon),
			tempC: c.temperature,
			humidity: c.humidity !== undefined ? Math.round(c.humidity * 100) : null,
			pressureMb: c.pressure,
			visibilityKm: c.visibility,
			windKph: c.windSpeed !== undefined ? c.windSpeed * 3.6 : null,
			uv: c.uvIndex,
			summary: (d.daily && d.daily.summary) || ""
		},
		forecast,
		alerts: (d.alerts || []).map((a) => ({
			title: a.title, severity: a.severity, description: a.description || "", regions: a.regions || []
		}))
	};
}

module.exports = { getWeather };
