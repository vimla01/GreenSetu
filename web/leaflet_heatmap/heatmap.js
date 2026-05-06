(function () {
  const rawPoints = window.__MUMBAI_HEATMAP_POINTS__ || [];
  const rawFeatureCollection = window.__MUMBAI_MAP_FEATURES__ || { type: "FeatureCollection", features: [] };
  const metadata = window.__MUMBAI_MAP_METADATA__ || {};
  const center = window.__MUMBAI_HEATMAP_CENTER__ || { lat: 19.0677, lng: 72.9177 };
  const boundsData = window.__MUMBAI_HEATMAP_BOUNDS__;

  const mapNode = document.getElementById("leaflet-ndvi-heatmap");
  const metaNode = document.getElementById("leaflet-heatmap-meta");
  const countLabelNode = document.getElementById("hm-count-label");
  const countNode = document.getElementById("hm-points");
  const zonesLabelNode = document.getElementById("hm-zones-label");
  const yearNode = document.getElementById("hm-zones");
  const spanNode = document.getElementById("hm-span");
  const modeNode = document.getElementById("hm-mode");
  const layerStatusNode = document.getElementById("hm-layer-status");
  const legendLeftNode = document.getElementById("hm-legend-left");
  const legendRightNode = document.getElementById("hm-legend-right");
  const zoneChipsNode = document.getElementById("hm-zone-chips");
  const legendGradientNode = document.getElementById("hm-legend-gradient");
  const mapStageNode = document.querySelector(".leaflet-map-stage");

  const mapButton = document.getElementById("hm-view-map");
  const satelliteButton = document.getElementById("hm-view-satellite");
  const googleToolsNode = document.getElementById("hm-google-tools");
  const heatToggleButton = document.getElementById("hm-toggle-heat");
  const gradientButton = document.getElementById("hm-gradient");
  const radiusButton = document.getElementById("hm-radius");
  const opacityButton = document.getElementById("hm-opacity");

  if (!mapNode) {
    return;
  }

  function setNodeText(node, text) {
    if (node) {
      node.textContent = text;
    }
  }

  function setMeta(text) {
    setNodeText(metaNode, text);
  }

  function setStatus(text) {
    setNodeText(layerStatusNode, text);
  }

  function renderZoneChips(zoneSummary, focusLocations, onZoneSelect, activeZoneName) {
    if (!zoneChipsNode) {
      return;
    }

    zoneChipsNode.innerHTML = "";

    const fromSummary = Array.isArray(zoneSummary) ? zoneSummary : [];
    const fromNames =
      Array.isArray(focusLocations) && focusLocations.length
        ? focusLocations.map(function (name) {
            return { name: name, count: null };
          })
        : [];
    const source = fromSummary.length ? fromSummary : fromNames;

    if (!source.length) {
      return;
    }

    const maxCount = source.reduce(function (maxValue, zone) {
      return Number.isFinite(zone.count) && zone.count > maxValue ? zone.count : maxValue;
    }, 0);

    source.forEach(function (zone) {
      if (!zone || !zone.name) {
        return;
      }

      const count = Number.isFinite(zone.count) ? zone.count : null;
      if (count === 0) {
        return;
      }
      const chip = document.createElement(onZoneSelect ? "button" : "span");
      chip.className = "leaflet-zone-chip";
      if (onZoneSelect) {
        chip.type = "button";
      }

      if (count !== null && count > 0) {
        chip.classList.add("has-data");
      }
      if (count !== null && maxCount > 0 && count >= maxCount * 0.72) {
        chip.classList.add("is-hot");
      }
      if (activeZoneName && zone.name === activeZoneName) {
        chip.classList.add("is-active");
      }

      chip.textContent = count !== null ? zone.name + " (" + count + ")" : zone.name;
      if (onZoneSelect) {
        chip.title = "Zoom to " + zone.name;
        chip.onclick = function () {
          onZoneSelect(zone);
        };
      }
      zoneChipsNode.appendChild(chip);
    });
  }

  function fail(message) {
    mapNode.innerHTML = '<div class="leaflet-heatmap-empty">' + message + "</div>";
    setStatus("Map unavailable");
    setNodeText(modeNode, "Unavailable");
  }

  function finiteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function kmFromLatDelta(delta) {
    return Math.abs(delta) * 111.32;
  }

  function kmFromLonDelta(delta, lat) {
    return Math.abs(delta) * 111.32 * Math.cos((lat * Math.PI) / 180);
  }

  function updateSpan(bounds) {
    if (!bounds) {
      setNodeText(spanNode, "Mumbai region");
      return;
    }

    const south = bounds.getSouth ? bounds.getSouth() : boundsData && boundsData.south;
    const north = bounds.getNorth ? bounds.getNorth() : boundsData && boundsData.north;
    const west = bounds.getWest ? bounds.getWest() : boundsData && boundsData.west;
    const east = bounds.getEast ? bounds.getEast() : boundsData && boundsData.east;

    if (
      !Number.isFinite(south) ||
      !Number.isFinite(north) ||
      !Number.isFinite(west) ||
      !Number.isFinite(east)
    ) {
      setNodeText(spanNode, "Mumbai region");
      return;
    }

    const midLat = (south + north) / 2;
    const latSpan = kmFromLatDelta(north - south);
    const lonSpan = kmFromLonDelta(east - west, midLat);
    setNodeText(spanNode, latSpan.toFixed(1) + " x " + lonSpan.toFixed(1) + " km");
  }

  function updateTopStats(count, countLabel) {
    setNodeText(countLabelNode, countLabel);
    setNodeText(countNode, count.toLocaleString());
    setNodeText(yearNode, metadata.selectedYear ? String(metadata.selectedYear) : "All");
    setNodeText(zonesLabelNode, "Selected Year");
  }

  function setLegendMode(mode) {
    if (mode === "real_geometry") {
      setNodeText(legendLeftNode, "Mangrove");
      setNodeText(legendRightNode, "Extent");
      return;
    }

    if (mode === "ndvi_heatmap") {
      setNodeText(legendLeftNode, "Low loss");
      setNodeText(legendRightNode, "High loss");
      return;
    }

    if (mode === "focus_density_heatmap") {
      setNodeText(legendLeftNode, "Low density");
      setNodeText(legendRightNode, "High density");
      return;
    }

    setNodeText(legendLeftNode, "Low intensity");
    setNodeText(legendRightNode, "High intensity");
  }

  function setHeatControlsVisible(isVisible) {
    if (googleToolsNode) {
      googleToolsNode.hidden = !isVisible;
    }
  }

  function setHeatButtonState(button, label, isActive, isEnabled) {
    if (!button) {
      return;
    }

    button.textContent = label;
    button.disabled = !isEnabled;
    button.classList.toggle("is-active", Boolean(isActive && isEnabled));
  }

  function syncHeatControlLabels(state) {
    const gradients = getHeatGradientPresets(state.mode);
    const radii = getHeatRadiusPresets(state.mode);
    const opacities = getHeatOpacityPresets();

    const activeGradient = gradients[state.gradientIndex] || gradients[0];
    const activeRadius = radii[state.radiusIndex] || radii[0];
    const activeOpacity = opacities[state.opacityIndex] || opacities[0];
    const isEnabled = Boolean(state.available);

    setHeatButtonState(
      heatToggleButton,
      state.visible ? "Heatmap On" : "Heatmap Off",
      state.visible,
      isEnabled
    );
    setHeatButtonState(
      gradientButton,
      "Gradient " + activeGradient.name,
      state.visible,
      isEnabled
    );
    setHeatButtonState(
      radiusButton,
      "Radius " + activeRadius.name,
      state.visible,
      isEnabled
    );
    setHeatButtonState(
      opacityButton,
      "Opacity " + activeOpacity.name,
      state.visible,
      isEnabled
    );

    if (isEnabled) {
      setLegendGradient(activeGradient.gradient);
    }
  }

  function clearExistingMap() {
    if (window.__MUMBAI_LEAFLET_MAP__) {
      try {
        window.__MUMBAI_LEAFLET_MAP__.remove();
      } catch (error) {
        // Ignore stale cleanup errors.
      }
      window.__MUMBAI_LEAFLET_MAP__ = null;
    }

    if (mapNode._leaflet_id) {
      mapNode._leaflet_id = null;
    }

    mapNode.innerHTML = "";
  }

  function setActiveView(viewName) {
    if (mapButton) {
      mapButton.classList.toggle("is-active", viewName === "Map");
    }
    if (satelliteButton) {
      satelliteButton.classList.toggle("is-active", viewName === "Satellite");
    }
    if (mapStageNode) {
      mapStageNode.classList.toggle("is-satellite", viewName === "Satellite");
    }
    setNodeText(modeNode, viewName);
  }

  function normalizeFeatureCollection(rawData) {
    let features = [];
    if (rawData && rawData.type === "FeatureCollection" && Array.isArray(rawData.features)) {
      features = rawData.features;
    } else if (rawData && rawData.type === "Feature") {
      features = [rawData];
    } else if (Array.isArray(rawData)) {
      features = rawData;
    }

    return {
      type: "FeatureCollection",
      features: features.filter(function (feature) {
        return feature && feature.geometry;
      })
    };
  }

  function normalizePoints(rawData) {
    if (!Array.isArray(rawData)) {
      return [];
    }

    const valid = rawData.filter(function (point) {
      return (
        point &&
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        Number.isFinite(point.weight)
      );
    });

    if (!valid.length) {
      return [];
    }

    const maxWeight = valid.reduce(function (maxValue, point) {
      return point.weight > maxValue ? point.weight : maxValue;
    }, 0.01);

    return valid.map(function (point) {
      const normalized = point.weight / maxWeight;
      return {
        lat: point.lat,
        lng: point.lng,
        weight: Math.min(Math.max(normalized, 0.12), 1),
        ndvi: Number.isFinite(point.ndvi) ? point.ndvi : point.weight,
        zone: point.zone || "Mangrove zone"
      };
    });
  }

  function normalizeZoneSummary(rawData) {
    if (!Array.isArray(rawData)) {
      return [];
    }

    return rawData
      .filter(function (zone) {
        return zone && zone.name;
      })
      .map(function (zone) {
        return {
          name: String(zone.name),
          count: Number.isFinite(zone.count) ? zone.count : 0,
          avgNdvi: Number.isFinite(zone.avg_ndvi) ? zone.avg_ndvi : null,
          centerLat: Number.isFinite(zone.center_lat) ? zone.center_lat : null,
          centerLng: Number.isFinite(zone.center_lng) ? zone.center_lng : null,
          south: Number.isFinite(zone.south) ? zone.south : null,
          west: Number.isFinite(zone.west) ? zone.west : null,
          north: Number.isFinite(zone.north) ? zone.north : null,
          east: Number.isFinite(zone.east) ? zone.east : null
        };
      });
  }

  function getPointColor(weight) {
    if (weight >= 0.82) {
      return "#0b5d44";
    }
    if (weight >= 0.62) {
      return "#1f875e";
    }
    if (weight >= 0.42) {
      return "#35a96f";
    }
    if (weight >= 0.24) {
      return "#63c889";
    }
    return "#94df9f";
  }

  function getLossGradient() {
    return {
      0.12: "#0f9d58",
      0.35: "#8bc34a",
      0.58: "#f4c542",
      0.78: "#f08c2e",
      1.0: "#d63b31"
    };
  }

  function getDensityGradient() {
    return {
      0.12: "#00c853",
      0.34: "#9be15d",
      0.56: "#ffe66d",
      0.78: "#ff8a3d",
      1.0: "#ff1744"
    };
  }

  function getFocusDensityGradientPresets() {
    return [
      {
        name: "Google",
        gradient: getDensityGradient()
      },
      {
        name: "Hotspot",
        gradient: {
          0.1: "#fff4bf",
          0.32: "#ffd27d",
          0.55: "#ff9f43",
          0.76: "#ef5f2f",
          1.0: "#b91622"
        }
      },
      {
        name: "Mangrove",
        gradient: {
          0.12: "#dff6c7",
          0.34: "#8fd06d",
          0.56: "#28a26c",
          0.78: "#f4a43b",
          1.0: "#d83f2b"
        }
      }
    ];
  }

  function getHeatGradientPresets(mode) {
    if (mode === "focus_density_heatmap") {
      return getFocusDensityGradientPresets();
    }

    return [
      {
        name: "Loss",
        gradient: getLossGradient()
      },
      {
        name: "Google",
        gradient: getDensityGradient()
      },
      {
        name: "Contrast",
        gradient: {
          0.1: "#113b7a",
          0.38: "#3ca4d8",
          0.62: "#f9e06a",
          0.82: "#f08c2e",
          1.0: "#d63b31"
        }
      }
    ];
  }

  function getHeatRadiusPresets(mode) {
    if (mode === "focus_density_heatmap") {
      return [
        { name: "Narrow", radius: 18, blur: 16 },
        { name: "Balanced", radius: 24, blur: 22 },
        { name: "Wide", radius: 30, blur: 28 }
      ];
    }

    return [
      { name: "Fine", radius: 14, blur: 12 },
      { name: "Balanced", radius: 18, blur: 16 },
      { name: "Wide", radius: 24, blur: 20 }
    ];
  }

  function getHeatOpacityPresets() {
    return [
      { name: "Soft", minOpacity: 0.24 },
      { name: "Balanced", minOpacity: 0.4 },
      { name: "Bold", minOpacity: 0.56 }
    ];
  }

  function gradientToCss(gradient) {
    if (!gradient) {
      return "";
    }

    return (
      "linear-gradient(90deg, " +
      Object.keys(gradient)
        .map(function (stop) {
          return { stop: Number(stop), color: gradient[stop] };
        })
        .sort(function (left, right) {
          return left.stop - right.stop;
        })
        .map(function (entry) {
          return entry.color + " " + Math.round(entry.stop * 100) + "%";
        })
        .join(", ") +
      ")"
    );
  }

  function setLegendGradient(gradient) {
    if (legendGradientNode) {
      legendGradientNode.style.background = gradientToCss(gradient);
    }
  }

  function getBaseLayers() {
    return {
      Map: [
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd",
          maxZoom: 20,
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
        })
      ],
      Satellite: [
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 19,
            attribution: "Tiles &copy; Esri"
          }
        ),
        L.tileLayer(
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 19,
            attribution: "Labels &copy; Esri"
          }
        )
      ]
    };
  }

  function getBoundsFromPayload() {
    if (
      boundsData &&
      Number.isFinite(boundsData.south) &&
      Number.isFinite(boundsData.west) &&
      Number.isFinite(boundsData.north) &&
      Number.isFinite(boundsData.east)
    ) {
      return L.latLngBounds(
        [boundsData.south, boundsData.west],
        [boundsData.north, boundsData.east]
      );
    }

    return null;
  }

  function defaultCenterView(map) {
    map.setView(
      [finiteNumber(center.lat, 19.0677), finiteNumber(center.lng, 72.9177)],
      11
    );
  }

  function buildTooltipHtml(properties, defaultTitle) {
    const props = properties || {};
    const lines = ["<strong>" + defaultTitle + "</strong>"];

    if (props.year !== undefined) {
      lines.push("Year: " + props.year);
    }
    if (props.name) {
      lines.push("Name: " + props.name);
    }
    if (props.area_sq_km !== undefined) {
      lines.push("Area: " + Number(props.area_sq_km).toFixed(3) + " sq km");
    }
    if (props.mangrove_area_sq_km !== undefined) {
      lines.push("Area: " + Number(props.mangrove_area_sq_km).toFixed(3) + " sq km");
    }
    if (props.zone) {
      lines.push("Zone: " + props.zone);
    }
    if (props.sample_count !== undefined) {
      lines.push("Dense samples: " + props.sample_count);
    }
    if (props.avg_ndvi !== undefined && props.avg_ndvi !== null) {
      lines.push("Avg NDVI: " + Number(props.avg_ndvi).toFixed(3));
    }

    return lines.join("<br>");
  }

  function addMangroveGeometry(map, featureCollection) {
    return L.geoJSON(featureCollection, {
      style: function () {
        return {
          color: "#0c6548",
          weight: 1.2,
          opacity: 0.98,
          fillColor: "#27a36b",
          fillOpacity: 0.48
        };
      },
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 5.5,
          color: "#ffffff",
          weight: 1.2,
          fillColor: "#1f875e",
          fillOpacity: 0.92,
          opacity: 0.92
        });
      },
      onEachFeature: function (feature, layer) {
        layer.bindTooltip(
          buildTooltipHtml(feature.properties, "Mangrove feature"),
          {
            direction: "top",
            offset: [0, -2],
            opacity: 0.96
          }
        );
      }
    }).addTo(map);
  }

  function addMangrovePoints(map, points) {
    return L.layerGroup(
      points.map(function (point) {
        const radius = 2.2 + point.weight * 2.8;
        const color = getPointColor(point.weight);
        return L.circleMarker([point.lat, point.lng], {
          radius: radius,
          color: "#ffffff",
          weight: 0.8,
          fillColor: color,
          fillOpacity: 0.82,
          opacity: 0.88
        }).bindTooltip(
          "<strong>" +
            point.zone +
            "</strong><br>NDVI: " +
            point.ndvi.toFixed(3),
          {
            direction: "top",
            offset: [0, -2],
            opacity: 0.96
          }
        );
      })
    ).addTo(map);
  }

  function addNdviLossHeat(map, points, mode, styleState) {
    if (typeof L.heatLayer !== "function") {
      return addMangrovePoints(map, points);
    }

    const heatData = points.map(function (point) {
      return [point.lat, point.lng, point.weight];
    });
    const gradients = getHeatGradientPresets(mode);
    const radii = getHeatRadiusPresets(mode);
    const opacities = getHeatOpacityPresets();
    const activeGradient =
      gradients[(styleState && styleState.gradientIndex) || 0] || gradients[0];
    const activeRadius =
      radii[(styleState && styleState.radiusIndex) || 0] || radii[0];
    const activeOpacity =
      opacities[(styleState && styleState.opacityIndex) || 0] || opacities[0];

    return L.heatLayer(heatData, {
      radius: activeRadius.radius,
      blur: activeRadius.blur,
      maxZoom: 17,
      minOpacity: activeOpacity.minOpacity,
      gradient: activeGradient.gradient
    }).addTo(map);
  }

  function addZoneHotspotMarkers(map, zoneSummary) {
    if (!Array.isArray(zoneSummary) || !zoneSummary.length) {
      return null;
    }

    const maxCount = zoneSummary.reduce(function (maxValue, zone) {
      return zone.count > maxValue ? zone.count : maxValue;
    }, 0);

    return L.layerGroup(
      zoneSummary
        .filter(function (zone) {
          return Number.isFinite(zone.centerLat) && Number.isFinite(zone.centerLng);
        })
        .map(function (zone) {
          const share = maxCount > 0 ? zone.count / maxCount : 0;
          const radius = 5 + share * 8;
          const tone = share >= 0.72 ? "#b91622" : share >= 0.45 ? "#ef5f2f" : "#ff9f43";
          return L.circleMarker([zone.centerLat, zone.centerLng], {
            radius: radius,
            color: "#ffffff",
            weight: 1.6,
            fillColor: tone,
            fillOpacity: 0.66,
            opacity: 0.96
          }).bindTooltip(
            "<strong>" +
              zone.name +
              "</strong><br>Dense NDVI points: " +
              zone.count +
              (zone.avgNdvi !== null ? "<br>Avg NDVI: " + zone.avgNdvi.toFixed(3) : ""),
            {
              direction: "top",
              offset: [0, -2],
              opacity: 0.96
            }
          );
        })
    ).addTo(map);
  }

  function toggleBaseLayer(map, baseLayers, nextBase, activeBase) {
    if (!baseLayers[nextBase]) {
      return activeBase;
    }

    if (baseLayers[activeBase]) {
      baseLayers[activeBase].forEach(function (layer) {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
    }

    baseLayers[nextBase].forEach(function (layer) {
      layer.addTo(map);
    });

    setActiveView(nextBase);
    return nextBase;
  }

  function renderMap() {
    const featureCollection = normalizeFeatureCollection(rawFeatureCollection);
    const validPoints = normalizePoints(rawPoints);
    const zoneSummary = normalizeZoneSummary(metadata.zoneSummary);
    const focusLocations = Array.isArray(metadata.focusLocations) ? metadata.focusLocations : [];
    const hasGeometry = featureCollection.features.length > 0;
    const dataMode = metadata.dataMode || (hasGeometry ? "real_geometry" : "ndvi_heatmap");
    const heatMode = dataMode === "ndvi_heatmap" || dataMode === "focus_density_heatmap";
    const heatControlState = {
      available: heatMode && validPoints.length > 0 && typeof L.heatLayer === "function",
      gradientIndex: 0,
      layer: null,
      map: null,
      mode: dataMode,
      opacityIndex: 1,
      points: validPoints,
      radiusIndex: 1,
      visible: true
    };

    renderZoneChips(zoneSummary, focusLocations);
    setHeatControlsVisible(heatControlState.available);
    syncHeatControlLabels(heatControlState);

    if (!hasGeometry && !validPoints.length) {
      fail("No mangrove geometry or preview points are available for this map.");
      return;
    }

    setStatus("Preparing layers");
    clearExistingMap();

    const map = L.map("leaflet-ndvi-heatmap", {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
      scrollWheelZoom: true,
      zoomSnap: 0.25
    });
    window.__MUMBAI_LEAFLET_MAP__ = map;
    heatControlState.map = map;
    map.zoomControl.setPosition("topright");

    const baseLayers = getBaseLayers();
    let activeBase = "Map";
    let activeZoneName = null;
    activeBase = toggleBaseLayer(map, baseLayers, activeBase, null);
    defaultCenterView(map);

    const payloadBounds = getBoundsFromPayload();
    let geometryLayer = null;
    let pointFallbackLayer = null;
    if (hasGeometry) {
      geometryLayer = addMangroveGeometry(map, featureCollection);
    } else if (!heatMode || !heatControlState.available) {
      pointFallbackLayer = addMangrovePoints(map, validPoints);
    }

    const showPointFallback = function () {
      if (hasGeometry) {
        return;
      }
      if (!pointFallbackLayer) {
        pointFallbackLayer = addMangrovePoints(map, validPoints);
      } else if (!map.hasLayer(pointFallbackLayer)) {
        pointFallbackLayer.addTo(map);
      }
      if (pointFallbackLayer.bringToFront) {
        pointFallbackLayer.bringToFront();
      }
    };

    const hidePointFallback = function () {
      if (pointFallbackLayer && map.hasLayer(pointFallbackLayer)) {
        map.removeLayer(pointFallbackLayer);
      }
    };

    const refreshHeatLayer = function () {
      syncHeatControlLabels(heatControlState);

      if (!heatControlState.available) {
        showPointFallback();
        return true;
      }

      if (heatControlState.layer && map.hasLayer(heatControlState.layer)) {
        map.removeLayer(heatControlState.layer);
      }
      heatControlState.layer = null;

      if (!heatControlState.visible) {
        showPointFallback();
        setStatus(hasGeometry ? "Heatmap hidden" : "Sample dots active");
        return true;
      }

      hidePointFallback();

      try {
        heatControlState.layer = addNdviLossHeat(
          map,
          heatControlState.points,
          heatControlState.mode,
          heatControlState
        );
        if (heatControlState.layer && heatControlState.layer.bringToFront) {
          heatControlState.layer.bringToFront();
        }
        setStatus("Heatmap active");
        return true;
      } catch (error) {
        heatControlState.available = false;
        heatControlState.visible = false;
        setHeatControlsVisible(false);
        syncHeatControlLabels(heatControlState);

        showPointFallback();

        setMeta(
          "Heat layer could not initialize cleanly, so point fallback is shown from " +
            (metadata.sourceName || "Mumbai_NDVI_CSV.csv") +
            "."
        );
        setStatus("Point fallback");
        return true;
      }
    };

    const initialLayerBounds =
      (geometryLayer && geometryLayer.getBounds ? geometryLayer.getBounds() : null) ||
      (pointFallbackLayer && pointFallbackLayer.getBounds ? pointFallbackLayer.getBounds() : null);
    const finalBounds = payloadBounds || (initialLayerBounds && initialLayerBounds.isValid && initialLayerBounds.isValid() ? initialLayerBounds : null);

    const zoomToZone = function (zone) {
      if (!zone) {
        return;
      }

      activeZoneName = zone.name || null;
      renderZoneChips(zoneSummary, focusLocations, zoomToZone, activeZoneName);

      const hasBounds =
        Number.isFinite(zone.south) &&
        Number.isFinite(zone.west) &&
        Number.isFinite(zone.north) &&
        Number.isFinite(zone.east);

      if (hasBounds) {
        const zoneBounds = L.latLngBounds(
          [zone.south, zone.west],
          [zone.north, zone.east]
        );
        map.fitBounds(zoneBounds.pad(0.18));
        updateSpan(zoneBounds);
      } else if (Number.isFinite(zone.centerLat) && Number.isFinite(zone.centerLng)) {
        map.setView([zone.centerLat, zone.centerLng], Math.max(map.getZoom(), 14), {
          animate: true
        });
      }

      setStatus((zone.name || "Selected zone") + " focused");
    };

    renderZoneChips(zoneSummary, focusLocations, zoomToZone, activeZoneName);

    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    map.invalidateSize(true);
    setTimeout(function () {
      map.invalidateSize(true);
    }, 80);
    setTimeout(function () {
      map.invalidateSize(true);
    }, 240);

    if (dataMode === "focus_density_heatmap") {
      const rankedZones = zoneSummary
        .filter(function (zone) {
          return zone.count > 0;
        })
        .sort(function (left, right) {
          return right.count - left.count;
        });

      updateTopStats(validPoints.length, "Dense Samples");
      setNodeText(zonesLabelNode, "Focused Zones");
      setNodeText(yearNode, String(rankedZones.length || focusLocations.length || zoneSummary.length || 8));
      setLegendMode("focus_density_heatmap");
      setMeta("");
      setStatus("Preparing heatmap");
    } else if (hasGeometry) {
      updateTopStats(featureCollection.features.length, "Mapped Features");
      setLegendMode("real_geometry");
      setMeta(
        "Showing real mangrove geometry for " +
          (metadata.selectedYear || "the selected year") +
          " from " +
          (metadata.sourceName || "local geometry file") +
          "."
      );
      setStatus("Real geometry active");
    } else if (dataMode === "ndvi_heatmap") {
      updateTopStats(validPoints.length, "NDVI Samples");
      setLegendMode("ndvi_heatmap");
      setMeta(
        "Using all coordinates from " +
          (metadata.sourceName || "Mumbai_NDVI_CSV.csv") +
          " as a mangrove loss heatmap. Red means lower NDVI and likely higher vegetation loss."
      );
      setStatus("Loss heat active");
    } else {
      updateTopStats(validPoints.length, "Preview Points");
      setLegendMode("approximate_points");
      setMeta(
        "Showing approximate coastal preview points from " +
          (metadata.sourceName || "NDVI samples") +
          "."
      );
      setStatus("Approximate preview");
    }

    const tryAttachHeatLayer = function () {
      if (!heatMode || !heatControlState.available) {
        return true;
      }

      const rect = mapNode.getBoundingClientRect();
      if (rect.width <= 120 || rect.height <= 120) {
        return false;
      }

      if (heatControlState.layer || !heatControlState.visible) {
        return true;
      }

      return refreshHeatLayer();
    };

    const finalizeLayoutWhenReady = function (attempt) {
      const size = map.getSize ? map.getSize() : { x: 0, y: 0 };
      if (size.x > 120 && size.y > 120) {
        tryAttachHeatLayer();

        if (finalBounds) {
          map.fitBounds(finalBounds.pad(hasGeometry ? 0.04 : 0.09));
          updateSpan(finalBounds);
        } else {
          defaultCenterView(map);
          updateSpan(null);
        }

        if (!heatMode) {
          setStatus("Map ready");
        } else if (!heatControlState.available) {
          setStatus("Point fallback");
        } else if (!heatControlState.visible) {
          setStatus("Heatmap hidden");
        } else {
          setStatus("Heatmap active");
        }
        return;
      }

      if (attempt > 60) {
        tryAttachHeatLayer();
        if (finalBounds) {
          updateSpan(finalBounds);
        } else {
          updateSpan(null);
        }
        if (!heatMode) {
          setStatus("Map ready");
        } else if (!heatControlState.available) {
          setStatus("Point fallback");
        } else if (!heatControlState.visible) {
          setStatus("Heatmap hidden");
        } else {
          setStatus("Heatmap active");
        }
        return;
      }

      setTimeout(function () {
        map.invalidateSize(true);
        finalizeLayoutWhenReady(attempt + 1);
      }, 80);
    };

    if (mapButton) {
      mapButton.onclick = function () {
        if (activeBase === "Map") {
          return;
        }
        activeBase = toggleBaseLayer(map, baseLayers, "Map", activeBase);
      };
    }

    if (satelliteButton) {
      satelliteButton.onclick = function () {
        if (activeBase === "Satellite") {
          return;
        }
        activeBase = toggleBaseLayer(map, baseLayers, "Satellite", activeBase);
      };
    }

    if (heatToggleButton) {
      heatToggleButton.onclick = function () {
        if (!heatControlState.available) {
          return;
        }

        heatControlState.visible = !heatControlState.visible;
        refreshHeatLayer();
      };
    }

    if (gradientButton) {
      gradientButton.onclick = function () {
        const gradients = getHeatGradientPresets(heatControlState.mode);
        if (!heatControlState.available || !gradients.length) {
          return;
        }

        heatControlState.gradientIndex =
          (heatControlState.gradientIndex + 1) % gradients.length;
        refreshHeatLayer();
      };
    }

    if (radiusButton) {
      radiusButton.onclick = function () {
        const radii = getHeatRadiusPresets(heatControlState.mode);
        if (!heatControlState.available || !radii.length) {
          return;
        }

        heatControlState.radiusIndex = (heatControlState.radiusIndex + 1) % radii.length;
        refreshHeatLayer();
      };
    }

    if (opacityButton) {
      opacityButton.onclick = function () {
        const opacities = getHeatOpacityPresets();
        if (!heatControlState.available || !opacities.length) {
          return;
        }

        heatControlState.opacityIndex =
          (heatControlState.opacityIndex + 1) % opacities.length;
        refreshHeatLayer();
      };
    }

    if (heatMode && typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(function () {
        if (tryAttachHeatLayer()) {
          resizeObserver.disconnect();
        }
      });
      resizeObserver.observe(mapNode);
    }

    setTimeout(function () {
      tryAttachHeatLayer();
    }, 500);

    finalizeLayoutWhenReady(0);
  }

  function waitForLeafletAndContainer(attempt) {
    if (window.L) {
      renderMap();
      return;
    }

    if (attempt > 130) {
      if (!window.L) {
        fail("Leaflet library could not be loaded. Check internet access for CDN resources.");
      }
      return;
    }

    setTimeout(function () {
      waitForLeafletAndContainer(attempt + 1);
    }, 80);
  }

  try {
    waitForLeafletAndContainer(0);
  } catch (error) {
    fail("Leaflet mangrove map error: " + (error && error.message ? error.message : "unknown"));
  }
})();
