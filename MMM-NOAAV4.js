/* MagicMirror²
 * Module: MMM-NOAAV4 (v4.1 - white or dark weather card, MagicMirror 2.3x / Node 22+)
 * By cowboysdude with HUGE thanks to JimL at https://www.phphelp.com!!
 */
Module.register("MMM-NOAAV4", {
	defaults: {
		provider: "openmeteo",      // openmeteo | nws | pirateweather | openweather | weatherbit | accuweather
		apiKey: "",                 // not needed for openmeteo or nws
		lat: "",                    // or the old names userlat / userlon
		lon: "",
		zip: "",                    // AccuWeather location number (same as locationKey)
		css: "light",               // "light" = white card | "dark" = dark card
		title: "Home",              // name under the condition, e.g. "Home Weather"
		forecastDays: 3,            // days in the forecast row: 0 (none) to 5
		details: true,              // row with humidity, wind, AQI and UV Index
		units: "",                  // "" = use the units at the top of config.js
		alerts: true,               // show US National Weather Service alerts
		updateInterval: 30 * 60 * 1000,
		rotateInterval: 60 * 1000,  // how long each alert stays up
		animationSpeed: 0,          // fade time in ms when the display refreshes
		lang: ""                    // "" = use the language at the top of config.js
	},

	getTranslations () {
		return {
			en: "translations/en.json", da: "translations/da.json", sv: "translations/sv.json",
			de: "translations/de.json", es: "translations/es.json", fr: "translations/fr.json",
			zh_cn: "translations/zh_cn.json", "zh-cn": "translations/zh_cn.json", nl: "translations/nl.json",
			nb: "translations/nb.json", it: "translations/it.json", gr: "translations/gr.json",
			el: "translations/gr.json"
		};
	},

	getScripts () {
		return ["moment.js"];
	},

	getStyles () {
		return [this.file("css/MMM-NOAAV4.css")];
	},

	start () {
		Log.info(`Starting module: ${this.name}`);
		this.data_ = null;
		this.error = null;
		this.activeItem = 0;
		this.rotateTimer = null;
		const cfg = { ...this.config, lang: this.config.lang || config.language };
		this.sendSocketNotification("NOAA3_INIT", { identifier: this.identifier, config: cfg });
	},

	socketNotificationReceived (notification, payload) {
		if (!payload || payload.identifier !== this.identifier) return;
		if (notification === "NOAA3_DATA") {
			this.data_ = payload;
			this.error = null;
			const c = payload.current || {};
			this.sendNotification("WEATHER", {
				icon: c.icon,
				sunrise: payload.sun ? payload.sun.sunrise : null,
				sunset: payload.sun ? payload.sun.sunset : null,
				isDay: this.isDay()
			});
			if (!this.rotateTimer && payload.alerts && payload.alerts.length > 1) {
				this.rotateTimer = setInterval(() => {
					this.activeItem++;
					this.updateDom(this.config.animationSpeed);
				}, this.config.rotateInterval);
			}
			this.updateDom(this.config.animationSpeed);
		} else if (notification === "NOAA3_ERROR") {
			this.error = payload.message;
			if (!this.data_) this.updateDom();
		}
	},

	// ------------------------------------------------------------ helpers
	imperial () {
		return (this.config.units || config.units) !== "metric";
	},
	fmt (n, digits = 0) {
		if (n === null || n === undefined || Number.isNaN(Number(n))) return "--";
		return Number(n).toFixed(digits);
	},
	temp (c) {
		if (c === null || c === undefined) return null;
		return this.imperial() ? c * 9 / 5 + 32 : c;
	},
	isDay () {
		const d = this.data_;
		if (d.sun && d.sun.sunrise && d.sun.sunset) {
			const now = Date.now();
			return now >= Date.parse(d.sun.sunrise) && now < Date.parse(d.sun.sunset);
		}
		if (d.current && typeof d.current.isDay === "boolean") return d.current.isDay;
		const h = new Date().getHours();
		return h > 6 && h < 18;
	},
	esc (s) {
		return String(s === null || s === undefined ? "" : s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	},

	// ------------------------------------------------------------ DOM
	getDom () {
		return this.getDomLight();
	},

	compass (deg) {
		if (deg === null || deg === undefined || Number.isNaN(Number(deg))) return "";
		const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
		return dirs[Math.round(((Number(deg) % 360) + 360) % 360 / 22.5) % 16];
	},

	aqiText (n) {
		if (n === null || n === undefined) return "";
		if (n <= 50) return "Good";
		if (n <= 100) return "Moderate";
		if (n <= 150) return "Unhealthy for some";
		if (n <= 200) return "Unhealthy";
		return "Very Unhealthy";
	},

	uvLevel (n) {
		if (n <= 2) return "low";
		if (n <= 5) return "moderate";
		if (n <= 7) return "high";
		return "veryhigh";
	},

	// Flat weather icons, drawn in SVG so they stay sharp at any size
	flatIcon (name, night) {
		const n = String(name || "unknown").replace(/^nt_/, "");
		const sun = '<circle cx="20" cy="20" r="14" fill="#fdd835"/>';
		const moon = '<path d="M27 6a14 14 0 1 0 7 22A12 12 0 0 1 27 6z" fill="#cfd8dc"/>';
		const smallSun = '<circle cx="31" cy="15" r="8" fill="#fdd835"/>';
		const smallMoon = '<path d="M33 7a8 8 0 1 0 4 13 7 7 0 0 1-4-13z" fill="#cfd8dc"/>';
		const cloud = (fill) => `<path d="M14 36h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0-1 18z" fill="${fill}"/>`;
		const lightCloud = cloud("#eceff1") + '<path d="M14 36h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0-1 18z" fill="none" stroke="#cfd8dc" stroke-width="1"/>';
		const drops = (k) => Array.from({ length: k }, (_, i) => `<path d="M${15 + i * 7} 40l-2 5" stroke="#42a5f5" stroke-width="2.2" stroke-linecap="round"/>`).join("");
		const flakes = (k) => Array.from({ length: k }, (_, i) => `<circle cx="${15 + i * 7}" cy="43" r="1.8" fill="#90caf9"/>`).join("");
		const bolt = '<path d="M24 37l-4 7h4l-3 6 8-9h-4l3-4z" fill="#fdd835"/>';
		const fogLines = '<path d="M8 40h30M12 45h26" stroke="#b0bec5" stroke-width="2.5" stroke-linecap="round"/>';
		const windLines = '<path d="M6 16h22a5 5 0 1 0-5-5M6 24h30a5 5 0 1 1-5 5M6 32h16" fill="none" stroke="#b0bec5" stroke-width="2.6" stroke-linecap="round"/>';
		const body = {
			clear: night ? moon : sun, sunny: night ? moon : sun,
			mostlysunny: (night ? smallMoon : smallSun) + lightCloud, mostlyclear: (night ? smallMoon : smallSun) + lightCloud,
			partlycloudy: (night ? smallMoon : smallSun) + lightCloud, partlysunny: (night ? smallMoon : smallSun) + lightCloud,
			mostlycloudy: lightCloud, cloudy: lightCloud, overcast: cloud("#cfd8dc"),
			fog: lightCloud + fogLines, hazy: (night ? smallMoon : smallSun) + fogLines,
			drizzle: lightCloud + drops(2), chancerain: lightCloud + drops(3), rain: cloud("#cfd8dc") + drops(4),
			sleet: lightCloud + drops(2) + `<circle cx="29" cy="43" r="1.8" fill="#90caf9"/>`,
			chancesleet: lightCloud + drops(2) + `<circle cx="29" cy="43" r="1.8" fill="#90caf9"/>`,
			flurries: lightCloud + flakes(2), chanceflurries: lightCloud + flakes(2), chancesnow: lightCloud + flakes(3), snow: cloud("#cfd8dc") + flakes(4),
			tstorms: cloud("#b0bec5") + bolt, chancetstorms: lightCloud + bolt,
			wind: windLines, breezy: windLines
		}[n] || lightCloud;
		return `<svg class="nl-svg" viewBox="0 0 48 50" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
	},

	// The card: white (css: "light", default) or dark (css: "dark"), like the Home Assistant weather card
	getDomLight () {
		const w = document.createElement("div");
		w.className = String(this.config.css).toLowerCase() === "dark" ? "nl nl-dark" : "nl";
		if (!this.data_) {
			w.classList.add("nl-loading");
			w.innerHTML = this.error ? `MMM-NOAAV4: ${this.esc(this.error)}` : "Gathering your weather info..";
			return w;
		}
		const d = this.data_;
		const c = d.current || {};
		const imp = this.imperial();
		const day = this.isDay();
		const u = imp ? "&deg;F" : "&deg;C";
		const want = this.config.forecastDays === null || this.config.forecastDays === undefined ? 3 : Number(this.config.forecastDays);
		const n = Math.max(0, Math.min(5, Number.isNaN(want) ? 5 : want));

		const today = moment().format("ddd");
		const all = (d.forecast || []).slice();
		const todayFc = all.length && all[0].day === today ? all[0] : null;
		const days = (todayFc ? all.slice(1) : all).slice(0, n);

		// right-hand line under the temperature: today's high / low, or humidity when there's no forecast
		let sub = "";
		if (n > 0 && todayFc) sub = `${this.fmt(this.temp(todayFc.highC))} ${u} / ${this.fmt(this.temp(todayFc.lowC))} ${u}`;
		else if (c.humidity !== null && c.humidity !== undefined) sub = `${this.translate("Humidity")} ${Math.round(c.humidity)} %`;

		const decimals = n === 0 ? 1 : 0;
		let html = `<div class="nl-head">
			<div class="nl-icon">${this.flatIcon(c.icon, !day)}</div>
			<div class="nl-cond">
				<div class="nl-desc">${this.esc(c.desc || "")}</div>
				<div class="nl-place">${this.esc(this.config.title || "Home")}</div>
			</div>
			<div class="nl-now">
				<div class="nl-temp">${this.fmt(this.temp(c.tempC), decimals)}${u}</div>
				${sub ? `<div class="nl-sub">${sub}</div>` : ""}
			</div>
		</div>`;

		if (days.length) {
			html += `<div class="nl-fc">${days.map((f) => `
				<div class="nl-day">
					<div class="nl-dname">${this.esc(this.translate(f.day))}</div>
					<div class="nl-dicon" title="${this.esc(f.desc || "")}">${this.flatIcon(f.icon, false)}</div>
					<div class="nl-hi">${this.fmt(this.temp(f.highC))}&deg;</div>
					<div class="nl-lo">${this.fmt(this.temp(f.lowC))}&deg;</div>
				</div>`).join("")}
			</div>`;
		}

		// details row: humidity, wind, AQI, UV Index
		if (this.config.details !== false) {
			const item = (icon, color, label, value, extra = "") => `<div class="nl-item">
				<div class="nl-ilabel"><i class="fa-solid ${icon}" style="color:${color}"></i> ${label}</div>
				<div class="nl-ivalue">${value}${extra ? ` <span class="nl-iextra">${extra}</span>` : ""}</div>
			</div>`;
			const hum = c.humidity === null || c.humidity === undefined ? "--" : `${Math.round(c.humidity)}%`;
			let wind = "--";
			let windDir = "";
			if (c.windKph !== null && c.windKph !== undefined) {
				wind = imp ? `${Math.round(c.windKph * 0.621371)} mph` : `${Math.round(c.windKph)} km/h`;
				if (Math.round(c.windKph) > 0) windDir = this.compass(c.windDeg);
			}
			const aqi = d.aqi === null || d.aqi === undefined ? "--" : String(d.aqi);
			const aqiText = d.aqi === null || d.aqi === undefined ? "" : this.translate(this.aqiText(d.aqi));
			const uvN = c.uv === null || c.uv === undefined ? null : Math.round(c.uv);
			const uvText = uvN === null ? "" : this.translate({ low: "Low", moderate: "Moderate", high: "High", veryhigh: "Very High" }[this.uvLevel(uvN)]);
			html += `<div class="nl-details">
				${item("fa-droplet", "#42a5f5", this.translate("Humidity"), hum)}
				${item("fa-wind", "#78909c", this.translate("Wind"), wind, windDir)}
				${item("fa-leaf", "#43a047", "AQI", aqi, aqiText)}
				${item("fa-sun", "#f9a825", this.translate("UV Index"), uvN === null ? "--" : String(uvN), uvText)}
			</div>`;
		}

		const alerts = d.alerts || [];
		if (alerts.length) {
			if (this.activeItem >= alerts.length) this.activeItem = 0;
			const a = alerts[this.activeItem];
			const sev = String(a.severity || "").toLowerCase();
			html += `<div class="nl-alert ${sev === "extreme" || sev === "severe" ? "nl-alert-severe" : ""}"><i class="fa-solid fa-triangle-exclamation"></i> ${this.esc(a.title || this.translate("Weather Advisory"))}</div>`;
		}
		w.innerHTML = html;
		return w;
	}
});
