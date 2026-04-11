// Fallback workflow when you do not have AOI/raster files to upload.
//
// How to use:
// 1. Open this script in Earth Engine.
// 2. Use the default rectangle below for the wider Mumbai Metropolitan Region,
//    or replace it with your own polygon/rectangle later.
// 3. Run the script.
//
// Accuracy note:
// This is less reliable than using an official 2020 Global Mangrove Watch raster.
// It is meant to unblock student project work when files are not available yet.

var params = {
  exportDescription: 'MumbaiRegion_Mangrove_2020_2025',
  driveFolder: 'GreenSetu',
  scale: 10,
  years: ee.List.sequence(2020, 2025),

  seasonStartMonth: 1,
  seasonStartDay: 1,
  seasonEndMonth: 4,
  seasonEndDay: 30,

  baselineNdviThreshold: 0.45,
  baselineNdmiThreshold: 0.10,
  treeProbThreshold: 0.40,
  floodedVegProbThreshold: 0.20,
  builtProbMax: 0.10,
  waterProbMax: 0.35,
  waterOccurrenceThreshold: 20
};

// Approximate extent based on the full region shown in your reference map.
// Format: [min_longitude, min_latitude, max_longitude, max_latitude]
var aoi = ee.Geometry.Rectangle([72.79, 18.82, 73.18, 19.23]);

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

function getDwComposite(year) {
  var dates = getSeasonBounds(year);

  return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterBounds(aoi)
    .filterDate(dates.start, dates.end)
    .select(['water', 'trees', 'flooded_vegetation', 'built'])
    .mean()
    .clip(aoi);
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

function build2020Baseline() {
  var s2 = getS2Composite(2020);
  var dw = getDwComposite(2020);

  var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
  var ndmi = s2.normalizedDifference(['B8', 'B11']).rename('ndmi');

  var nearPermanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
    .select('occurrence')
    .gte(params.waterOccurrenceThreshold)
    .focalMax({radius: 120, units: 'meters'})
    .clip(aoi);

  var baselineMask = ndvi.gte(params.baselineNdviThreshold)
    .and(ndmi.gte(params.baselineNdmiThreshold))
    .and(dw.select('trees').gte(params.treeProbThreshold)
      .or(dw.select('flooded_vegetation').gte(params.floodedVegProbThreshold)))
    .and(dw.select('built').lte(params.builtProbMax))
    .and(dw.select('water').lte(params.waterProbMax))
    .and(nearPermanentWater)
    .selfMask()
    .rename('baseline_mangrove');

  return baselineMask;
}

var baselineMask = build2020Baseline();
var baselineAreaSqKm = calculateAreaSqKm(baselineMask);

Map.addLayer(baselineMask, {palette: ['0b6e4f']}, 'Approximate Mangrove Baseline 2020');

function getRemainingMangroveMask(year) {
  var s2 = getS2Composite(year);
  var dw = getDwComposite(year);

  var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
  var ndmi = s2.normalizedDifference(['B8', 'B11']).rename('ndmi');

  return baselineMask.updateMask(
    ndvi.gte(params.baselineNdviThreshold)
      .and(ndmi.gte(params.baselineNdmiThreshold))
      .and(dw.select('trees').gte(params.treeProbThreshold)
        .or(dw.select('flooded_vegetation').gte(params.floodedVegProbThreshold)))
      .and(dw.select('built').lte(params.builtProbMax))
      .and(dw.select('water').lte(params.waterProbMax))
  );
}

function buildYearFeature(year) {
  year = ee.Number(year).toInt();

  var areaSqKm = ee.Number(ee.Algorithms.If(
    year.eq(2020),
    baselineAreaSqKm,
    calculateAreaSqKm(getRemainingMangroveMask(year))
  ));

  var reductionSqKm = baselineAreaSqKm.subtract(areaSqKm);
  var reductionPercent = ee.Number(ee.Algorithms.If(
    baselineAreaSqKm.eq(0),
    0,
    reductionSqKm.divide(baselineAreaSqKm).multiply(100)
  ));

  return ee.Feature(null, {
    year: year,
    mangrove_area_sq_km: areaSqKm,
    reduction_sq_km: reductionSqKm,
    reduction_percent: reductionPercent
  });
}

var results = ee.FeatureCollection(params.years.map(buildYearFeature));

print('Approximate 2020-2025 Mumbai region mangrove results', results);
print('Approximate 2020 baseline area (sq km)', baselineAreaSqKm);

Export.table.toDrive({
  collection: results,
  description: params.exportDescription,
  folder: params.driveFolder,
  fileFormat: 'CSV'
});
