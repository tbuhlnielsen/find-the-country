import type { GeoJSON } from 'leaflet';
import type {
  CountryGeoJsonProperties,
  GameState,
  CountryFeature
} from './types';
import { isCountryCorrect, isCountrySelected } from './util';

export function resetCountryStyles(
  countriesGeoJson: GeoJSON<CountryGeoJsonProperties>,
  gameState: GameState
) {
  countriesGeoJson.setStyle(feature => getCountryStyle(gameState, feature));
}

export function setHoverCountryStyle(layer: GeoJSON) {
  layer.setStyle({
    color: getCssVariable('--light-blue'),
    fillColor: getCssVariable('--light-blue'),
    fillOpacity: 0.5,
    weight: 2
  });
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
