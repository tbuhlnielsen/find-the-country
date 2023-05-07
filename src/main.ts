import L, { LatLng } from 'leaflet';
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
import { randomElement, isPointInsideCountry, isCountrySelected } from './util';
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

const geoJsonLayer = L.geoJSON(undefined, {
  style: { color: 'transparent', fillColor: 'transparent' }
}).addTo(map);

const confirmationPopup = L.popup().setContent(confirmGuessButton);

// INITIALISE STATE

let globalState: GlobalState;

function setCountryData(
  state: GlobalState,
  rawData: FeatureCollection<Geometry, CountryGeoJsonProperties>
) {
  return {
    ...state,
    countries: {
      rawData
    }
  };
}

function resetGameState(state: GlobalState) {
  return {
    ...state,
    game: {
      over: false,
      // TODO: choose target deterministically?
      targetCountry: randomElement(state.countries.rawData.features)
    }
  };
}

function setHoveredCountry(state: GlobalState, point?: LatLng) {
  if (state.game.over) {
    return state;
  }
  const hoveredCountry = point
    ? state.countries.rawData.features.find(country =>
        isPointInsideCountry(point, country)
      )
    : undefined;
  return {
    ...state,
    game: {
      ...state.game,
      hoveredCountry
    }
  };
}

function setSelectedCountry(state: GlobalState, point: LatLng) {
  if (state.game.over) {
    return state;
  }
  const selectedCountry = state.countries.rawData.features.find(country =>
    isPointInsideCountry(point, country)
  );
  return {
    ...state,
    game: {
      ...state.game,
      selectedCountry
    }
  };
}

function setGameOver(state: GlobalState) {
  return {
    ...state,
    game: {
      ...state.game,
      over: true
    }
  };
}

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

    geoJsonLayer.addData(processedData);

    globalState = setCountryData(globalState, processedData);
    globalState = resetGameState(globalState);

    setTargetCountryName(globalState.game.targetCountry.properties.name);
    // Only play the animation when the target is set to avoid
    // a weird flicker while the data is loading.
    startTargetCountryAnimation();
  })
  .catch(console.error);

// EVENTS

geoJsonLayer.on('mouseover', e => {
  globalState = setHoveredCountry(globalState, e.latlng);

  if (
    !(
      globalState.game.over ||
      isCountrySelected(e.propagatedFrom.feature, globalState.game)
    )
  ) {
    const layer = e.propagatedFrom;
    layer.setStyle(getCountryStyle(globalState.game)(layer.feature));
    layer.bringToFront();
  }
});

geoJsonLayer.on('mouseout', e => {
  globalState = setHoveredCountry(globalState, undefined);

  if (
    !(
      globalState.game.over ||
      isCountrySelected(e.propagatedFrom.feature, globalState.game)
    )
  ) {
    geoJsonLayer.resetStyle(e.propagatedFrom);
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
