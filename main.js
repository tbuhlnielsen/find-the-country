// DOM ELEMENTS

const targetCountryElement = document.getElementById('target-country');

// INITIALISE MAP

const boundsLatLng = [
  [-70, -179],
  [85, 179]
];
const mapCentre = [0, 0];
const initZoom = 2;

const map = L.map('map', { maxBounds: boundsLatLng }).setView(
  mapCentre,
  initZoom
);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 10,
    minZoom: 2,
    bounds: boundsLatLng,
    noWrap: true
  }
).addTo(map);

let countryBoundariesRawData;
let countryBoundariesGeoJson;
let countryNames;
let target;
let selectedGeoJsonFeature;
let guessCorrect;

fetch('./country-boundaries.geojson')
  .then(response => response.json())
  .then(data => {
    countryBoundariesRawData = data;
    countryNames = countryBoundariesRawData.features
      .filter(isCountry)
      .map(feature => feature.properties.name);
    target = countryNames[Math.floor(countryNames.length * Math.random())];
    countryBoundariesGeoJson = L.geoJson(data, {
      onEachFeature,
      style: featureStyle
    }).addTo(map);
    targetCountryElement.innerHTML = target;
  })
  .catch(console.error);

function isCountry(geoJsonFeature) {
  return geoJsonFeature.properties.status === 'Member State';
}

function featureStyle(feature) {
  const selected = isFeatureSelected(feature);
  return {
    color: selected ? '#6600ff' : 'transparent',
    fillColor: selected ? '#6600ff' : 'transparent'
  };
}

function isFeatureSelected(feature) {
  if (selectedGeoJsonFeature) {
    return feature.properties.name === selectedGeoJsonFeature.properties.name;
  }
  return false;
}

// MAP HOVER EVENTS

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: onMouseOverFeature,
    mouseout: onMouseOutFeature
  });
}

function onMouseOverFeature(e) {
  if (isFeatureSelected(e.target.feature)) {
    return;
  }
  const layer = e.target;
  layer.setStyle({
    color: '#0066ff',
    fillColor: '#0066ff',
    fillOpacity: 0.5,
    weight: 2
  });
  layer.bringToFront();
}

function onMouseOutFeature(e) {
  if (!isFeatureSelected(e.target.feature)) {
    countryBoundariesGeoJson.resetStyle(e.target);
  }
}

// MAP CLICK EVENT

map.on('click', onMapClick);

function onMapClick(e) {
  if (countryBoundariesRawData) {
    selectedGeoJsonFeature = countryBoundariesRawData.features.find(feature =>
      isClickInsideGeoJsonFeature(e, feature)
    );
    if (selectedGeoJsonFeature) {
      countryBoundariesGeoJson.setStyle(featureStyle);
      guessCorrect = selectedGeoJsonFeature.properties.name === target;
      console.log('Clicked:', selectedGeoJsonFeature.properties.name);
    }
  }
}

function isClickInsideGeoJsonFeature(e, feature) {
  if (isGeoJsonFeatureMultiPolygons(feature)) {
    return feature.geometry.coordinates.some(poly =>
      isPointInsidePolygon(e.latlng, poly)
    );
  } else {
    return isPointInsidePolygon(e.latlng, feature.geometry.coordinates);
  }
}

function isGeoJsonFeatureMultiPolygons(feature) {
  // True for countries with multiple separated territories.
  return feature.geometry.coordinates[0].length === 1;
}

// https://stackoverflow.com/questions/31790344/determine-if-a-point-reside-inside-a-leaflet-polygon
function isPointInsidePolygon(point, poly) {
  const x = point.lat;
  const y = point.lng;
  let inside = false;
  for (let ii = 0; ii < poly.length; ii++) {
    const polyPoints = poly[ii];
    for (var i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
      const [yi, xi] = polyPoints[i];
      const [yj, xj] = polyPoints[j];
      const intersect =
        yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
  }
  return inside;
}
