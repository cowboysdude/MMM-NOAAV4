/* MagicMirror²
 * Module: MMM-NOAAV4 (v4 - rewritten for MagicMirror 2.3x / Node 22+)
 * By cowboysdude with HUGE thanks to JimL at https://www.phphelp.com!!
 */
Module.register("MMM-NOAAV4", {
	defaults: {
		provider: "openmeteo",      // openmeteo | nws | pirateweather | openweather | weatherbit | accuweather
		apiKey: "",                 // not needed for openmeteo or nws
		lat: "",                    // or the old names userlat / userlon
		lon: "",
		zip: "",                    // AccuWeather location number (same as locationKey)
		css: "",                    // NOAA1 | NOAA2 | NOAA3 | (anything else = NOAA4 look)
		units: "",                  // "" = use the units at the top of config.js
		alerts: true,               // show US National Weather Service alerts
		nupdate: false,             // show "Updated: ..." line
		updateInterval: 30 * 60 * 1000,
		rotateInterval: 60 * 1000,  // how long each alert stays up
		animationSpeed: 0,         // fade time in ms when the display refreshes
		lang: "",                   // "" = use the language at the top of config.js

		moon: {
			"New Moon": "images/moon/newmoon.png",
			"Waxing Crescent": "images/moon/waxingcrescent.png",
			"First Quarter": "images/moon/firstquarter.png",
			"Waxing Gibbous": "images/moon/waxinggibbous.png",
			"Full Moon": "images/moon/fullmoon.png",
			"Waning Gibbous": "images/moon/waninggibbous.png",
			"Last Quarter": "images/moon/thirdquarter.png",
			"Waning Crescent": "images/moon/waningcrescent.png"
		}
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
		const css = { NOAA1: "css/MMM-NOAA1.css", NOAA2: "css/MMM-NOAA2.css", NOAA3: "css/MMM-NOAA3.css" };
		return [this.file(css[this.config.css] || "css/MMM-NOAA4.css")];
	},

	start () {
		Log.info(`Starting module: ${this.name}`);
		this.data_ = null;
		this.error = null;
		this.activeItem = 0;
		this.rotateTimer = null;
		// let users override just some moon pictures without losing the rest
		this.config.moon = { ...this.defaults.moon, ...(this.config.moon || {}) };
		const cfg = { ...this.config, lang: this.config.lang || config.language };
		delete cfg.moon;
		this.sendSocketNotification("NOAA3_INIT", { identifier: this.identifier, config: cfg });
	},

	socketNotificationReceived (notification, payload) {
		if (!payload || payload.identifier !== this.identifier) return;
		if (notification === "NOAA3_DATA") {
			this.data_ = payload;
			this.error = null;
			const c = payload.current || {};
			this.sendNotification("WEATHER", { icon: c.icon, sunset: payload.sun ? payload.sun.sunset : null });
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
	timeFmt () {
		return config.timeFormat === 12 ? "h:mm" : "HH:mm";
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
	icon (name, night) {
		const n = name || "unknown";
		return this.file(`images/${night && n !== "unknown" ? "nt_" : ""}${n}.png`);
	},
	esc (s) {
		return String(s === null || s === undefined ? "" : s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	},

	// ------------------------------------------------------------ DOM
	getDom () {
		const wrapper = document.createElement("div");

		if (!this.data_) {
			wrapper.className = this.error ? "small dimmed" : "bright small";
			wrapper.innerHTML = this.error ? `MMM-NOAAV4: ${this.esc(this.error)}` : "Gathering your weather info..";
			return wrapper;
		}

		const d = this.data_;
		const c = d.current || {};
		const imp = this.imperial();
		const day = this.isDay();

		// condition text + icon
		const cweat = document.createElement("div");
		cweat.classList.add("small", "bright", "floatl");
		cweat.innerHTML = `${this.esc(c.desc || "")}<br>`;
		wrapper.appendChild(cweat);

		const curCon = document.createElement("div");
		curCon.classList.add("img");
		curCon.innerHTML = `<img src="${this.icon(c.icon, !day)}">`;
		wrapper.appendChild(curCon);

		// big temperature with forecast tooltip
		const cur = document.createElement("div");
		cur.classList.add("tempf", "tooltip");
		const t = this.temp(c.tempC);
		const temper = `${this.fmt(t)}&deg;<span class="tooltiptext">${this.translate("Forecast")}: ${this.esc(c.summary || c.desc || "")}</span>`;
		cur.innerHTML = `<div class="divTable"><div class="divTableBody">
			<div class="divTableRow"><div class="divTableHead"> </div></div>
			<div class="divTableRow"><div class="divTableCell2">${temper}</div></div>
			</div></div>`;
		wrapper.appendChild(cur);

		// humidity / pressure / visibility
		const top = document.createElement("div");
		top.classList.add("topshow");
		const humid = c.humidity === null || c.humidity === undefined ? "--" : `${Math.round(c.humidity)}%`;
		const baro = imp
			? (c.pressureMb ? `${this.fmt(c.pressureMb * 0.02953, 2)} inHg` : "--")
			: (c.pressureMb ? `${this.fmt(c.pressureMb)} mb` : "--");
		const vis = c.visibilityKm === null || c.visibilityKm === undefined
			? "--"
			: (imp ? `${this.fmt(c.visibilityKm * 0.621371)} Mi` : `${this.fmt(c.visibilityKm)} Km`);
		top.innerHTML = `<div class="divTable"><div class="divTableBody">
			<div class="divTableRow">
				<div class="divTableHead">${this.translate("Humidity")}</div>
				<div class="divTableHead">${this.translate("Pressure")}</div>
				<div class="divTableHead">${this.translate("Visibility")}</div>
			</div>
			<div class="divTableRow">
				<div class="divTableCell">${humid}</div>
				<div class="divTableCell">${baro}</div>
				<div class="divTableCell">${vis}</div>
			</div></div></div>`;
		wrapper.appendChild(top);

		// sunrise / daylight / sunset
		let rise = "--";
		let set = "--";
		let light = "--";
		if (d.sun) {
			rise = moment(d.sun.sunrise).format(this.timeFmt());
			set = moment(d.sun.sunset).format(this.timeFmt());
			const s = d.sun.daylightSeconds || 0;
			light = `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
		}
		const nextDiv = document.createElement("div");
		nextDiv.innerHTML = `<div class="divTable"><div class="divTableBody">
			<div class="divTableRow">
				<div class="divTableHead">${this.translate("Rise")}</div>
				<div class="divTableHead">${this.translate("Hours of Light")}</div>
				<div class="divTableHead">${this.translate("Set")}</div>
			</div>
			<div class="divTableRow">
				<div class="divTableCell">${rise}</div>
				<div class="divTableCell">${light}</div>
				<div class="divTableCell">${set}</div>
			</div></div></div>`;
		wrapper.appendChild(nextDiv);

		// AQI / UV (day) or moon (night) / wind
		const uv = c.uv === null || c.uv === undefined ? "--" : Math.round(c.uv);
		const moonSrc = this.config.moon[d.moon] ? this.file(this.config.moon[d.moon]) : this.file("images/smallmoon.png");
		const wind = c.windKph === null || c.windKph === undefined
			? "--"
			: (imp ? `${Math.round(c.windKph * 0.621371)} mph` : `${Math.round(c.windKph)} km/h`);
		const lastDiv = document.createElement("div");
		lastDiv.innerHTML = `<div class="divTable"><div class="divTableBody">
			<div class="divTableRow">
				<div class="divTableHead">AQI</div>
				<div class="divTableHead">${day ? "UV" : this.translate("Night")}</div>
				<div class="divTableHead">${this.translate("Wind")}</div>
			</div>
			<div class="divTableRow">
				<div class="divTableCell">${d.aqi === null || d.aqi === undefined ? "--" : d.aqi}</div>
				<div class="divTableCell">${day ? uv : `<img src="${moonSrc}" title="${this.esc(d.moon)}" height="27" width="27">`}</div>
				<div class="divTableCell">${wind}</div>
			</div></div></div>`;
		wrapper.appendChild(lastDiv);

		// 4 day forecast
		const forecast = d.forecast || [];
		if (forecast.length) {
			const table = document.createElement("table");
			table.classList.add("table");
			table.setAttribute("style", "line-height: 20%;");

			const head = document.createElement("tr");
			const th = document.createElement("th");
			th.setAttribute("colspan", String(forecast.length));
			th.classList.add("rheading");
			th.innerHTML = this.translate("4 Day Forecast");
			head.appendChild(th);
			table.appendChild(head);

			const today = moment().format("ddd");
			const names = document.createElement("tr");
			const icons = document.createElement("tr");
			const temps = document.createElement("tr");
			forecast.forEach((f, i) => {
				const n = document.createElement("td");
				n.classList.add("xsmall", "bright");
				n.innerHTML = i === 0 && f.day === today ? this.translate("Today") : this.translate(f.day);
				names.appendChild(n);

				const ic = document.createElement("td");
				ic.classList.add("CellWithComment");
				ic.innerHTML = `<img src="${this.icon(f.icon, false)}" height="22" width="28"><span class="CellComment">${this.esc(f.desc || "")}</span>`;
				icons.appendChild(ic);

				const tt = document.createElement("td");
				tt.classList.add("xsmall", "bright");
				tt.innerHTML = `${this.fmt(this.temp(f.highC))}/${this.fmt(this.temp(f.lowC))}`;
				temps.appendChild(tt);
			});
			table.appendChild(names);
			table.appendChild(icons);
			table.appendChild(temps);
			wrapper.appendChild(table);
		}

		// weather alerts (US National Weather Service, or Pirate Weather)
		const alerts = d.alerts || [];
		if (alerts.length) {
			if (this.activeItem >= alerts.length) this.activeItem = 0;
			const a = alerts[this.activeItem];

			const warning = document.createElement("div");
			warning.classList.add("advise");
			warning.innerHTML = `${this.translate("Weather Advisory")}<br>${this.translate("Type")}: ${this.esc(a.severity || "")}`;
			wrapper.appendChild(warning);

			const emer = document.createElement("div");
			emer.classList.add("warning", "bright");
			const desc = String(a.description || "").split(/\s+/).slice(0, 30).join(" ");
			emer.innerHTML = `${this.esc(a.title)}${desc ? `<span class="adesc">${this.esc(desc)}</span>` : ""}`;
			wrapper.appendChild(emer);

			if (a.regions && a.regions.length) {
				const area = document.createElement("div");
				area.classList.add("areas");
				area.innerHTML = `${this.translate("Areas affected")}:<br>`;
				wrapper.appendChild(area);

				const list = document.createElement("div");
				list.classList.add("list");
				list.innerHTML = this.esc(a.regions.slice(0, 8).join(", "));
				wrapper.appendChild(list);
			}
		}

		if (this.config.nupdate) {
			const mod = document.createElement("div");
			mod.classList.add("xxsmall");
			mod.setAttribute("style", "text-align: center;");
			const u = moment(d.updated);
			const stamp = config.timeFormat === 12 ? u.format("M.D.YYYY @ h:mm a") : u.format("DD.MM.YYYY @ HH:mm");
			mod.innerHTML = `<font color=yellow>[</font>${this.translate("Updated")}: ${stamp}<font color=yellow>]</font>`;
			wrapper.appendChild(mod);
		}
		return wrapper;
	}
});
