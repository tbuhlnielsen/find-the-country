// DOM ELEMENTS

const targetCountryElement = document.getElementById('target-country');
const resultDialogElement = document.getElementById('result-dialog');

// https://stackoverflow.com/questions/13698975/click-link-inside-leaflet-popup-and-do-javascript?rq=1
const confirmGuessElement = document.createElement('button');
confirmGuessElement.id = 'confirm-guess';
confirmGuessElement.textContent = 'Confirm ✅';
confirmGuessElement.addEventListener('click', onConfirmGuess);

const playAgainElement = document.getElementById('play-again');
playAgainElement.addEventListener('click', onPlayAgain);

const guessCorrectElement = document.getElementById('guess-correct');
const guessIncorrectElement = document.getElementById('guess-incorrect');
const guessElement = document.getElementById('guess');

// INITIALISE MAP

const initMapBoundsLatLng = [
  [-70, -179],
  [85, 179]
];
const mapCentre = [0, 0];
const initZoom = 2;

const map = L.map('map', { maxBounds: initMapBoundsLatLng }).setView(
  mapCentre,
  initZoom
);

const confirmationPopup = L.popup().setContent(confirmGuessElement);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 10,
    minZoom: 2,
    bounds: initMapBoundsLatLng,
    noWrap: true
  }
).addTo(map);

let countryBoundariesRawData;
let countryBoundariesGeoJson;
let countryNames;

let targetCountryName;
let selectedGeoJsonFeature;
let guessCorrect;

fetch('./country-boundaries.geojson')
  .then(response => response.json())
  .then(data => {
    countryBoundariesRawData = data;
    countryBoundariesGeoJson = L.geoJson(data, {
      onEachFeature,
      style: featureStyle
    }).addTo(map);
    countryNames = countryBoundariesRawData.features
      .filter(isCountry)
      .map(feature => feature.properties.name);
    setNewTargetCountry();
  })
  .catch(console.error);

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

function isCountry(geoJsonFeature) {
  return geoJsonFeature.properties.status === 'Member State';
}

function getTargetCountry() {
  return countryNames[Math.floor(countryNames.length * Math.random())];
}

function setNewTargetCountry() {
  targetCountryName = getTargetCountry();
  targetCountryElement.innerHTML = targetCountryName;
}

// MAP EVENTS

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: onMouseOverFeature,
    mouseout: onMouseOutFeature,
    click: zoomToFeature
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

map.on('click', onMapClick);

function onMapClick(e) {
  if (countryBoundariesRawData) {
    selectedGeoJsonFeature = countryBoundariesRawData.features.find(feature =>
      isClickInsideGeoJsonFeature(e, feature)
    );
    if (selectedGeoJsonFeature) {
      countryBoundariesGeoJson.setStyle(featureStyle);
      guessCorrect =
        selectedGeoJsonFeature.properties.name === targetCountryName;
      confirmationPopup.setLatLng(e.latlng).openOn(map);
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

function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

// POPUP EVENTS

function onConfirmGuess() {
  confirmationPopup.close();
  if (guessCorrect) {
    guessCorrectElement.style.display = 'block';
    guessIncorrectElement.style.display = 'none';
  } else {
    guessCorrectElement.style.display = 'none';
    guessIncorrectElement.style.display = 'block';
    guessElement.textContent = selectedGeoJsonFeature.properties.name;
  }
  resultDialogElement.show();
}

function onPlayAgain() {
  resultDialogElement.close();
  setNewTargetCountry();
  selectedGeoJsonFeature = undefined;
  countryBoundariesGeoJson.resetStyle();
  guessCorrect = false;
  map.fitBounds(initMapBoundsLatLng);
}
