// Export real Mumbai mangrove geometry as vector polygons for 2020-2025.
//
// Why this script is the "real" path:
// 1. It expects an uploaded AOI and an official 2020 mangrove baseline raster.
// 2. Each year's mangrove extent is constrained to that fixed baseline.
// 3. It exports polygons, not summary-only CSV rows, so the dashboard can draw
//    exact mangrove shapes on top of map and satellite basemaps.
//
// Before running:
// - Upload your Mumbai AOI as a FeatureCollection asset.
// - Upload your official 2020 mangrove baseline as an Image asset.
//   Best option: Global Mangrove Watch 2020 clipped to your AOI.

var params = {
  aoiAsset: 'users/your_username/mumbai_region_aoi',
  baselineAsset: 'users/your_username/mumbai_gmw_2020',
  exportDescription: 'MumbaiMangroveGeometry_2020_2025',
  driveFolder: 'GreenSetu',
  scale: 10,
  years: ee.List.sequence(2020, 2025),

  seasonStartMonth: 1,
  seasonStartDay: 1,
  seasonEndMonth: 4,
  seasonEndDay: 30,

  ndviThreshold: 0.45,
  ndmiThreshold: 0.10,
  treeProbThreshold: 0.35,
  floodedVegProbThreshold: 0.20,
  builtProbMax: 0.10,
  waterProbMax: 0.20,

  simplifyMeters: 10,
  minPatchSqMeters: 500
};

var aoi = ee.FeatureCollection(params.aoiAsset).geometry();
var baselineRaw = ee.Image(params.baselineAsset).select(0).clip(aoi);
var baselineMask = baselineRaw.gt(0).selfMask().rename('baseline_mangrove');

Map.centerObject(aoi, 11);
Map.addLayer(aoi, {color: 'yellow'}, 'Mumbai AOI');
Map.addLayer(baselineMask, {palette: ['0b6e4f']}, 'Mangrove Baseline 2020', false);

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

function vectorizeMangroveMask(maskImage, year) {
  var vectors = maskImage
    .selfMask()
    .rename('label')
    .toInt()
    .reduceToVectors({
      geometry: aoi,
      scale: params.scale,
      geometryType: 'polygon',
      eightConnected: true,
      labelProperty: 'label',
      maxPixels: 1e13,
      tileScale: 4
    });

  return vectors
    .filter(ee.Filter.eq('label', 1))
    .map(function(feature) {
      var geometry = feature.geometry().simplify(params.simplifyMeters);
      var areaSqMeters = geometry.area(1);

      return ee.Feature(geometry, {
        year: ee.Number(year).toInt(),
        area_sq_m: areaSqMeters,
        area_sq_km: ee.Number(areaSqMeters).divide(1e6),
        source: 'GMW2020 baseline + Sentinel-2 + Dynamic World'
      });
    })
    .filter(ee.Filter.gte('area_sq_m', params.minPatchSqMeters));
}

var mangroveVectors = ee.FeatureCollection(params.years.map(function(year) {
  year = ee.Number(year).toInt();

  var yearMask = ee.Image(ee.Algorithms.If(
    year.eq(2020),
    baselineMask,
    getRemainingMangroveMask(year)
  ));

  return vectorizeMangroveMask(yearMask, year);
})).flatten();

var mangrove2025Vectors = mangroveVectors.filter(ee.Filter.eq('year', 2025));

print('Mumbai mangrove geometry export', mangroveVectors.limit(10));
Map.addLayer(mangrove2025Vectors, {color: '1b9e77'}, 'Mangrove Polygons 2025');

Export.table.toDrive({
  collection: mangroveVectors,
  description: params.exportDescription,
  folder: params.driveFolder,
  fileFormat: 'GeoJSON'
});
