import L from 'leaflet';
import type { GeoJSON, LatLng, Layer, LeafletMouseEvent, Map } from 'leaflet';
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson';
import 'leaflet/dist/leaflet.css';

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

interface CountryGeoJsonProperties {
  name: string;
  status: string;
}

type CountryFeature = Feature<Geometry, CountryGeoJsonProperties>;

interface GameState {
  gameOver: boolean;
  selectedCountry?: CountryFeature;
  targetCountry?: CountryFeature;
}

let gameState: GameState = {
  gameOver: false
};

let countriesGeoJson: GeoJSON<CountryGeoJsonProperties> | undefined;
let countries: CountryFeature[] | undefined;

fetch('/country-boundaries.geojson')
  .then(response => response.json())
  .then((data: FeatureCollection<Geometry, CountryGeoJsonProperties>) => {
    // TODO: process data before deploying.
    const processedData = {
      ...data,
      features: data.features.filter(
        feature => feature.properties.status === 'Member State' // ignore disputed territories
      )
    };
    countriesGeoJson = L.geoJson(processedData, {
      onEachFeature,
      style: { color: 'transparent', fillColor: 'transparent' }
    }).addTo(map);
    countries = processedData.features;
    resetGame(map, countries, countriesGeoJson, true);
  })
  .catch(console.error);

function resetGame(
  map: Map,
  countries: CountryFeature[],
  countriesGeoJson: GeoJSON<CountryGeoJsonProperties>,
  init = false
) {
  const targetCountry = randomElement(countries);
  gameState = {
    gameOver: false,
    targetCountry
  };
  if (!init) {
    setStyle(countriesGeoJson, gameState);
    map.fitWorld();
  }
  updateTargetCountryUI(targetCountry.properties.name);
}

function updateTargetCountryUI(name: string) {
  targetCountryElement.textContent = `Where is ${name}?`;
  // Only play the animation when the target is set to avoid
  // a weird flicker while the data is loading.
  targetCountryElement.style.animationPlayState = 'running';
  answerElement.textContent = name;
}

// MAP STYLES

function setStyle(
  countriesGeoJson: GeoJSON<CountryGeoJsonProperties>,
  gameState: GameState
) {
  countriesGeoJson.setStyle(feature => getCountryStyle(gameState, feature));
}

const COLOUR_PALETTE = {
  success: '#00ff66',
  error: '#ff0066',
  highlight: '#6600ff'
};

function getCountryStyle(gameState: GameState, country?: CountryFeature) {
  if (!country) {
    return {};
  }
  const colour = getCountryColor(country, gameState);
  return {
    color: colour,
    fillColor: colour
  };
}

function getCountryColor(country: CountryFeature, gameState: GameState) {
  if (gameState.gameOver) {
    if (isCountryCorrect(country, gameState)) {
      return COLOUR_PALETTE.success;
    }
    if (isCountrySelected(country, gameState)) {
      return COLOUR_PALETTE.error;
    }
    return 'transparent';
  }
  if (isCountrySelected(country, gameState)) {
    return COLOUR_PALETTE.highlight;
  }
  return 'transparent';
}

function isCountryCorrect(country: CountryFeature, gameState: GameState) {
  if (gameState.targetCountry) {
    return country.properties.name === gameState.targetCountry.properties.name;
  }
  return false;
}

function isCountrySelected(country: CountryFeature, gameState: GameState) {
  if (gameState.selectedCountry) {
    return (
      country.properties.name === gameState.selectedCountry.properties.name
    );
  }
  return false;
}

// COUNTRY HOVER + CLICK EVENTS

function onEachFeature(_: CountryFeature, layer: Layer) {
  layer.on({
    mouseover: onMouseOverFeature,
    mouseout: onMouseOutFeature,
    click: zoomToFeature
  });
}

function onMouseOverFeature(e: LeafletMouseEvent) {
  if (gameState.gameOver || isCountrySelected(e.target.feature, gameState)) {
    return;
  }
  const layer = e.target;
  layer.setStyle({
    color: '#0066ff', // TODO: add to colour palette
    fillColor: '#0066ff',
    fillOpacity: 0.5,
    weight: 2
  });
  layer.bringToFront();
}

function onMouseOutFeature(e: LeafletMouseEvent) {
  if (gameState.gameOver || isCountrySelected(e.target.feature, gameState)) {
    return;
  }
  countriesGeoJson?.resetStyle(e.target);
}

function zoomToFeature(e: LeafletMouseEvent) {
  map.fitBounds(e.target.getBounds());
}

// MAP CLICK EVENT

map.on('click', e => {
  if (gameState.gameOver || !countries) {
    return;
  }
  gameState.selectedCountry = countries.find(feature =>
    isPointInsideCountry(e.latlng, feature)
  );
  if (countriesGeoJson && gameState.selectedCountry) {
    setStyle(countriesGeoJson, gameState);
    confirmationPopup.setLatLng(e.latlng).openOn(map);
  }
});

function isPointInsideCountry(point: LatLng, feature: CountryFeature) {
  switch (feature.geometry.type) {
    case 'Polygon':
      return isPointInsidePolygon(point, feature.geometry.coordinates);

    case 'MultiPolygon':
      return feature.geometry.coordinates.some(poly =>
        isPointInsidePolygon(point, poly)
      );

    default:
      console.error('Unexpected feature geometry type', feature.geometry.type);
      return false;
  }
}

// https://stackoverflow.com/questions/31790344/determine-if-a-point-reside-inside-a-leaflet-polygon
function isPointInsidePolygon(point: LatLng, poly: Polygon['coordinates']) {
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

confirmGuessElement.addEventListener('click', () => {
  confirmationPopup.close();
  if (gameState.selectedCountry) {
    if (isCountryCorrect(gameState.selectedCountry, gameState)) {
      setGuessCorrectElementVisible();
    } else {
      setGuessIncorrectElementVisible(
        gameState.selectedCountry.properties.name
      );
    }
    gameState.gameOver = true;
    countriesGeoJson?.setStyle(feature => getCountryStyle(gameState, feature));
    resultDialogElement.show();
  }
});

function setGuessCorrectElementVisible() {
  guessCorrectElement.style.display = 'block';
  guessIncorrectElement.style.display = 'none';
}

function setGuessIncorrectElementVisible(selectedCountryName: string) {
  guessCorrectElement.style.display = 'none';
  guessIncorrectElement.style.display = 'block';
  guessElement.textContent = selectedCountryName;
}

seeAnswerElement.addEventListener('click', () => {
  if (gameState.targetCountry) {
    map.flyToBounds(L.geoJson(gameState.targetCountry).getBounds());
  }
});

playAgainElement.addEventListener('click', () => {
  resultDialogElement.close();
  if (countries && countriesGeoJson) {
    resetGame(map, countries, countriesGeoJson);
  }
});

// HELPERS

function randomElement<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)];
}
