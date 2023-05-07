import type { LatLng } from 'leaflet';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GlobalState, CountryGeoJsonProperties } from './types';
import { randomElement, isPointInsideCountry } from './util';

export function initialiseState(
  state: GlobalState,
  rawData: FeatureCollection<Geometry, CountryGeoJsonProperties>
) {
  const stateWithCountryData = setCountryData(state, rawData);
  return resetGameState(stateWithCountryData);
}

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

export function resetGameState(state: GlobalState) {
  return {
    ...state,
    game: {
      over: false,
      // TODO: choose target deterministically?
      targetCountry: randomElement(state.countries.rawData.features)
    }
  };
}

export function setHoveredCountry(state: GlobalState, point?: LatLng) {
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

export function setSelectedCountry(state: GlobalState, point: LatLng) {
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

export function setGameOver(state: GlobalState) {
  return {
    ...state,
    game: {
      ...state.game,
      over: true
    }
  };
}
