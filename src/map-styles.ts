import { PathOptions } from 'leaflet';
import type { GameState, CountryFeature } from './types';
import { isCountryCorrect, isCountryHovered, isCountrySelected } from './util';

export function getCountryStyle(gameState: GameState) {
  return (feature?: CountryFeature) => {
    if (!feature) {
      return {};
    }
    const colour = getCountryColor(feature, gameState);
    const style: PathOptions = {
      color: colour,
      fillColor: colour
    };
    if (isCountryHovered(feature, gameState)) {
      style.fillOpacity = 0.5;
      style.weight = 2;
    }
    return style;
  };
}

function getCountryColor(country: CountryFeature, gameState: GameState) {
  if (gameState.over) {
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
  if (isCountryHovered(country, gameState)) {
    return getCssVariable('--light-blue');
  }
  return 'transparent';
}

function getCssVariable(
  cssVarName: string,
  element = document.documentElement
) {
  return getComputedStyle(element).getPropertyValue(cssVarName);
}
