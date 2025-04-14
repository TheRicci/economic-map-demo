// MapLibreMap.tsx
import React, { useEffect, useRef,useState } from "react";
import maplibregl from "maplibre-gl";
import { CircularProgress, Box, Typography } from "@mui/material";

const MapLibreMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const geojsonURL = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    const [geoRes, marketRes, capitalsRes] = await Promise.all([
      fetch(geojsonURL), 
      fetch("/api/market-indices"),
      fetch("/data/coordinates.geojson")
    ]);

    const geoData = await geoRes.json();
    const marketData = await marketRes.json();
    const capitals = await capitalsRes.json();
    console.log(marketData)
    console.log(geoData)

    const updatedGeo = { // data and coordinates to color the map
      ...geoData,
      features: geoData.features.map((feature: any) => {
        const countryName = feature.properties.name;
        const market = marketData[countryName];
        //console.log(market)
        return {
          ...feature,
          properties: {
            ...feature.properties,
            indexName: market?.index || undefined,
            gain: market?.gain || undefined
          }
        };
      })
    };

    const enhancedCapitals = { //coordinates for the labels
      ...capitals,
      features: capitals.features.map((feature: any) => {
        const countryName = feature.properties.country;
        const market = marketData[countryName];
  
        return {
          ...feature,
          properties: {
            ...feature.properties,
            indexName: market?.index || undefined,
            gainStr: market ? `${market.gain > 0 ? '+' : ''}${market.gain.toFixed(3)}` : undefined,
            gain: market?.gain || undefined ,
            state: market? (market.open? "OPEN" : "CLOSED") : undefined
          }
        };
      })
    };

    console.log(updatedGeo)
    return [updatedGeo,enhancedCapitals]
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: `https://api.maptiler.com/maps/satellite/style.json?key=XTXaQTloYrUHwGUgkpw9 `, 
      center: [0, 20],
      zoom: 2
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // Load GeoJSON layer
    map.on("load", async () => {
      const [geo,enhancedCoordinates] = await loadData();

      map.addSource("coordinates-labels", {
        type: "geojson",
        data: enhancedCoordinates 
      });

      map.addSource("countries", {
        type: "geojson",
        data: geo
      });
      
      map.addLayer({
        id: "country-borders",
        type: "line",
        source: "countries",
        paint: {
          "line-color": "#00ffff",
          "line-width": 1
        }
      });

      // Hover effect
      map.addLayer({
        id: "country-hover",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": "#ffa500",
          "fill-opacity": 0.6
        },
        filter: ["==", "name", ""]
      });

      map.addLayer({
        id: "country-fills",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": [
            "case",
            //["==", ["get", "gain"], ""], "#aaaaaa", // No data: gray
            ["<", ["get", "gain"], 0], "#cc3333",    // Negative: red
            [">", ["get", "gain"], 0], "#33cc66",    // Positive: green
            "#b4b4b4"                                // Default fallback #b4b4b4 #474747
          ],
          "fill-opacity": 0.5
        }
      });

      map.addLayer({
        id: "index-labels",
        type: "symbol",
        source: "coordinates-labels",
        layout: {
          "text-field": [
            "format",
            ["get", "indexName"], { "font-scale": 1.2 },    
          ],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-anchor": "center",
          "text-allow-overlap": true
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
          //"text-opacity": 1
        }
      });

      map.addLayer({
        id: "gain-labels",
        type: "symbol",
        source: "coordinates-labels",
        layout: {
          "text-field": [
            "format",
            ["get", "gainStr"], { "font-scale": 1.4 },
          ],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 11,
          "text-offset": [0, 1.3],
          "text-allow-overlap": true,
          "text-anchor": "center"
        },
        paint: {
          "text-color":  [
            "case",
            [">", ["get", "gain"], 0], "#33cc66",
            ["<", ["get", "gain"], 0], "#cc3333",   
            "#000000"                                // Default fallback
          ],
          "text-halo-color": "#000000",
          "text-halo-width": 1,
          //"text-opacity": 1
        }
      });

      map.addLayer({
        id: "state-labels",
        type: "symbol",
        source: "coordinates-labels",
        layout: {
          "text-field": [
            "format",
            ["get", "state"], { "font-scale": 1 },
          ],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-offset": [0, 2.4],
          "text-allow-overlap": true,
          "text-anchor": "center"
        },
        paint: {
          "text-color":  [
            "case",
            ["==", ["get", "state"], "OPEN"], "#0061f1",  
            ["==", ["get", "state"], "CLOSED"], "#aaaaaa",   
            "#000000"                                // Default fallback
          ],
          "text-halo-color": "#000000",
          "text-halo-width": 1,
          //"text-opacity": 1
        }
      });

      let hoveredCountry: string | null = null;

      map.on("mousemove", "country-fills", (e) => {
        if (e.features?.length) {
          const name = e.features[0].properties?.name;
          hoveredCountry = name;
          map.setFilter("country-hover", ["==", "name", name]);

          map.getCanvas().style.cursor = "pointer";
        }
      });

      map.on("mouseleave", "country-fills", () => {
        hoveredCountry = null;
        map.setFilter("country-hover", ["==", "name", ""]);
        map.getCanvas().style.cursor = "";
      });

      setLoading(false);

      setInterval(async () => {
        if (loading) {return}
        const [geo,enhancedCoordinates] = await loadData();
        const source1 = map.getSource("countries") as maplibregl.GeoJSONSource;
        const source2 = map.getSource("coordinates-labels") as maplibregl.GeoJSONSource;
        console.log(enhancedCoordinates)
        if (source1 && source2) {
          source1.setData(geo);
          source2.setData(enhancedCoordinates);
        }
      }, 30000);
    });

    return () => map.remove();
  }, []);

  return (
    <>
      {updating && !loading &&(
        <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100vh",
          zIndex: 10,
          display: "collumn",
          flexDirection: "column",
          alignItems: "bottom",
          justifyContent: "left",
          color: "#fff"
        }}
      >
        <CircularProgress color="inherit" />
        <Typography variant="h6" mt={2}>
          Updating...
        </Typography>
      </Box>
      )
      
      }

      <div ref={mapRef} style={{ width: "100%", height: "100vh" }} />
    </>
  )
};

export default MapLibreMap;
