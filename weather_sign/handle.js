const express = require("express");
const router = express.Router();

// daemon
const fetch = require("node-fetch");
let cwbCache = new Map();
function updateCwbCache() {
	const apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-089?Authorization=${process.env.CWA_TOKEN}&format=JSON&locationName=&elementName=Wx,T,RH,PoP6h&sort=time`;
	return fetch(apiUrl, {}).then((response) => {
		return response.json();
	}).then((jsonData) => {
		jsonData.records.locations[0].location.forEach((loc) => {
			cwbCache[loc.locationName] = loc.weatherElement;
			// console.log(cwbCache);
		});
	});
}
updateCwbCache().then(() => console.log("cwb initialized")); // .then(() => console.log(getCwbWeather("桃園市", 0)));
setInterval(() => updateCwbCache(), 1*60*1000);

function getCwbWeather(locationName, time) {
	console.log(`get ${locationName}`);
	if(!locationName)
	{
		throw "Location undefined";
	}
	// console.log(cwbCache);
	let region = cwbCache[locationName];
	if(region === undefined)
	{
		throw "undefined location or cwb cache is not ready yet";
	}
	const now = new Date();
	now.setHours(now.getHours() + 8);
	let data = region.reduce((obj, weatherElement, index) => {
		if(weatherElement.time[0].dataTime !== undefined)
		{
			obj[weatherElement.elementName] = weatherElement.time.filter((timeElement) => new Date(timeElement.dataTime) < now).at(-1) || weatherElement.time[0];
		}
		else
		{
			obj[weatherElement.elementName] = (weatherElement.time.find((timeElement) => new Date(timeElement.startTime) <= now && new Date(timeElement.endTime) > now) || weatherElement.time[0]);
		}
		return obj;
	}, {});
	return data;
}

router.get("/", (req, res) => {
	const clientIP = req.headers["x-forwarded-for"];
	fetch(`http://ip-api.com/json/${clientIP}?fields=36955103`, {}).then((response) => {
		return response.json();
	}).then((jsonData) => {
		new Promise((resolve, reject) => {
			if(jsonData.countryCode === "TW" && jsonData.region !== "" && true)
			{
				const iso3116tw = require("./iso3116tw.js");
				const regionName = iso3116tw[jsonData.region];
				const weatherData = getCwbWeather(regionName, 0);
				const WxCode = parseInt(weatherData.Wx.elementValue[1].value);
				const now = new Date();
				now.setHours(now.getHours() + 8);
				let iconSet;
				if(now.getHours() < 5 || now.getHours() >= 18)
				{
					iconSet = require("./night.js");
				}
				else
				{
					iconSet = require("./day.js");
				}
				const iconUrl = iconSet[WxCode];
				const response = {
					Wx: weatherData.Wx.elementValue[0].value,
					T: weatherData.T.elementValue[0].value,
					RH: weatherData.RH.elementValue[0].value,
					PoP: weatherData.PoP6h.elementValue[0].value,
					imageUrl: iconUrl,
					location: regionName,
				};
				resolve(response);
			}
			else
			{
				fetch(`https://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHERAPI_TOKEN}&day=1&q=${clientIP}`, {}).then((response) => {
					return response.json();
				}).then((jsonData) => {
					const localNow = new Date(jsonData.location.localtime).getTime();
					jsonData.forecast.now = jsonData.forecast.forecastday[0].hour.reduce((prev, curr) => {
						return Math.abs(new Date(prev.time).getTime() - localNow) < Math.abs(new Date(curr.time).getTime() - localNow) ? prev : curr;
					});
					return jsonData;
				}).then((jsonData) => {
					const {getConditionString, getIconID} = require("./weatherapi_condition_zhtw.js");
					const iconID = getIconID(jsonData.current.condition.code);
					const {day_icon, night_icon} = require("./weatherapi_icons.js");
					const iconUrl = jsonData.current.is_day ? day_icon[iconID] : night_icon[iconID];

					const response = {
						Wx: getConditionString(jsonData.current.condition.code, jsonData.current.is_day),
						T: jsonData.current.temp_c,
						RH: jsonData.current.humidity,
						PoP: jsonData.forecast.now.chance_of_rain,
						imageUrl: iconUrl,
						location: jsonData.location.name,
					};
					resolve(response);
				});
			}
		}).then((weatherData) => {
			console.log(weatherData);
			let responseText = `<svg xmlns="http://www.w3.org/2000/svg" version="1.2" viewBox="0 0 660 125" style="user-select: none; font-family: 'Roboto','Segoe UI','Arial','Microsoft Jhenghei','sans-serif'; font-size: 20px; background-color: white;" xmlns:xlink="http://www.w3.org/1999/xlink">`;
			responseText += `<image xlink:href="${weatherData.imageUrl}" height="70" y="27.5" x="27.5"></image>`;
			responseText += `<text x="160" y="60" style="font-size: ${weatherData.location.length > 3 ? "35" : "40"}px; font-weight: bold">${weatherData.location}</text>`;
			responseText += `<text x="160" y="92">${weatherData.Wx}</text>`;
			responseText += `<text x="340" y="92">${weatherData.T}°C / ${weatherData.RH}%</text>`;
			responseText += `<text x="340" y="60">降雨機率 ${weatherData.PoP}%</text>`;
			responseText += `<text x="660" y="125" text-anchor="end" dominant-baseline="text-after-edge" style="font-size: 10pt; fill: #f7f7f7">jtdjdu6868（晴空和聲）</text>`;
			responseText += `</svg>`;
			res.send(responseText);
		}).catch((e) => {
			console.log(e);
		});
	});
});

module.exports = router;
