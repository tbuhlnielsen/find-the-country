import type { Feature, Geometry } from 'geojson';

export interface CountryGeoJsonProperties {
  name: string;
  status: string;
}

export type CountryFeature = Feature<Geometry, CountryGeoJsonProperties>;

export interface GameState {
  gameOver: boolean;
  selectedCountry?: CountryFeature;
  targetCountry?: CountryFeature;
}
