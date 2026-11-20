/* MMM-NOAA3 provider: AccuWeather (API key + location key) - https://developer.accuweather.com
 * Free keys allow very few calls a day, so keep updateInterval at 60 minutes or more.
 * Set `zip` (or `locationKey`) to the AccuWeather location number from the end of
 * the forecast page address on accuweather.com, e.g. .../weather-forecast/330275
 */
const { fetchJson, iconFromAccu, DAYS } = require("../lib/util");

async function getWeather (cfg) {
	const loc = cfg.locationKey || cfg.zip;
	if (!cfg.apiKey) throw new Error("AccuWeather needs an apiKey");
	if (!loc) throw new Error("AccuWeather needs locationKey (or zip) set to your AccuWeather location number");
	const lang = String(cfg.lang || "en").toLowerCase();
	const auth = { Authorization: `Bearer ${cfg.apiKey}` }; // new keys use the header, old keys the query
	const q = `apikey=${encodeURIComponent(cfg.apiKey)}&language=${lang}&details=true`;
	const base = "https://dataservice.accuweather.com";
	const [cur, fc] = await Promise.all([
		fetchJson(`${base}/currentconditions/v1/${encodeURIComponent(loc)}?${q}`, auth),
		fetchJson(`${base}/forecasts/v1/daily/5day/${encodeURIComponent(loc)}?${q}&metric=true`, auth)
	]);
	const c = (Array.isArray(cur) ? cur[0] : cur) || {};
	const m = (o) => (o && o.Metric ? o.Metric.Value : null);
	const forecast = ((fc && fc.DailyForecasts) || []).slice(0, 4).map((d) => ({
		day: DAYS[new Date(`${d.Date.slice(0, 10)}T12:00:00Z`).getUTCDay()],
		icon: iconFromAccu(d.Day && d.Day.Icon),
		desc: d.Day && d.Day.IconPhrase,
		highC: d.Temperature.Maximum.Value,
		lowC: d.Temperature.Minimum.Value
	}));
	return {
		current: {
			desc: c.WeatherText,
			icon: iconFromAccu(c.WeatherIcon),
			tempC: m(c.Temperature),
			humidity: c.RelativeHumidity,
			pressureMb: m(c.Pressure),
			visibilityKm: m(c.Visibility),
			windKph: c.Wind && c.Wind.Speed ? c.Wind.Speed.Metric.Value : null,
			uv: c.UVIndex,
			isDay: c.IsDayTime,
			summary: fc && fc.Headline ? fc.Headline.Text : ""
		},
		forecast
	};
}

module.exports = { getWeather };
