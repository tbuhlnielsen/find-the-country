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
