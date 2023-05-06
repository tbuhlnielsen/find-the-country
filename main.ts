import L from 'leaflet';
import type { GeoJSON } from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';

// GET DOM ELEMENTS

function getElementById<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

const targetCountryElement = getElementById('target-country');
const resultDialogElement = getElementById<HTMLDialogElement>('result-dialog');

// https://stackoverflow.com/questions/13698975/click-link-inside-leaflet-popup-and-do-javascript
const confirmGuessElement = document.createElement('button');
confirmGuessElement.id = 'confirm-guess';
confirmGuessElement.textContent = 'Confirm ✅';

const playAgainElement = getElementById('play-again');

const guessCorrectElement = getElementById('guess-correct');
const guessIncorrectElement = getElementById('guess-incorrect');
const guessElement = getElementById('guess');

const seeAnswerElement = getElementById('see-answer');
const answerElement = getElementById('answer');

// INITIALISE MAP OBJECT + POPUP

const map = L.map('map', {
  center: [0, 0],
  maxBounds: [
    [-70, -179],
    [85, 179]
  ],
  zoom: 2
});

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 10,
    minZoom: 2,
    noWrap: true
  }
).addTo(map);

const confirmationPopup = L.popup().setContent(confirmGuessElement);

// INITIALISE COUNTRY DATA + GAME STATE

interface GameState {
  gameOver: boolean;
  guessCorrect?: boolean;
  selectedMapFeature?: Feature;
  targetCountryName?: string;
}

let gameState: GameState = {
  gameOver: false
};

interface CountryData {
  rawData: FeatureCollection;
  boundaries: GeoJSON;
  names: string[];
}

let countryData: CountryData;

fetch('/country-boundaries.geojson')
  .then(response => response.json())
  .then(data => {
    countryData = getCountryData(data);
    setNewTargetCountry();
  })
  .catch(console.error);

function getCountryData(rawData) {
  return {
    rawData,
    boundaries: L.geoJson(rawData, {
      onEachFeature,
      style: getMapFeatureStyle
    }).addTo(map),
    names: rawData.features
      .filter(isCountry)
      .map(feature => feature.properties.name)
  };
}

function resetGameState() {
  gameState = {
    guessCorrect: false,
    gameOver: false
  };
  setNewTargetCountry();
}

function setNewTargetCountry() {
  const target = getTargetCountry();
  gameState.targetCountryName = target;
  targetCountryElement.textContent = `Where is ${target}?`;
  // Only play the animation when the target is set to avoid
  // a weird flicker while the data is loading.
  targetCountryElement.style.animationPlayState = 'running';
  answerElement.textContent = target;
}

function getTargetCountry() {
  const names = countryData.names;
  return names[Math.floor(names.length * Math.random())];
}

// MAP STYLES

const COLOUR_PALETTE = {
  success: '#00ff66',
  error: '#ff0066',
  highlight: '#6600ff'
};

function getMapFeatureStyle(feature) {
  const colour = getMapFeatureColor(feature, {
    gameOver: gameState.gameOver
  });
  return {
    color: colour,
    fillColor: colour
  };
}

function getMapFeatureColor(feature, { gameOver }) {
  if (gameOver) {
    if (isMapFeatureCorrect(feature)) {
      return COLOUR_PALETTE.success;
    }
    if (isMapFeatureSelected(feature)) {
      return COLOUR_PALETTE.error;
    }
    return 'transparent';
  }
  if (isMapFeatureSelected(feature)) {
    return COLOUR_PALETTE.highlight;
  }
  return 'transparent';
}

function isMapFeatureCorrect(feature) {
  return feature.properties.name === gameState.targetCountryName;
}

function isMapFeatureSelected(feature) {
  if (gameState.selectedMapFeature) {
    return (
      feature.properties.name === gameState.selectedMapFeature.properties.name
    );
  }
  return false;
}

// COUNTRY HOVER + CLICK EVENTS

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: onMouseOverFeature,
    mouseout: onMouseOutFeature,
    click: zoomToFeature
  });
}

function onMouseOverFeature(e) {
  if (gameState.gameOver || isMapFeatureSelected(e.target.feature)) {
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
  if (gameState.gameOver || isMapFeatureSelected(e.target.feature)) {
    return;
  }
  countryData.boundaries.resetStyle(e.target);
}

function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

// MAP CLICK EVENT

map.on('click', onMapClick);

function onMapClick(e) {
  if (gameState.gameOver || !countryData.rawData) {
    return;
  }
  gameState.selectedMapFeature = countryData.rawData.features.find(feature =>
    isClickInsideMapFeature(e, feature)
  );
  if (gameState.selectedMapFeature) {
    countryData.boundaries.setStyle(getMapFeatureStyle);
    confirmationPopup.setLatLng(e.latlng).openOn(map);
  }
}

function isClickInsideMapFeature(e, feature) {
  if (isMapFeatureMultiPolygons(feature)) {
    return feature.geometry.coordinates.some(poly =>
      isPointInsidePolygon(e.latlng, poly)
    );
  }
  return isPointInsidePolygon(e.latlng, feature.geometry.coordinates);
}

function isMapFeatureMultiPolygons(feature) {
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

// POPUP EVENTS

confirmGuessElement.addEventListener('click', onConfirmGuess);

function onConfirmGuess() {
  confirmationPopup.close();
  gameState.guessCorrect = isMapFeatureCorrect(gameState.selectedMapFeature);
  if (gameState.guessCorrect) {
    setGuessCorrectElementVisible();
  } else {
    setGuessIncorrectElementVisible();
  }
  gameState.gameOver = true;
  countryData.boundaries.setStyle(getMapFeatureStyle);
  resultDialogElement.show();
}

function setGuessCorrectElementVisible() {
  guessCorrectElement.style.display = 'block';
  guessIncorrectElement.style.display = 'none';
}

function setGuessIncorrectElementVisible() {
  guessCorrectElement.style.display = 'none';
  guessIncorrectElement.style.display = 'block';
  guessElement.textContent = gameState.selectedMapFeature.properties.name;
}

seeAnswerElement.addEventListener('click', onSeeAnswer);

function onSeeAnswer() {
  const answer = countryData.rawData.features.find(isMapFeatureCorrect);
  map.flyToBounds(L.geoJson(answer).getBounds());
}

playAgainElement.addEventListener('click', onPlayAgain);

function onPlayAgain() {
  resultDialogElement.close();
  resetGameState();
  countryData.boundaries.resetStyle();
  map.fitWorld();
}

// HELPER FUNCTIONS

function isCountry(geoJsonFeature) {
  return geoJsonFeature.properties.status === 'Member State';
}
