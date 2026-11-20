/* MMM-NOAAV4 - shared helpers (server side)
 * Every provider returns data in metric units; the front end converts.
 */
const USER_AGENT = "MMM-NOAA3/4.0 (https://github.com/cowboysdude/MMM-NOAA3)";

/**
 * GET a URL and parse JSON. Throws a readable error on HTTP or network failure.
 * @param {string} url
 * @param {object} [headers]
 * @returns {Promise<any>}
 */
async function fetchJson (url, headers = {}) {
	const res = await fetch(url, {
		headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
		signal: AbortSignal.timeout(20000)
	});
	if (!res.ok) {
		const host = new URL(url).host;
		throw new Error(`${host} answered HTTP ${res.status}`);
	}
	return res.json();
}

// ---------------------------------------------------------------- icons
// Icon names match the files in images/ (night versions are prefixed nt_).

/** WMO weather codes (Open-Meteo) -> icon */
function iconFromWmo (code) {
	const c = Number(code);
	if (c === 0) return "clear";
	if (c === 1) return "mostlysunny";
	if (c === 2) return "partlycloudy";
	if (c === 3) return "cloudy";
	if (c === 45 || c === 48) return "fog";
	if (c >= 51 && c <= 55) return "drizzle";
	if (c === 56 || c === 57 || c === 66 || c === 67) return "sleet";
	if (c >= 61 && c <= 65) return "rain";
	if (c >= 71 && c <= 75) return "snow";
	if (c === 77) return "flurries";
	if (c === 80) return "chancerain";
	if (c === 81 || c === 82) return "rain";
	if (c === 85) return "chancesnow";
	if (c === 86) return "snow";
	if (c >= 95) return "tstorms";
	return "unknown";
}

const WMO_TEXT = {
	0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Cloudy", 45: "Fog", 48: "Freezing Fog",
	51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle", 56: "Freezing Drizzle", 57: "Freezing Drizzle",
	61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 66: "Freezing Rain", 67: "Freezing Rain",
	71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow Grains",
	80: "Showers", 81: "Showers", 82: "Heavy Showers", 85: "Snow Showers", 86: "Heavy Snow Showers",
	95: "Thunderstorms", 96: "Thunderstorms, Hail", 99: "Thunderstorms, Hail"
};
const textFromWmo = (code) => WMO_TEXT[Number(code)] || "—";

/** NWS icon URL (https://api.weather.gov/icons/land/day/rain,40/tsra?size=medium) -> icon */
function iconFromNws (url) {
	if (!url) return "unknown";
	const m = String(url).match(/\/(?:day|night)\/([a-z_]+)/);
	const t = m ? m[1] : "";
	const map = {
		skc: "clear", few: "mostlysunny", sct: "partlycloudy", bkn: "mostlycloudy", ovc: "cloudy",
		wind_skc: "wind", wind_few: "wind", wind_sct: "wind", wind_bkn: "wind", wind_ovc: "wind",
		snow: "snow", blizzard: "snow", rain_snow: "sleet", rain_sleet: "sleet", snow_sleet: "sleet",
		fzra: "sleet", rain_fzra: "sleet", snow_fzra: "sleet", sleet: "sleet",
		rain: "rain", rain_showers: "chancerain", rain_showers_hi: "chancerain",
		tsra: "tstorms", tsra_sct: "chancetstorms", tsra_hi: "chancetstorms",
		tornado: "tstorms", hurricane: "tstorms", tropical_storm: "tstorms",
		dust: "hazy", smoke: "hazy", haze: "hazy", hot: "sunny", cold: "clear", fog: "fog"
	};
	return map[t] || "unknown";
}

