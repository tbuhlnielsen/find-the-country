import L from 'leaflet';
import type { GeoJSON, Layer, LeafletMouseEvent, Map } from 'leaflet';
import type { FeatureCollection, Geometry } from 'geojson';
import {
  closeResultDialog,
  confirmGuessButton,
  playAgainButton,
  seeAnswerButton,
  setTargetCountryName,
  showResultDialog,
  startTargetCountryAnimation
} from './dom';
import type {
  CountryFeature,
  CountryGeoJsonProperties,
  GameState
} from './types';
import {
  randomElement,
  isCountryCorrect,
  isCountrySelected,
  isPointInsideCountry
} from './util';
import 'leaflet/dist/leaflet.css';

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

const confirmationPopup = L.popup().setContent(confirmGuessButton);

// INITIALISE COUNTRY DATA + GAME STATE

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
    // Only play the animation when the target is set to avoid
    // a weird flicker while the data is loading.
    startTargetCountryAnimation();
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
  setTargetCountryName(targetCountry.properties.name);
}

// MAP STYLES

function setStyle(
  countriesGeoJson: GeoJSON<CountryGeoJsonProperties>,
  gameState: GameState
) {
  countriesGeoJson.setStyle(feature => getCountryStyle(gameState, feature));
}

function getCssVariable(
  cssVarName: string,
  element = document.documentElement
) {
  return getComputedStyle(element).getPropertyValue(cssVarName);
}

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
      return getCssVariable('--light-green');
    }
    if (isCountrySelected(country, gameState)) {
      return getCssVariable('--light-red');
    }
    return 'transparent';
  }
  if (isCountrySelected(country, gameState)) {
    return getCssVariable('--purple');
  }
  return 'transparent';
}

// EVENTS

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
    color: getCssVariable('--light-blue'),
    fillColor: getCssVariable('--light-blue'),
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

confirmGuessButton.addEventListener('click', () => {
  confirmationPopup.close();
  gameState.gameOver = true;
  if (countriesGeoJson) {
    setStyle(countriesGeoJson, gameState);
  }
  showResultDialog(gameState);
});

seeAnswerButton.addEventListener('click', () => {
  if (gameState.targetCountry) {
    map.flyToBounds(L.geoJson(gameState.targetCountry).getBounds());
  }
});

playAgainButton.addEventListener('click', () => {
  closeResultDialog();
  if (countries && countriesGeoJson) {
    resetGame(map, countries, countriesGeoJson);
  }
});
