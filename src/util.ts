import type { LatLng } from 'leaflet';
import type { Polygon } from 'geojson';
import type { CountryFeature, GameState } from './types';

export function randomElement<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export function isPointInsideCountry(point: LatLng, feature: CountryFeature) {
  switch (feature.geometry.type) {
    case 'Polygon':
      return isPointInsidePolygon(point, feature.geometry.coordinates);

    case 'MultiPolygon':
      return feature.geometry.coordinates.some(poly =>
        isPointInsidePolygon(point, poly)
      );

    default:
      throw new Error(
        'Unexpected feature geometry type ' + feature.geometry.type
      );
  }
}

// https://stackoverflow.com/questions/31790344/determine-if-a-point-reside-inside-a-leaflet-polygon
export function isPointInsidePolygon(
  point: LatLng,
  poly: Polygon['coordinates']
) {
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

export function isCountryCorrect(
  country: CountryFeature,
  gameState: GameState
) {
  if (gameState.targetCountry) {
    return country.properties.name === gameState.targetCountry.properties.name;
  }
  return false;
}

export function isCountrySelected(
  country: CountryFeature,
  gameState: GameState
) {
  if (gameState.selectedCountry) {
    return (
      country.properties.name === gameState.selectedCountry.properties.name
    );
  }
  return false;
}

export function isCountryHovered(
  country: CountryFeature,
  gameState: GameState
) {
  if (gameState.hoveredCountry) {
    return country.properties.name === gameState.hoveredCountry.properties.name;
  }
  return false;
}
