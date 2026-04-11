// Stable mangrove extraction for Thane Creek, 2020-2025.
//
// Why this script is safer than a raw Dynamic World export:
// 1. It locks all yearly estimates to a fixed 2020 mangrove baseline.
// 2. Later years can only remain inside that baseline footprint.
// 3. It combines Sentinel-2 vegetation signals with Dynamic World classes.
//
// Before running:
// - Upload your Thane Creek AOI as a FeatureCollection asset.
// - Upload a 2020 mangrove raster as an Image asset where mangrove pixels > 0.
//   Best option: Global Mangrove Watch 2020 clipped to your AOI.

var params = {
  aoiAsset: 'users/your_username/thane_creek_aoi',
  baselineAsset: 'users/your_username/thane_creek_gmw_2020',
  exportDescription: 'ThaneCreek_Mangrove_2020_2025',
  driveFolder: 'GreenSetu',
  scale: 10,
  years: ee.List.sequence(2020, 2025),

  // Keep the same season every year to reduce monsoon/cloud variability.
  seasonStartMonth: 1,
  seasonStartDay: 1,
  seasonEndMonth: 4,
  seasonEndDay: 30,

  // Thresholds you can tune after visual inspection.
  ndviThreshold: 0.45,
  ndmiThreshold: 0.10,
  treeProbThreshold: 0.35,
  floodedVegProbThreshold: 0.20,
  builtProbMax: 0.10,
  waterProbMax: 0.20
};

var aoi = ee.FeatureCollection(params.aoiAsset).geometry();
var baselineRaw = ee.Image(params.baselineAsset).select(0).clip(aoi);
var baselineMask = baselineRaw.gt(0).selfMask().rename('baseline_mangrove');

Map.centerObject(aoi, 11);
Map.addLayer(aoi, {color: 'yellow'}, 'AOI');
Map.addLayer(baselineMask, {palette: ['0b6e4f']}, 'Mangrove Baseline 2020');

function getSeasonBounds(year) {
  year = ee.Number(year).toInt();
  return {
    start: ee.Date.fromYMD(year, params.seasonStartMonth, params.seasonStartDay),
    end: ee.Date.fromYMD(year, params.seasonEndMonth, params.seasonEndDay).advance(1, 'day')
  };
}

function maskS2Clouds(image) {
  var scl = image.select('SCL');
  var keep = scl.neq(3)   // cloud shadow
    .and(scl.neq(8))      // cloud medium probability
    .and(scl.neq(9))      // cloud high probability
    .and(scl.neq(10))     // cirrus
    .and(scl.neq(11));    // snow/ice

  return image
    .updateMask(keep)
    .divide(10000)
    .copyProperties(image, image.propertyNames());
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
  var areaImage = ee.Image.pixelArea().updateMask(maskImage);
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

var baselineAreaSqKm = calculateAreaSqKm(baselineMask);

function getRemainingMangroveMask(year) {
  year = ee.Number(year).toInt();

  var s2 = getS2Composite(year);
  var dw = getDwComposite(year);

  var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
  var ndmi = s2.normalizedDifference(['B8', 'B11']).rename('ndmi');

  var vegetationMask = ndvi.gte(params.ndviThreshold)
    .and(ndmi.gte(params.ndmiThreshold));

  var mangroveLikeMask = dw.select('trees').gte(params.treeProbThreshold)
    .or(dw.select('flooded_vegetation').gte(params.floodedVegProbThreshold));

  var exclusionMask = dw.select('built').lte(params.builtProbMax)
    .and(dw.select('water').lte(params.waterProbMax));

  return baselineMask.updateMask(
    vegetationMask.and(mangroveLikeMask).and(exclusionMask)
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
  var reductionPercent = reductionSqKm.divide(baselineAreaSqKm).multiply(100);

  return ee.Feature(null, {
    year: year,
    mangrove_area_sq_km: areaSqKm,
    reduction_sq_km: reductionSqKm,
    reduction_percent: reductionPercent
  });
}

var results = ee.FeatureCollection(params.years.map(buildYearFeature));
var mangrove2025 = getRemainingMangroveMask(2025);

print('2020-2025 mangrove results', results);
print('2020 baseline area (sq km)', baselineAreaSqKm);
Map.addLayer(mangrove2025, {palette: ['1b9e77']}, 'Remaining Mangrove 2025', false);

Export.table.toDrive({
  collection: results,
  description: params.exportDescription,
  folder: params.driveFolder,
  fileFormat: 'CSV'
});
