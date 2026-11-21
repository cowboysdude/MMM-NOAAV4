/* MMM-NOAA3 provider: NOAA / National Weather Service (USA only, free, no key)
 * https://www.weather.gov/documentation/services-web-api
 */
const { fetchJson, iconFromNws, DAYS } = require("../lib/util");

const GEO = { Accept: "application/geo+json" };
const pointCache = new Map(); // "lat,lon" -> { forecast, stations, expires }

async function getPoint (cfg) {
	const key = `${Number(cfg.lat).toFixed(4)},${Number(cfg.lon).toFixed(4)}`;
	const hit = pointCache.get(key);
	if (hit && hit.expires > Date.now()) return hit;
	const p = await fetchJson(`https://api.weather.gov/points/${key}`, GEO);
	const info = {
		forecast: p.properties.forecast,
		stations: p.properties.observationStations,
		expires: Date.now() + 24 * 3600 * 1000
	};
	pointCache.set(key, info);
	return info;
}

const v = (q) => (q && q.value !== null && q.value !== undefined ? q.value : null);

async function getWeather (cfg) {
	const point = await getPoint(cfg);
	const [fc, st] = await Promise.all([
		fetchJson(point.forecast, GEO),
		fetchJson(point.stations, GEO)
	]);

	// latest observation from the nearest station that has one
	let obs = null;
	for (const s of (st.features || []).slice(0, 3)) {
		try {
			const o = await fetchJson(`${s.id}/observations/latest`, GEO);
			if (v(o.properties.temperature) !== null) {
				obs = o.properties;
				break;
			}
		} catch (e) { /* try the next station */ }
	}

	// pair day/night periods into days (temperatures come in °F)
	const toC = (f) => (f === null || f === undefined ? null : (f - 32) * 5 / 9);
	const periods = (fc.properties && fc.properties.periods) || [];
	const days = [];
	for (const p of periods) {
		const date = p.startTime.slice(0, 10);
		let d = days.find((x) => x.date === date);
		if (!d) {
			d = { date, day: DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()] };
			days.push(d);
		}
		const tC = p.temperatureUnit === "C" ? p.temperature : toC(p.temperature);
		if (p.isDaytime) {
			d.highC = tC;
			d.icon = iconFromNws(p.icon);
			d.desc = p.shortForecast;
		} else {
			d.lowC = tC;
			if (!d.icon) {
				d.icon = iconFromNws(p.icon);
				d.desc = p.shortForecast;
			}
		}
	}
	const forecast = days.slice(0, 6).map((d) => ({
		day: d.day, icon: d.icon, desc: d.desc,
		highC: d.highC !== undefined ? d.highC : d.lowC,
		lowC: d.lowC !== undefined ? d.lowC : d.highC
	}));

	const first = periods[0] || {};
	const current = obs
		? {
			desc: obs.textDescription || first.shortForecast,
			icon: obs.icon ? iconFromNws(obs.icon) : iconFromNws(first.icon),
			tempC: v(obs.temperature),
			humidity: v(obs.relativeHumidity) !== null ? Math.round(v(obs.relativeHumidity)) : null,
			pressureMb: v(obs.barometricPressure) !== null ? v(obs.barometricPressure) / 100 : null,
			visibilityKm: v(obs.visibility) !== null ? v(obs.visibility) / 1000 : null,
			windKph: v(obs.windSpeed),
			windDeg: v(obs.windDirection),
			summary: first.detailedForecast || ""
		}
		: {
			desc: first.shortForecast, icon: iconFromNws(first.icon), tempC: toC(first.temperature),
			humidity: v(first.relativeHumidity), pressureMb: null, visibilityKm: null, windKph: null,
			summary: first.detailedForecast || ""
		};
	return { current, forecast };
}

/** Active NWS alerts for the location (US only; returns [] elsewhere). */
async function getAlerts (cfg) {
	const d = await fetchJson(`https://api.weather.gov/alerts/active?point=${Number(cfg.lat).toFixed(4)},${Number(cfg.lon).toFixed(4)}`, GEO);
	return (d.features || []).map((f) => ({
		title: f.properties.event,
		severity: f.properties.severity,
		description: f.properties.headline || f.properties.description || "",
		regions: String(f.properties.areaDesc || "").split(/;\s*/).filter(Boolean)
	}));
}

module.exports = { getWeather, getAlerts };
