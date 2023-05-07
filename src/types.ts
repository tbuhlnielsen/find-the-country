import type { Feature, FeatureCollection, Geometry } from 'geojson';

export interface GlobalState {
  countries: {
    rawData: FeatureCollection<Geometry, CountryGeoJsonProperties>;
  };
  game: GameState;
}

export interface CountryGeoJsonProperties {
  name: string;
}

export interface GameState {
  over: boolean;
  hoveredCountry?: CountryFeature;
  selectedCountry?: CountryFeature;
  targetCountry: CountryFeature;
}

export type CountryFeature = Feature<Geometry, CountryGeoJsonProperties>;
