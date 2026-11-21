/* MMM-NOAA3 provider: Weatherbit (API key) - https://www.weatherbit.io */
const { fetchJson, iconFromWeatherbit, DAYS } = require("../lib/util");

async function getWeather (cfg) {
	if (!cfg.apiKey) throw new Error("Weatherbit needs an apiKey (weatherbit.io)");
	const q = `lat=${cfg.lat}&lon=${cfg.lon}&units=M&lang=${encodeURIComponent(cfg.lang || "en")}&key=${encodeURIComponent(cfg.apiKey)}`;
	const [cur, fc] = await Promise.all([
		fetchJson(`https://api.weatherbit.io/v2.0/current?${q}`),
		fetchJson(`https://api.weatherbit.io/v2.0/forecast/daily?days=4&${q}`)
	]);
	const c = (cur.data && cur.data[0]) || {};
	const forecast = (fc.data || []).slice(0, 6).map((d) => ({
		day: DAYS[new Date(`${d.valid_date}T12:00:00Z`).getUTCDay()],
		icon: iconFromWeatherbit(d.weather && d.weather.code),
		desc: d.weather && d.weather.description,
		highC: d.max_temp,
		lowC: d.min_temp
	}));
	return {
		current: {
			desc: c.weather && c.weather.description,
			icon: iconFromWeatherbit(c.weather && c.weather.code),
			tempC: c.temp,
			humidity: c.rh,
			pressureMb: c.slp !== undefined ? c.slp : c.pres,
			visibilityKm: c.vis,
			windKph: c.wind_spd !== undefined ? c.wind_spd * 3.6 : null,
			uv: c.uv,
			isDay: c.pod ? c.pod === "d" : undefined,
			summary: forecast[0] ? forecast[0].desc : ""
		},
		forecast
	};
}

module.exports = { getWeather };
