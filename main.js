const boundsLatLng = [
  [-70, -179],
  [85, 179]
];
const mapCentre = [0, 0];
const initZoom = 2;

const map = L.map('map', { maxBounds: boundsLatLng }).setView(
  mapCentre,
  initZoom
);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 10,
    minZoom: 2,
    bounds: boundsLatLng,
    noWrap: true
  }
).addTo(map);

let target = 'South Africa';
let guessCorrect;

function isCountry(geoJsonFeature) {
  return geoJsonFeature.properties.status === 'Member State';
}

// https://stackoverflow.com/questions/31790344/determine-if-a-point-reside-inside-a-leaflet-polygon
function isPointInsidePolygon(point, poly) {
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

function isGeoJsonFeatureMultiPolygons(feature) {
  // True for countries with multiple separated territories.
  return feature.geometry.coordinates[0].length === 1;
}

function isClickInsideGeoJsonFeature(e, feature) {
  if (isGeoJsonFeatureMultiPolygons(feature)) {
    return targetFeature.geometry.coordinates.some(poly =>
      isPointInsidePolygon(e.latlng, poly)
    );
  } else {
    return isPointInsidePolygon(e.latlng, feature.geometry.coordinates);
  }
}

function onMapClick(e) {
  const targetFeature = countryBoundariesRawData.features.find(
    feature => feature.properties.name === target
  );
  if (targetFeature) {
    guessCorrect = isClickInsideGeoJsonFeature(e, targetFeature);
    console.log(guessCorrect);
  }
}

map.on('click', onMapClick);

let countryBoundariesRawData;
let countryBoundariesGeoJson;

function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    color: '#0066ff',
    fillColor: '#0066ff',
    fillOpacity: 0.5,
    weight: 2
  });
  layer.bringToFront();
}

function resetHighlight(e) {
  countryBoundariesGeoJson.resetStyle(e.target);
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight
  });
}

fetch('./country-boundaries.geojson')
  .then(response => response.json())
  .then(data => {
    countryBoundariesRawData = data;
    countryBoundariesGeoJson = L.geoJson(data, {
      onEachFeature,
      style: { fillColor: 'transparent', color: 'transparent' }
    }).addTo(map);
  })
  .catch(console.error);
