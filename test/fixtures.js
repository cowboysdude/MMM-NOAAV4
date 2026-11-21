// Realistic sample API responses (shapes follow each service's documented format).
const now = Math.floor(Date.now() / 1000);
const day0 = now - (now % 86400);
const OM_OFFSET = -18000; // Open-Meteo sample location is UTC-5
const localMidnight = now - ((now + OM_OFFSET) % 86400);

module.exports = {
	openmeteo: {
		utc_offset_seconds: OM_OFFSET,
		current: { time: now, temperature_2m: 10, relative_humidity_2m: 65, weather_code: 2, pressure_msl: 1015.2, wind_speed_10m: 16.1, is_day: 1, visibility: 16093, uv_index: 3.4 },
		// Like the real API with past_days=1 and timeformat=unixtime: times are LOCAL midnights,
		// and slot 0 is YESTERDAY. Yesterday's values are deliberately different so a mix-up shows.
		daily: {
			time: [-1, 0, 1, 2, 3, 4, 5].map((k) => localMidnight + k * 86400),
			weather_code: [95, 2, 61, 71, 0, 95, 3],
			temperature_2m_max: [30, 12, 9, 1, 5, 20, 8],
			temperature_2m_min: [25, 3, 4, -4, -2, 10, 1],
			sunrise: [now - 28 * 3600, now - 4 * 3600, 0, 0, 0, 0, 0],
			sunset: [now - 19 * 3600, now + 5 * 3600, 0, 0, 0, 0, 0],
			daylight_duration: [34000, 35100.5, 0, 0, 0, 0, 0],
			uv_index_max: [9, 3.9, 2, 1, 3, 5, 2]
		}
	},
	aqi: { current: { us_aqi: 42.4 } },
	nwsPoint: { properties: { forecast: "https://api.weather.gov/gridpoints/BGM/56,46/forecast", observationStations: "https://api.weather.gov/gridpoints/BGM/56,46/stations" } },
	nwsForecast: {
		properties: {
			periods: [
				{ name: "Today", startTime: "2026-11-15T09:00:00-05:00", isDaytime: true, temperature: 52, temperatureUnit: "F", shortForecast: "Partly Sunny", detailedForecast: "Partly sunny, with a high near 52.", icon: "https://api.weather.gov/icons/land/day/sct?size=medium" },
				{ name: "Tonight", startTime: "2026-11-15T18:00:00-05:00", isDaytime: false, temperature: 36, temperatureUnit: "F", shortForecast: "Chance Rain", icon: "https://api.weather.gov/icons/land/night/rain,40?size=medium" },
				{ name: "Monday", startTime: "2026-11-16T06:00:00-05:00", isDaytime: true, temperature: 47, temperatureUnit: "F", shortForecast: "Rain", icon: "https://api.weather.gov/icons/land/day/rain,90/rain,70?size=medium" },
				{ name: "Monday Night", startTime: "2026-11-16T18:00:00-05:00", isDaytime: false, temperature: 30, temperatureUnit: "F", shortForecast: "Snow Showers", icon: "https://api.weather.gov/icons/land/night/snow,50?size=medium" },
				{ name: "Tuesday", startTime: "2026-11-17T06:00:00-05:00", isDaytime: true, temperature: 38, temperatureUnit: "F", shortForecast: "Mostly Cloudy", icon: "https://api.weather.gov/icons/land/day/bkn?size=medium" },
				{ name: "Tuesday Night", startTime: "2026-11-17T18:00:00-05:00", isDaytime: false, temperature: 25, temperatureUnit: "F", shortForecast: "Clear", icon: "https://api.weather.gov/icons/land/night/skc?size=medium" },
				{ name: "Wednesday", startTime: "2026-11-18T06:00:00-05:00", isDaytime: true, temperature: 44, temperatureUnit: "F", shortForecast: "Sunny", icon: "https://api.weather.gov/icons/land/day/few?size=medium" },
				{ name: "Wednesday Night", startTime: "2026-11-18T18:00:00-05:00", isDaytime: false, temperature: 28, temperatureUnit: "F", shortForecast: "Clear", icon: "https://api.weather.gov/icons/land/night/skc?size=medium" }
			]
		}
	},
	nwsStations: { features: [{ id: "https://api.weather.gov/stations/KELM" }, { id: "https://api.weather.gov/stations/KAVP" }] },
	nwsObsEmpty: { properties: { temperature: { value: null } } },
	nwsObs: {
		properties: {
			textDescription: "Mostly Cloudy", icon: "https://api.weather.gov/icons/land/day/bkn?size=medium",
			temperature: { value: 10.6 }, relativeHumidity: { value: 61.3 }, barometricPressure: { value: 101730 },
			visibility: { value: 16090 }, windSpeed: { value: 14.8 }
		}
	},
	nwsAlerts: {
		features: [{ properties: { event: "Winter Weather Advisory", severity: "Moderate", headline: "Winter Weather Advisory issued for snow", areaDesc: "Chemung; Steuben; Bradford" } }]
	},
	pirate: {
		offset: -5,
		currently: { summary: "Overcast", icon: "cloudy", temperature: 8.2, humidity: 0.71, pressure: 1012, visibility: 14.2, windSpeed: 4.5, uvIndex: 1 },
		daily: { summary: "Rain later this week.", data: [
			{ time: day0, icon: "cloudy", summary: "Cloudy", temperatureHigh: 9, temperatureLow: 2 },
			{ time: day0 + 86400, icon: "rain", summary: "Rain", temperatureHigh: 7, temperatureLow: 3 },
			{ time: day0 + 2 * 86400, icon: "snow", summary: "Snow", temperatureHigh: 1, temperatureLow: -3 },
			{ time: day0 + 3 * 86400, icon: "clear-day", summary: "Clear", temperatureHigh: 4, temperatureLow: -5 }
		] },
		alerts: [{ title: "Flood Watch", severity: "watch", description: "Flooding possible.", regions: ["Chemung"] }]
	},
	owmWeather: { weather: [{ main: "Clouds", description: "broken clouds", icon: "04d" }], main: { temp: 9.5, humidity: 70, pressure: 1014 }, visibility: 10000, wind: { speed: 3.6 } },
	owmForecast: {
		city: { timezone: -18000 },
		list: Array.from({ length: 40 }, (_, i) => ({
			dt: day0 + 5 * 3600 + i * 3 * 3600,
			main: { temp_max: 5 + (i % 8), temp_min: (i % 8) - 2 },
			weather: [{ icon: i % 8 === 3 ? "10d" : "02d", description: i % 8 === 3 ? "light rain" : "few clouds" }]
		}))
	},
	wbCurrent: { data: [{ temp: 7.5, rh: 68, slp: 1016, vis: 16, wind_spd: 2.5, uv: 2.1, pod: "d", weather: { code: 803, description: "Broken clouds" } }] },
	wbDaily: { data: [
		{ valid_date: "2026-11-15", max_temp: 10, min_temp: 2, weather: { code: 803, description: "Broken clouds" } },
		{ valid_date: "2026-11-16", max_temp: 8, min_temp: 3, weather: { code: 500, description: "Light rain" } },
		{ valid_date: "2026-11-17", max_temp: 2, min_temp: -2, weather: { code: 601, description: "Snow" } },
		{ valid_date: "2026-11-18", max_temp: 6, min_temp: -1, weather: { code: 800, description: "Clear sky" } }
	] },
	accuCurrent: [{ WeatherText: "Mostly cloudy", WeatherIcon: 6, IsDayTime: true, Temperature: { Metric: { Value: 9.4 } }, RelativeHumidity: 66, Pressure: { Metric: { Value: 1015 } }, Visibility: { Metric: { Value: 16.1 } }, Wind: { Speed: { Metric: { Value: 13 } } }, UVIndex: 2 }],
	accuDaily: { Headline: { Text: "Rain Monday" }, DailyForecasts: [
		{ Date: "2026-11-15T07:00:00-05:00", Temperature: { Maximum: { Value: 11 }, Minimum: { Value: 3 } }, Day: { Icon: 6, IconPhrase: "Mostly cloudy" } },
		{ Date: "2026-11-16T07:00:00-05:00", Temperature: { Maximum: { Value: 8 }, Minimum: { Value: 4 } }, Day: { Icon: 18, IconPhrase: "Rain" } },
		{ Date: "2026-11-17T07:00:00-05:00", Temperature: { Maximum: { Value: 2 }, Minimum: { Value: -3 } }, Day: { Icon: 22, IconPhrase: "Snow" } },
		{ Date: "2026-11-18T07:00:00-05:00", Temperature: { Maximum: { Value: 5 }, Minimum: { Value: -4 } }, Day: { Icon: 1, IconPhrase: "Sunny" } },
		{ Date: "2026-11-19T07:00:00-05:00", Temperature: { Maximum: { Value: 7 }, Minimum: { Value: 0 } }, Day: { Icon: 3, IconPhrase: "Partly sunny" } }
	] }
};
