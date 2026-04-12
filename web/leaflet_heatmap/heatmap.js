(function () {
  const points = window.__MUMBAI_HEATMAP_POINTS__ || [];
  const center = window.__MUMBAI_HEATMAP_CENTER__ || { lat: 19.0677, lng: 72.9177 };
  const boundsData = window.__MUMBAI_HEATMAP_BOUNDS__;

  const mapNode = document.getElementById("leaflet-ndvi-heatmap");
  const metaNode = document.getElementById("leaflet-heatmap-meta");
  const pointsNode = document.getElementById("hm-points");
  const spanNode = document.getElementById("hm-span");
  const modeNode = document.getElementById("hm-mode");
  const layerStatusNode = document.getElementById("hm-layer-status");

  const basemapSelect = document.getElementById("hm-basemap");
  const radiusInput = document.getElementById("hm-radius");
  const opacityInput = document.getElementById("hm-opacity");
  const radiusValueNode = document.getElementById("hm-radius-value");
  const opacityValueNode = document.getElementById("hm-opacity-value");

  if (!mapNode) {
    return;
  }

  function fail(message) {
    mapNode.innerHTML = '<div class="leaflet-heatmap-empty">' + message + "</div>";
    setStatus("Map unavailable");
    setNodeText(modeNode, "Unavailable");
  }

  function setMeta(text) {
    if (metaNode) {
      metaNode.textContent = text;
    }
  }

  function setStatus(text) {
    if (layerStatusNode) {
      layerStatusNode.textContent = text;
    }
  }

  function setNodeText(node, text) {
    if (node) {
      node.textContent = text;
    }
  }

  function isContainerReady() {
    const rect = mapNode.getBoundingClientRect();
    return rect.width > 120 && rect.height > 120;
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

  function updateTopStats(validPoints) {
    setNodeText(pointsNode, validPoints.length.toLocaleString());

    if (
      boundsData &&
      Number.isFinite(boundsData.south) &&
      Number.isFinite(boundsData.north) &&
      Number.isFinite(boundsData.west) &&
      Number.isFinite(boundsData.east)
    ) {
      const midLat = (boundsData.south + boundsData.north) / 2;
      const latSpan = kmFromLatDelta(boundsData.north - boundsData.south);
      const lonSpan = kmFromLonDelta(boundsData.east - boundsData.west, midLat);
      setNodeText(spanNode, latSpan.toFixed(1) + " x " + lonSpan.toFixed(1) + " km");
    } else {
      setNodeText(spanNode, "Mumbai region");
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

  function updateSliderLabels() {
    if (radiusInput) {
      setNodeText(radiusValueNode, String(radiusInput.value));
    }
    if (opacityInput) {
      setNodeText(opacityValueNode, String(opacityInput.value) + "%");
    }
  }

  function normalizePoints(rawPoints) {
    if (!Array.isArray(rawPoints)) {
      return [];
    }

    const valid = rawPoints.filter(function (p) {
      return p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.weight);
    });

    if (!valid.length) {
      return [];
    }

    const maxWeight = valid.reduce(function (mx, p) {
      return p.weight > mx ? p.weight : mx;
    }, 0.01);

    return valid.map(function (p) {
      const normalized = p.weight / maxWeight;
      return {
        lat: p.lat,
        lng: p.lng,
        weight: Math.min(Math.max(normalized, 0.04), 1)
      };
    });
  }

  function getThemeGradient() {
    return {
      0.08: "#dff4e8",
      0.28: "#8ed9ad",
      0.52: "#34b177",
      0.76: "#e29f39",
      1.0: "#c0392b"
    };
  }

  function getBaseLayers() {
    return {
      Light: L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 20,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
      }),
      Street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }),
      Satellite: L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "Tiles &copy; Esri"
        }
      )
    };
  }

  function applyBoundary(map) {
    if (
      !boundsData ||
      !Number.isFinite(boundsData.south) ||
      !Number.isFinite(boundsData.west) ||
      !Number.isFinite(boundsData.north) ||
      !Number.isFinite(boundsData.east)
    ) {
      return null;
    }

    const bounds = L.latLngBounds(
      [boundsData.south, boundsData.west],
      [boundsData.north, boundsData.east]
    );

    map.fitBounds(bounds.pad(0.03));

    return L.rectangle(bounds, {
      color: "#1f6c44",
      weight: 1,
      opacity: 0.9,
      fill: false,
      dashArray: "6 5"
    }).addTo(map);
  }

  function defaultCenterView(map) {
    map.setView(
      [finiteNumber(center.lat, 19.0677), finiteNumber(center.lng, 72.9177)],
      11
    );
  }

  function addCenterMarker(map) {
    L.circleMarker(
      [finiteNumber(center.lat, 19.0677), finiteNumber(center.lng, 72.9177)],
      {
        radius: 5,
        color: "#ffffff",
        fillColor: "#1b5e35",
        fillOpacity: 1,
        weight: 2
      }
    )
      .addTo(map)
      .bindTooltip("Mumbai coastal center", { direction: "top", offset: [0, -6] });
  }

  function addPointFallback(map, validPoints) {
    const markerSample = validPoints.slice(0, 800);
    markerSample.forEach(function (p) {
      L.circleMarker([p.lat, p.lng], {
        radius: 1.8,
        color: "#2ea86f",
        fillColor: "#2ea86f",
        fillOpacity: 0.3,
        weight: 0
      }).addTo(map);
    });
  }

  function renderMap() {
    const validPoints = normalizePoints(points);
    if (!validPoints.length) {
      fail("No NDVI points available for this heatmap.");
      return;
    }

    updateTopStats(validPoints);
    updateSliderLabels();
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
    map.zoomControl.setPosition("topright");

    const baseLayers = getBaseLayers();
    let activeBase = "Light";
    baseLayers[activeBase].addTo(map);
    if (basemapSelect) {
      basemapSelect.value = activeBase;
    }

    const boundary = applyBoundary(map);
    if (!boundary) {
      defaultCenterView(map);
    }

    addCenterMarker(map);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    map.invalidateSize(true);
    setTimeout(function () {
      map.invalidateSize(true);
    }, 80);
    setTimeout(function () {
      map.invalidateSize(true);
    }, 240);

    let heatLayer = null;

    const drawHeat = function () {
      if (typeof L.heatLayer !== "function") {
        addPointFallback(map, validPoints);
        setMeta(
          "Leaflet heat plugin unavailable, so point-density fallback is displayed for " +
            validPoints.length +
            " NDVI points."
        );
        setNodeText(modeNode, "Point Fallback");
        setStatus("Fallback mode");
        return;
      }

      try {
        const heatData = validPoints.map(function (p) {
          return [p.lat, p.lng, p.weight];
        });

        const radius = radiusInput ? Number(radiusInput.value) : 22;
        const opacity = opacityInput ? Number(opacityInput.value) / 100 : 0.78;

        if (heatLayer) {
          map.removeLayer(heatLayer);
        }

        heatLayer = L.heatLayer(heatData, {
          radius: radius,
          blur: Math.max(12, Math.round(radius * 0.8)),
          minOpacity: opacity,
          maxZoom: 14,
          gradient: getThemeGradient()
        }).addTo(map);

        setMeta(
          "Rendered " +
            validPoints.length +
            " NDVI points using Leaflet heat layer. Region fit is based on Mumbai dataset bounds."
        );
        setNodeText(modeNode, "Heat Layer");
        setStatus("Heat layer active");
      } catch (error) {
        addPointFallback(map, validPoints);
        setMeta(
          "Heat layer fallback active due to render timing (" +
            (error && error.message ? error.message : "unknown error") +
            "). Showing point-density map for " +
            validPoints.length +
            " NDVI points."
        );
        setNodeText(modeNode, "Point Fallback");
        setStatus("Fallback mode");
      }
    };

    const renderHeatWhenReady = function (attempt) {
      const size = map.getSize ? map.getSize() : { x: 0, y: 0 };
      if (size.x > 120 && size.y > 120) {
        drawHeat();
        return;
      }

      if (attempt > 40) {
        addPointFallback(map, validPoints);
        setMeta(
          "Heat layer delayed due layout timing; showing point-density map for " +
            validPoints.length +
            " NDVI points."
        );
        setNodeText(modeNode, "Point Fallback");
        setStatus("Delayed fallback");
        return;
      }

      setTimeout(function () {
        map.invalidateSize(true);
        renderHeatWhenReady(attempt + 1);
      }, 80);
    };

    if (basemapSelect) {
      basemapSelect.onchange = function () {
        const selected = basemapSelect.value;
        if (selected === activeBase || !baseLayers[selected]) {
          return;
        }
        map.removeLayer(baseLayers[activeBase]);
        baseLayers[selected].addTo(map);
        activeBase = selected;
      };
    }

    if (radiusInput) {
      radiusInput.oninput = function () {
        updateSliderLabels();
        drawHeat();
      };
    }

    if (opacityInput) {
      opacityInput.oninput = function () {
        updateSliderLabels();
        drawHeat();
      };
    }

    renderHeatWhenReady(0);
  }

  function waitForLeafletAndContainer(attempt) {
    if (window.L && isContainerReady()) {
      renderMap();
      return;
    }

    if (attempt > 130) {
      if (!window.L) {
        fail("Leaflet library could not be loaded. Check internet access for CDN resources.");
      } else {
        fail("Heatmap container did not receive layout size. Please switch tabs once and retry.");
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
    fail("Leaflet heatmap error: " + (error && error.message ? error.message : "unknown"));
  }
})();