/** Pirate Weather (Dark Sky format) icon -> icon */
function iconFromPirate (icon) {
	const map = {
		"clear-day": "clear", "clear-night": "clear", "partly-cloudy-day": "partlycloudy",
		"partly-cloudy-night": "partlycloudy", cloudy: "cloudy", rain: "rain", snow: "snow",
		sleet: "sleet", wind: "wind", fog: "fog", thunderstorm: "tstorms", hail: "sleet",
		"mostly-clear-day": "mostlysunny", "mostly-clear-night": "mostlysunny",
		"mostly-cloudy-day": "mostlycloudy", "mostly-cloudy-night": "mostlycloudy",
		drizzle: "drizzle", "light-rain": "chancerain", "heavy-rain": "rain", flurries: "flurries",
		"light-snow": "chancesnow", "heavy-snow": "snow", "very-light-sleet": "sleet",
		"light-sleet": "sleet", "heavy-sleet": "sleet", mixed: "sleet", haze: "hazy", smoke: "hazy",
		"breezy": "breezy", "dangerous-wind": "wind"
	};
	return map[icon] || "unknown";
}

/** OpenWeather icon code (e.g. "10d") -> icon */
function iconFromOwm (code) {
	const map = {
		"01": "clear", "02": "mostlysunny", "03": "partlycloudy", "04": "mostlycloudy",
		"09": "chancerain", 10: "rain", 11: "tstorms", 13: "snow", 50: "fog"
	};
	return map[String(code || "").slice(0, 2)] || "unknown";
}

/** Weatherbit weather.code -> icon */
function iconFromWeatherbit (code) {
	const c = Number(code);
	if (c >= 200 && c < 300) return "tstorms";
	if (c >= 300 && c < 400) return "drizzle";
	if (c === 511 || (c >= 610 && c <= 612)) return "sleet";
	if (c >= 520 && c <= 522) return "chancerain";
	if (c >= 500 && c < 600) return "rain";
	if (c === 623) return "flurries";
	if (c >= 600 && c < 700) return "snow";
	if (c === 711 || c === 721 || c === 731) return "hazy";
	if (c >= 700 && c < 800) return "fog";
	if (c === 800) return "clear";
	if (c === 801) return "mostlysunny";
	if (c === 802) return "partlycloudy";
	if (c === 803) return "mostlycloudy";
	if (c === 804) return "overcast";
	if (c === 900) return "rain";
	return "unknown";
}

/** AccuWeather icon number (1-44) -> icon */
function iconFromAccu (n) {
	const map = {
		1: "sunny", 2: "mostlysunny", 3: "partlycloudy", 4: "partlycloudy", 5: "hazy", 6: "mostlycloudy",
		7: "cloudy", 8: "overcast", 11: "fog", 12: "chancerain", 13: "chancerain", 14: "chancerain",
		15: "tstorms", 16: "chancetstorms", 17: "chancetstorms", 18: "rain", 19: "flurries", 20: "flurries",
		21: "flurries", 22: "snow", 23: "snow", 24: "sleet", 25: "sleet", 26: "sleet", 29: "sleet",
		30: "sunny", 31: "clear", 32: "wind", 33: "clear", 34: "mostlysunny", 35: "partlycloudy",
		36: "partlycloudy", 37: "hazy", 38: "mostlycloudy", 39: "chancerain", 40: "chancerain",
		41: "chancetstorms", 42: "chancetstorms", 43: "flurries", 44: "snow"
	};
	return map[Number(n)] || "unknown";
}

// ---------------------------------------------------------------- moon
/**
 * Moon phase name for a date, calculated locally (no API needed).
 * @param {Date} [date]
 * @returns {string} one of the names in MMM-NOAA3.js `moon` map
 */
function moonPhase (date = new Date()) {
	const synodic = 29.530588853;
	const knownNew = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // a known new moon
	let age = ((date.getTime() / 86400000 - knownNew) % synodic) / synodic;
	if (age < 0) age += 1;
	if (age < 0.0339 || age >= 0.9661) return "New Moon";
	if (age < 0.216) return "Waxing Crescent";
	if (age < 0.284) return "First Quarter";
	if (age < 0.466) return "Waxing Gibbous";
	if (age < 0.534) return "Full Moon";
	if (age < 0.716) return "Waning Gibbous";
	if (age < 0.784) return "Last Quarter";
	return "Waning Crescent";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const round = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? null : Math.round(Number(n)));

module.exports = {
	USER_AGENT, fetchJson, iconFromWmo, textFromWmo, iconFromNws, iconFromPirate, iconFromOwm,
	iconFromWeatherbit, iconFromAccu, moonPhase, DAYS, round
};
