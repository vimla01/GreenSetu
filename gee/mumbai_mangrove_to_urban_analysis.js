// Mumbai region mangrove-to-urban conversion analysis, 2020-2025.
//
// What this measures:
// - 2020 mangrove baseline
// - remaining mangrove each year
// - area where 2020 mangroves have been converted into built-up land
//
// This is closer to the project problem statement than total urban growth,
// because it tracks urban development specifically on mangrove land.
//
// Accuracy note:
// - This uses an inferred 2020 mangrove baseline, not an official uploaded GMW layer.
// - Treat the results as draft analysis unless validated against an official baseline.

var params = {
  exportDescription: 'MumbaiRegion_MangroveToUrban_2020_2025_v2',
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
  mangroveBuiltProbMax: 0.10,
  mangroveWaterProbMax: 0.35,
  nearWaterOccurrenceThreshold: 20,

  // Tuned urban thresholds to reduce under-detection of encroachment.
  builtProbThreshold: 0.40,
  builtMeanProbThreshold: 0.30,
  top1ProbThreshold: 0.45,
  builtFrequencyThreshold: 0.18,
  urbanNdviMax: 0.45,
  urbanNdbiMin: -0.05,
  urbanWaterOccurrenceThreshold: 50,
  builtExpansionMeters: 20
};

// Approximate extent based on the wider Mumbai-region map used in the project.
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

function getDwComposite(year) {
  var dates = getSeasonBounds(year);

  return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterBounds(aoi)
    .filterDate(dates.start, dates.end)
    .select(['water', 'trees', 'flooded_vegetation', 'built'])
    .mean()
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

function build2020MangroveBaseline() {
  var s2 = getS2Composite(2020);
  var dw = getDwComposite(2020);

  var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
  var ndmi = s2.normalizedDifference(['B8', 'B11']).rename('ndmi');

  var nearPermanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
    .select('occurrence')
    .gte(params.nearWaterOccurrenceThreshold)
    .focalMax({radius: 120, units: 'meters'})
    .clip(aoi);

  return ndvi.gte(params.baselineNdviThreshold)
    .and(ndmi.gte(params.baselineNdmiThreshold))
    .and(dw.select('trees').gte(params.treeProbThreshold)
      .or(dw.select('flooded_vegetation').gte(params.floodedVegProbThreshold)))
    .and(dw.select('built').lte(params.mangroveBuiltProbMax))
    .and(dw.select('water').lte(params.mangroveWaterProbMax))
    .and(nearPermanentWater)
    .selfMask()
    .rename('baseline_mangrove');
}

function getRemainingMangroveMask(year, baselineMangroveMask) {
  var s2 = getS2Composite(year);
  var dw = getDwComposite(year);

  var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
  var ndmi = s2.normalizedDifference(['B8', 'B11']).rename('ndmi');

  return baselineMangroveMask.updateMask(
    ndvi.gte(params.baselineNdviThreshold)
      .and(ndmi.gte(params.baselineNdmiThreshold))
      .and(dw.select('trees').gte(params.treeProbThreshold)
        .or(dw.select('flooded_vegetation').gte(params.floodedVegProbThreshold)))
      .and(dw.select('built').lte(params.mangroveBuiltProbMax))
      .and(dw.select('water').lte(params.mangroveWaterProbMax))
  );
}

function getAnnualBuiltSignal(year) {
  year = ee.Number(year).toInt();

  var s2 = getS2Composite(year);
  var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
  var ndbi = s2.normalizedDifference(['B11', 'B8']).rename('ndbi');
  var dwBuiltMean = getDwCollection(year)
    .select('built')
    .mean()
    .clip(aoi);

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
    .gte(params.urbanWaterOccurrenceThreshold)
    .clip(aoi);

  var dwUrbanMask = dwBuiltFrequency.gte(params.builtFrequencyThreshold)
    .or(dwBuiltMean.gte(params.builtMeanProbThreshold));

  return dwUrbanMask
    .and(ndvi.lte(params.urbanNdviMax))
    .and(ndbi.gte(params.urbanNdbiMin))
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

function getMangroveToUrbanMask(year, baselineMangroveMask) {
  var baselineBinary = baselineMangroveMask.unmask(0).gt(0);
  var remainingBinary = getRemainingMangroveMask(year, baselineMangroveMask).unmask(0).gt(0);
  var cumulativeBuiltBinary = getCumulativeBuiltMask(year)
    .unmask(0)
    .gt(0)
    .focalMax({radius: params.builtExpansionMeters, units: 'meters'});

  return baselineBinary
    .and(cumulativeBuiltBinary)
    .and(remainingBinary.not())
    .selfMask()
    .rename('mangrove_to_urban');
}

var baselineMangroveMask = build2020MangroveBaseline();
var baselineMangroveAreaSqKm = calculateAreaSqKm(baselineMangroveMask);
var conversion2025 = getMangroveToUrbanMask(2025, baselineMangroveMask);

Map.addLayer(baselineMangroveMask, {palette: ['0b6e4f']}, 'Mangrove Baseline 2020', false);
Map.addLayer(conversion2025, {palette: ['d32f2f']}, 'Mangrove To Urban 2025', false);

function buildYearFeature(year) {
  year = ee.Number(year).toInt();

  var remainingMangroveMask = ee.Image(ee.Algorithms.If(
    year.eq(2020),
    baselineMangroveMask,
    getRemainingMangroveMask(year, baselineMangroveMask)
  ));
  var remainingMangroveSqKm = calculateAreaSqKm(remainingMangroveMask);
  var mangroveLossSqKm = baselineMangroveAreaSqKm.subtract(remainingMangroveSqKm);

  var conversionSqKm = ee.Number(ee.Algorithms.If(
    year.eq(2020),
    0,
    calculateAreaSqKm(getMangroveToUrbanMask(year, baselineMangroveMask))
  ));

  var previousConversionSqKm = ee.Number(ee.Algorithms.If(
    year.eq(2020),
    0,
    ee.Algorithms.If(
      year.eq(2021),
      0,
      calculateAreaSqKm(getMangroveToUrbanMask(year.subtract(1), baselineMangroveMask))
    )
  ));

  var newConversionSqKm = ee.Number(ee.Algorithms.If(
    year.eq(2020),
    0,
    conversionSqKm.subtract(previousConversionSqKm)
  ));

  var conversionPercentOfBaseline = ee.Number(ee.Algorithms.If(
    baselineMangroveAreaSqKm.eq(0),
    0,
    conversionSqKm.divide(baselineMangroveAreaSqKm).multiply(100)
  ));

  var urbanShareOfMangroveLossPercent = ee.Number(ee.Algorithms.If(
    mangroveLossSqKm.eq(0),
    0,
    conversionSqKm.divide(mangroveLossSqKm).multiply(100)
  ));

  return ee.Feature(null, {
    year: year,
    remaining_mangrove_sq_km: remainingMangroveSqKm,
    mangrove_loss_sq_km: mangroveLossSqKm,
    mangrove_to_urban_sq_km: conversionSqKm,
    new_conversion_sq_km: newConversionSqKm,
    conversion_percent_of_2020_mangrove: conversionPercentOfBaseline,
    urban_share_of_mangrove_loss_percent: urbanShareOfMangroveLossPercent
  });
}

var results = ee.FeatureCollection(params.years.map(buildYearFeature));

print('Mumbai region mangrove-to-urban results', results);
print('2020 mangrove baseline area (sq km)', baselineMangroveAreaSqKm);

Export.table.toDrive({
  collection: results,
  description: params.exportDescription,
  folder: params.driveFolder,
  fileFormat: 'CSV'
});
