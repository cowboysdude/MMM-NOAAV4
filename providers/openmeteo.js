/* MMM-NOAA3 provider: Open-Meteo (free, no API key) - https://open-meteo.com
 * Also used by every other provider for sunrise/sunset, daylight and UV.
 */
const { fetchJson, iconFromWmo, textFromWmo, DAYS } = require("../lib/util");

async function getWeather (cfg) {
	const params = new URLSearchParams({
		latitude: cfg.lat,
		longitude: cfg.lon,
		current: "temperature_2m,relative_humidity_2m,weather_code,pressure_msl,wind_speed_10m,is_day,visibility,uv_index",
		daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,uv_index_max",
		timezone: "auto",
		timeformat: "unixtime",
		forecast_days: "5"
	});
	const d = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
	const c = d.current || {};
	const day = d.daily || {};
	const offset = d.utc_offset_seconds || 0;

	const forecast = (day.time || []).slice(0, 4).map((t, i) => ({
		day: DAYS[new Date((t + offset) * 1000).getUTCDay()],
		icon: iconFromWmo(day.weather_code[i]),
		desc: textFromWmo(day.weather_code[i]),
		highC: day.temperature_2m_max[i],
		lowC: day.temperature_2m_min[i]
	}));

	return {
		current: {
			desc: textFromWmo(c.weather_code),
			icon: iconFromWmo(c.weather_code),
			tempC: c.temperature_2m,
			humidity: c.relative_humidity_2m,
			pressureMb: c.pressure_msl,
			visibilityKm: c.visibility !== undefined && c.visibility !== null ? c.visibility / 1000 : null,
			windKph: c.wind_speed_10m,
			uv: c.uv_index !== undefined && c.uv_index !== null ? c.uv_index : (day.uv_index_max || [])[0],
			isDay: c.is_day === 1,
			summary: forecast[0] ? `${forecast[0].desc}` : ""
		},
		forecast,
		sun: day.sunrise && day.sunrise.length
			? {
				sunrise: new Date(day.sunrise[0] * 1000).toISOString(),
				sunset: new Date(day.sunset[0] * 1000).toISOString(),
				daylightSeconds: Math.round(day.daylight_duration[0])
			}
			: null
	};
}

/** US AQI from the Open-Meteo air-quality API (free, no key, worldwide). */
async function getAqi (cfg) {
	const params = new URLSearchParams({ latitude: cfg.lat, longitude: cfg.lon, current: "us_aqi" });
	const d = await fetchJson(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
	return d.current && d.current.us_aqi !== undefined ? Math.round(d.current.us_aqi) : null;
}

module.exports = { getWeather, getAqi };
