/* MagicMirror²
 * Module: MMM-NOAAV4 (v4 - rewritten for MagicMirror 2.3x / Node 22+)
 * By cowboysdude. Special thanks to JimL from the PHP help forum!
 *
 * Fetches weather on the server side and sends one normalized payload
 * ("NOAA3_DATA") to the browser. No npm dependencies: uses Node's fetch.
 */
const NodeHelper = require("node_helper");
const Log = require("logger");
const openmeteo = require("./providers/openmeteo");
const nws = require("./providers/nws");
const { moonPhase } = require("./lib/util");

const PROVIDERS = {
	openmeteo: () => require("./providers/openmeteo"),
	nws: () => require("./providers/nws"),
	noaa: () => require("./providers/nws"),
	pirateweather: () => require("./providers/pirateweather"),
	openweather: () => require("./providers/openweather"),
	openweathermap: () => require("./providers/openweather"),
	weatherbit: () => require("./providers/weatherbit"),
	accuweather: () => require("./providers/accuweather")
};
// services that no longer exist -> what we use instead
const RETIRED = {
	darksky: "pirateweather",
	wunderground: "openmeteo",
	apixu: "openmeteo",
	msn: "openmeteo",
	weatherunlocked: "openmeteo",
	yahoo: "openmeteo"
};

const MIN_INTERVAL = 10 * 60 * 1000;

module.exports = NodeHelper.create({
	start () {
		this.instances = new Map(); // identifier -> { cfg, timer, last }
		Log.log(`Starting node helper for: ${this.name}`);
	},

	stop () {
		for (const inst of this.instances.values()) clearTimeout(inst.timer);
	},

	socketNotificationReceived (notification, payload) {
		if (notification !== "NOAA3_INIT" || !payload) return;
		const id = payload.identifier;
		const existing = this.instances.get(id);
		if (existing) {
			// browser reloaded: resend what we have, keep the existing schedule
			existing.cfg = this.normalizeConfig(payload.config);
			if (existing.last) this.sendSocketNotification("NOAA3_DATA", { identifier: id, ...existing.last });
			return;
		}
		const inst = { cfg: this.normalizeConfig(payload.config), timer: null, last: null };
		this.instances.set(id, inst);
		this.update(id);
	},

	normalizeConfig (c = {}) {
		let provider = String(c.provider || "openmeteo").toLowerCase().replace(/[\s_-]/g, "");
		if (RETIRED[provider]) {
			Log.warn(`[MMM-NOAAV4] provider "${provider}" no longer exists - using "${RETIRED[provider]}" instead.`);
			provider = RETIRED[provider];
		}
		if (!PROVIDERS[provider]) {
			Log.warn(`[MMM-NOAAV4] unknown provider "${c.provider}" - using "openmeteo".`);
			provider = "openmeteo";
		}
		const lat = c.lat !== undefined && c.lat !== "" ? c.lat : c.userlat;
		const lon = c.lon !== undefined && c.lon !== "" ? c.lon : c.userlon;
		return {
			...c,
			provider,
			lat: lat === undefined || lat === "" ? null : Number(lat),
			lon: lon === undefined || lon === "" ? null : Number(lon),
			updateInterval: Math.max(Number(c.updateInterval) || 30 * 60 * 1000, MIN_INTERVAL)
		};
	},

	async update (id) {
		const inst = this.instances.get(id);
		if (!inst) return;
		clearTimeout(inst.timer);
		const cfg = inst.cfg;
		try {
			if (cfg.lat === null || cfg.lon === null || Number.isNaN(cfg.lat) || Number.isNaN(cfg.lon)) {
				throw new Error("Set lat and lon (or userlat and userlon) in the MMM-NOAAV4 config.");
			}
			const data = await this.collect(cfg);
			inst.last = data;
			this.sendSocketNotification("NOAA3_DATA", { identifier: id, ...data });
			Log.info(`[MMM-NOAAV4] updated (${cfg.provider}); next update in ${Math.round(cfg.updateInterval / 60000)} min`);
		} catch (err) {
			Log.error(`[MMM-NOAAV4] ${err.message}`);
			this.sendSocketNotification("NOAA3_ERROR", { identifier: id, message: err.message, stale: !!inst.last });
		}
		inst.timer = setTimeout(() => this.update(id), cfg.updateInterval);
	},

	async collect (cfg) {
		const provider = PROVIDERS[cfg.provider]();
		const wantBase = cfg.provider !== "openmeteo";
		const wantNwsAlerts = cfg.alerts !== false && cfg.provider !== "pirateweather";

		// run everything in parallel; only the main provider is allowed to fail the update
		const [main, base, aqi, alerts] = await Promise.all([
			provider.getWeather(cfg),
			wantBase ? openmeteo.getWeather(cfg).catch((e) => warn("sun/UV", e)) : null,
			openmeteo.getAqi(cfg).catch((e) => warn("air quality", e)),
			wantNwsAlerts ? nws.getAlerts(cfg).catch(() => []) : null
		]);

		const src = base || main;
		const current = { ...main.current };
		if ((current.uv === undefined || current.uv === null) && base) current.uv = base.current.uv;
		return {
			provider: cfg.provider,
			current,
			forecast: main.forecast || [],
			sun: main.sun || (src && src.sun) || null,
			aqi: aqi === undefined ? null : aqi,
			moon: moonPhase(),
			alerts: main.alerts || alerts || [],
			updated: new Date().toISOString()
		};
	}
});

function warn (what, e) {
	Log.warn(`[MMM-NOAAV4] could not get ${what}: ${e.message}`);
	return null;
}
