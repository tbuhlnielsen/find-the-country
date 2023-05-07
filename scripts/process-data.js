import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const geoJSON = JSON.parse(
    await readFile(join(__dirname, '../country-boundaries.geojson'), 'utf8')
  );
  const countriesGeoJSON = {
    ...geoJSON,
    features: geoJSON.features.filter(
      // Ignore disputed territories/sovereign states etc.
      feature => feature.properties.status === 'Member State'
    )
  };
  await writeFile(
    join(__dirname, '../dist/country-boundaries.geojson'),
    JSON.stringify(countriesGeoJSON)
  );
} catch (err) {
  console.error(err);
}
