import L from 'leaflet';
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
import { getCountryStyle } from './map-styles';
import type { CountryGeoJsonProperties, GlobalState } from './types';
import { isCountrySelected } from './util';
import 'leaflet/dist/leaflet.css';
import {
  resetGameState,
  setHoveredCountry,
  setSelectedCountry,
  setGameOver,
  initialiseState
} from './state';

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

const geoJsonLayer = L.geoJSON(undefined, {
  style: { color: 'transparent', fillColor: 'transparent' }
}).addTo(map);

const confirmationPopup = L.popup().setContent(confirmGuessButton);

// INITIALISE STATE

let globalState: GlobalState;

fetch('./country-boundaries.geojson')
  .then(response => response.json())
  .then((data: FeatureCollection<Geometry, CountryGeoJsonProperties>) => {
    geoJsonLayer.addData(data);
    globalState = initialiseState(globalState, data);
    setTargetCountryName(globalState.game.targetCountry.properties.name);
    // Only play the animation when the target is set to avoid
    // a weird flicker while the data is loading.
    startTargetCountryAnimation();
  })
  .catch(console.error);

// EVENTS

geoJsonLayer.on('mouseover', e => {
  const layer = e.propagatedFrom;
  globalState = setHoveredCountry(globalState, layer.feature);
  if (
    !(
      globalState.game.over ||
      isCountrySelected(layer.feature, globalState.game)
    )
  ) {
    layer.setStyle(getCountryStyle(globalState.game)(layer.feature));
    layer.bringToFront();
  }
});

geoJsonLayer.on('mouseout', e => {
  globalState = setHoveredCountry(globalState, undefined);
  const layer = e.propagatedFrom;
  if (
    !(
      globalState.game.over ||
      isCountrySelected(layer.feature, globalState.game)
    )
  ) {
    geoJsonLayer.resetStyle(layer);
  }
});

geoJsonLayer.on('click', e => {
  map.fitBounds(e.propagatedFrom.getBounds());
});

map.on('click', e => {
  globalState = setSelectedCountry(globalState, e.latlng);

  geoJsonLayer.setStyle(getCountryStyle(globalState.game));
  if (globalState.game.selectedCountry) {
    confirmationPopup.setLatLng(e.latlng).openOn(map);
  }
});

confirmGuessButton.addEventListener('click', () => {
  globalState = setGameOver(globalState);

  confirmationPopup.close();
  geoJsonLayer.setStyle(getCountryStyle(globalState.game));
  showResultDialog(globalState.game);
});

seeAnswerButton.addEventListener('click', () => {
  if (globalState.game.targetCountry) {
    map.flyToBounds(L.geoJson(globalState.game.targetCountry).getBounds());
  }
});

playAgainButton.addEventListener('click', () => {
  globalState = resetGameState(globalState);

  closeResultDialog();
  geoJsonLayer.resetStyle();
  map.fitWorld();
  setTargetCountryName(globalState.game.targetCountry.properties.name);
});
