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
import { resetCountryStyles, setHoverCountryStyle } from './map-styles';
import type {
  CountryFeature,
  CountryGeoJsonProperties,
  GameState
} from './types';
import { randomElement, isCountrySelected, isPointInsideCountry } from './util';
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
    resetCountryStyles(countriesGeoJson, gameState);
    map.fitWorld();
  }
  setTargetCountryName(targetCountry.properties.name);
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
  setHoverCountryStyle(layer);
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
    resetCountryStyles(countriesGeoJson, gameState);
    confirmationPopup.setLatLng(e.latlng).openOn(map);
  }
});

confirmGuessButton.addEventListener('click', () => {
  confirmationPopup.close();
  gameState.gameOver = true;
  if (countriesGeoJson) {
    resetCountryStyles(countriesGeoJson, gameState);
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
