import assert from "node:assert/strict";

import {
    aqiDescription,
    aqiLevel,
    buildAqiViewModel,
    buildMetricViewModels,
    colorForStatus,
    endpointForServerUrl,
} from "../airgradientPresentation.js";

assert.equal(
    endpointForServerUrl("http://192.168.1.201/"),
    "http://192.168.1.201/measures/current",
);
assert.equal(colorForStatus("maroon"), "#a51d2d");
assert.equal(aqiLevel(151), "Unhealthy");
assert.match(aqiDescription(250), /risk of health effects/u);

const current = {
    aqi: 71,
    co2: 900,
    humidity: 45,
    nox: 3,
    noxUnit: "index",
    pm003Count: 442,
    pm1: 4,
    pm10: 11,
    pm25: 13,
    temperature: 24.5,
    tvoc: 100,
    tvocUnit: "index",
};
const previous = {
    aqi: 80,
    co2: 700,
    pm25: 20,
    tvoc: 120,
};

const aqi = buildAqiViewModel(current, previous);
assert.equal(aqi.value, "71");
assert.equal(aqi.level, "Moderate");
assert.equal(aqi.status, "yellow");
assert.equal(aqi.color, colorForStatus("yellow"));
assert.equal(aqi.trend.className, "trend-improved");

const metrics = buildMetricViewModels(current, previous);
const co2 = metrics.find((metric) => metric.name === "CO2");
const humidity = metrics.find((metric) => metric.name === "Humidity");
const pm10 = metrics.find((metric) => metric.name === "PM10");
const tvoc = metrics.find((metric) => metric.name === "TVOC");

assert.equal(co2.status, "yellow");
assert.equal(co2.color, colorForStatus("yellow"));
assert.equal(co2.trend.className, "trend-worse");
assert.equal(humidity.status, "gray");
assert.equal(pm10.status, "gray");
assert.equal(tvoc.unit, "index");

console.log("presentation smoke tests passed");
