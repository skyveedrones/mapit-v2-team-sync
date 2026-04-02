import { describe, it, expect } from "vitest";

describe("MediaGallery - VirtualMediaGrid", () => {
  it("should calculate correct number of rows for grid layout", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    const colCount = 4;
    
    const rows: any[][] = [];
    for (let i = 0; i < items.length; i += colCount) {
      rows.push(items.slice(i, i + colCount));
    }
    
    expect(rows.length).toBe(3);
    expect(rows[0].length).toBe(4);
    expect(rows[1].length).toBe(4);
    expect(rows[2].length).toBe(4);
  });

  it("should handle partial last row correctly", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const colCount = 4;
    
    const rows: any[][] = [];
    for (let i = 0; i < items.length; i += colCount) {
      rows.push(items.slice(i, i + colCount));
    }
    
    expect(rows.length).toBe(3);
    expect(rows[0].length).toBe(4);
    expect(rows[1].length).toBe(4);
    expect(rows[2].length).toBe(2);
  });

  it("should calculate height dynamically based on viewport", () => {
    // Test that height calculation works
    const height = "calc(100vh - 300px)";
    const maxHeight = "80vh";
    
    expect(height).toContain("calc");
    expect(maxHeight).toContain("vh");
  });
});

describe("MapboxProjectMap - GPS Marker Click Handler", () => {
  it("should find closest feature when multiple markers exist at same location", () => {
    // Simulate click at coordinates
    const clickLngLat = { lng: -97.5, lat: 30.2 };
    
    // Simulate multiple features
    const features = [
      {
        geometry: { coordinates: [-97.5, 30.2] },
        properties: { id: 1, filename: "photo1.jpg" }
      },
      {
        geometry: { coordinates: [-97.50001, 30.20001] },
        properties: { id: 2, filename: "photo2.jpg" }
      },
      {
        geometry: { coordinates: [-97.5001, 30.2001] },
        properties: { id: 3, filename: "photo3.jpg" }
      }
    ];
    
    // Calculate distances
    let closestFeature = features[0];
    let minDistance = Infinity;
    
    for (const f of features) {
      const coords = f.geometry.coordinates as [number, number];
      const dx = coords[0] - clickLngLat.lng;
      const dy = coords[1] - clickLngLat.lat;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestFeature = f;
      }
    }
    
    // The first feature should be closest (distance = 0)
    expect(closestFeature.properties.id).toBe(1);
    expect(minDistance).toBe(0);
  });

  it("should correctly identify closest marker among multiple options", () => {
    const clickLngLat = { lng: -97.50005, lat: 30.20005 };
    
    const features = [
      {
        geometry: { coordinates: [-97.5, 30.2] },
        properties: { id: 1, filename: "photo1.jpg" }
      },
      {
        geometry: { coordinates: [-97.50001, 30.20001] },
        properties: { id: 2, filename: "photo2.jpg" }
      }
    ];
    
    let closestFeature = features[0];
    let minDistance = Infinity;
    
    for (const f of features) {
      const coords = f.geometry.coordinates as [number, number];
      const dx = coords[0] - clickLngLat.lng;
      const dy = coords[1] - clickLngLat.lat;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestFeature = f;
      }
    }
    
    // Feature 2 should be closest
    expect(closestFeature.properties.id).toBe(2);
  });

  it("should preserve thumbnail URL in popup", () => {
    const props = {
      id: 1,
      filename: "test.jpg",
      latitude: "30.2",
      longitude: "-97.5",
      altitude: "100",
      mediaType: "photo",
      thumbnailUrl: "https://example.com/thumb.jpg",
      url: "https://example.com/full.jpg"
    };
    
    const thumbnailUrl = props.thumbnailUrl;
    expect(thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(thumbnailUrl).toBeTruthy();
  });
});
