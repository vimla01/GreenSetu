// Mumbai region urban growth extraction, 2020-2025.
//
// Main source:
// - Dynamic World V1 built class
//
// Supporting filters:
// - Sentinel-2 SR Harmonized for NDVI and NDBI
// - JRC Global Surface Water to avoid counting water as urban
//
// The workflow exports cumulative built-up area so the total urban footprint
// grows through time instead of bouncing unrealistically from one year to the next.

var params = {
  exportDescription: 'MumbaiRegion_UrbanGrowth_2020_2025',
  driveFolder: 'GreenSetu',
  scale: 10,
  years: ee.List.sequence(2020, 2025),

  seasonStartMonth: 1,
  seasonStartDay: 1,
  seasonEndMonth: 4,
  seasonEndDay: 30,

  builtProbThreshold: 0.45,
  top1ProbThreshold: 0.50,
  builtFrequencyThreshold: 0.25,
  ndviMax: 0.35,
  ndbiMin: 0.00,
  waterOccurrenceThreshold: 50
};

// Approximate extent based on the full Mumbai-region map already used in the project.
var aoi = ee.Geometry.Rectangle([72.79, 18.82, 73.18, 19.23]);
var classBands = [
  'water', 'trees', 'grass', 'flooded_vegetation', 'crops',
  'shrub_and_scrub', 'built', 'bare', 'snow_and_ice'
];

Map.centerObject(aoi, 11);
Map.addLayer(aoi, {color: 'yellow'}, 'Mumbai Region AOI');

function getSeasonBounds(year) {
  year = ee.Number(year).toInt();
  return {
    start: ee.Date.fromYMD(year, params.seasonStartMonth, params.seasonStartDay),
    end: ee.Date.fromYMD(year, params.seasonEndMonth, params.seasonEndDay).advance(1, 'day')
  };
}

function maskS2Clouds(image) {
  var scl = image.select('SCL');
  var keep = scl.neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));

  return image.updateMask(keep).divide(10000);
}

function getS2Composite(year) {
  var dates = getSeasonBounds(year);

  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(dates.start, dates.end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 35))
    .map(maskS2Clouds)
    .select(['B2', 'B3', 'B4', 'B8', 'B11'])
    .median()
    .clip(aoi);
}

function getDwCollection(year) {
  var dates = getSeasonBounds(year);

  return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterBounds(aoi)
    .filterDate(dates.start, dates.end);
}

function calculateAreaSqKm(maskImage) {
  var areaImage = ee.Image.pixelArea().rename('area').updateMask(maskImage);
  var stats = ee.Dictionary(areaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: params.scale,
    maxPixels: 1e13,
    tileScale: 4
  }));
  var area = ee.Number(ee.Algorithms.If(stats.contains('area'), stats.get('area'), 0));
  return area.divide(1e6);
}

function getAnnualBuiltSignal(year) {
  year = ee.Number(year).toInt();

  var s2 = getS2Composite(year);
  var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
  var ndbi = s2.normalizedDifference(['B11', 'B8']).rename('ndbi');

  var dwBuiltFrequency = getDwCollection(year)
    .map(function(image) {
      var top1Prob = image.select(classBands).reduce(ee.Reducer.max());
      var confidentBuilt = image.select('label').eq(6)
        .and(image.select('built').gte(params.builtProbThreshold))
        .and(top1Prob.gte(params.top1ProbThreshold));
      return confidentBuilt.rename('built_mask');
    })
    .mean()
    .clip(aoi);

  var permanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
    .select('occurrence')
    .gte(params.waterOccurrenceThreshold)
    .clip(aoi);

  return dwBuiltFrequency.gte(params.builtFrequencyThreshold)
    .and(ndvi.lte(params.ndviMax))
    .and(ndbi.gte(params.ndbiMin))
    .and(permanentWater.not())
    .selfMask()
    .rename('builtup');
}

function getCumulativeBuiltMask(year) {
  year = ee.Number(year).toInt();

  var yearlyMasks = ee.List.sequence(2020, year).map(function(y) {
    return getAnnualBuiltSignal(ee.Number(y));
  });

  return ee.ImageCollection.fromImages(yearlyMasks).max().selfMask().rename('builtup_cumulative');
}

var baselineMask = getCumulativeBuiltMask(2020);
var baselineAreaSqKm = calculateAreaSqKm(baselineMask);
var urban2025 = getCumulativeBuiltMask(2025);

Map.addLayer(baselineMask, {palette: ['c62828']}, 'Built-up Baseline 2020', false);
Map.addLayer(urban2025, {palette: ['ef5350']}, 'Built-up 2025', false);

function buildYearFeature(year) {
  year = ee.Number(year).toInt();

  var cumulativeMask = getCumulativeBuiltMask(year);
  var areaSqKm = calculateAreaSqKm(cumulativeMask);

  var previousAreaSqKm = ee.Number(ee.Algorithms.If(
    year.eq(2020),
    baselineAreaSqKm,
    calculateAreaSqKm(getCumulativeBuiltMask(year.subtract(1)))
  ));

  var urbanGrowthSqKm = areaSqKm.subtract(baselineAreaSqKm);
  var urbanGrowthPercent = ee.Number(ee.Algorithms.If(
    baselineAreaSqKm.eq(0),
    0,
    urbanGrowthSqKm.divide(baselineAreaSqKm).multiply(100)
  ));
  var newBuiltupSqKm = ee.Number(ee.Algorithms.If(
    year.eq(2020),
    0,
    areaSqKm.subtract(previousAreaSqKm)
  ));

  return ee.Feature(null, {
    year: year,
    builtup_area_sq_km: areaSqKm,
    new_builtup_sq_km: newBuiltupSqKm,
    urban_growth_sq_km: urbanGrowthSqKm,
    urban_growth_percent: urbanGrowthPercent
  });
}

var results = ee.FeatureCollection(params.years.map(buildYearFeature));

print('Mumbai region urban growth results', results);
print('2020 built-up baseline area (sq km)', baselineAreaSqKm);

Export.table.toDrive({
  collection: results,
  description: params.exportDescription,
  folder: params.driveFolder,
  fileFormat: 'CSV'
});
