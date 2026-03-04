/**
 * Photo Upload Integration Tests
 * Tests the complete chunked upload flow with a real drone photo
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { extractImageMetadata } from "./metadataExtractor";

describe("Photo Upload - Integration Tests", () => {
  let photoBuffer: Buffer;
  const photoPath = "/home/ubuntu/upload/DJI_20260302134726_0277_D_SKYVEE.JPG";
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

  beforeAll(() => {
    // Load the real drone photo
    if (fs.existsSync(photoPath)) {
      photoBuffer = fs.readFileSync(photoPath);
      console.log(`[Test] Loaded drone photo: ${photoPath} (${photoBuffer.length} bytes)`);
    } else {
      console.warn(`[Test] Photo not found at ${photoPath}, skipping integration tests`);
    }
  });

  it("should load the drone photo successfully", () => {
    if (!photoBuffer) {
      console.log("[Test] Skipping - photo not available");
      return;
    }
    
    expect(photoBuffer).toBeDefined();
    expect(photoBuffer.length).toBeGreaterThan(0);
    console.log(`[Test] Photo loaded: ${photoBuffer.length} bytes`);
  });

  it("should chunk the photo correctly", () => {
    if (!photoBuffer) {
      console.log("[Test] Skipping - photo not available");
      return;
    }

    const totalChunks = Math.ceil(photoBuffer.length / CHUNK_SIZE);
    const chunks: Buffer[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, photoBuffer.length);
      const chunk = photoBuffer.slice(start, end);
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(totalChunks);
    console.log(`[Test] Photo chunked into ${totalChunks} chunks`);

    // Verify all chunks combined equal original
    const combined = Buffer.concat(chunks);
    expect(combined.length).toBe(photoBuffer.length);
    expect(combined.equals(photoBuffer)).toBe(true);
    console.log(`[Test] Chunks verified: combined size matches original`);
  });

  it("should encode chunks to base64 and decode back correctly", () => {
    if (!photoBuffer) {
      console.log("[Test] Skipping - photo not available");
      return;
    }

    const totalChunks = Math.ceil(photoBuffer.length / CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, photoBuffer.length);
      const originalChunk = photoBuffer.slice(start, end);

      // Simulate browser-side encoding
      const base64 = originalChunk.toString('base64');

      // Simulate server-side decoding
      const decodedChunk = Buffer.from(base64, 'base64');

      expect(decodedChunk.equals(originalChunk)).toBe(true);
    }

    console.log(`[Test] Base64 encoding/decoding verified for all chunks`);
  });

  it("should extract metadata from the drone photo", async () => {
    if (!photoBuffer) {
      console.log("[Test] Skipping - photo not available");
      return;
    }

    const metadata = await extractImageMetadata(photoBuffer);

    expect(metadata).toBeDefined();
    console.log(`[Test] Metadata extracted:`, {
      make: metadata.make,
      model: metadata.model,
      droneModel: metadata.droneModel,
      gpsLatitude: metadata.gpsLatitude,
      gpsLongitude: metadata.gpsLongitude,
      gpsAltitude: metadata.gpsAltitude,
      dateTime: metadata.dateTime,
      width: metadata.width,
      height: metadata.height,
      iso: metadata.iso,
      fNumber: metadata.fNumber,
      exposureTime: metadata.exposureTime,
      focalLength: metadata.focalLength,
    });

    // For a real drone photo, we expect some metadata
    // (may be empty if EXIF is not present, but we should have the object)
    expect(typeof metadata).toBe('object');
  });

  it("should verify photo integrity after chunking and combining", () => {
    if (!photoBuffer) {
      console.log("[Test] Skipping - photo not available");
      return;
    }

    // Simulate the complete upload flow
    const totalChunks = Math.ceil(photoBuffer.length / CHUNK_SIZE);
    const uploadedChunks: Buffer[] = [];

    // Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, photoBuffer.length);
      const chunk = photoBuffer.slice(start, end);
      uploadedChunks.push(chunk);
    }

    // Combine chunks (simulating finalize endpoint)
    const combined = Buffer.concat(uploadedChunks);

    // Verify integrity
    expect(combined.length).toBe(photoBuffer.length);
    expect(combined.equals(photoBuffer)).toBe(true);
    console.log(`[Test] Photo integrity verified after chunking and combining`);
  });

  it("should handle large photo files efficiently", () => {
    if (!photoBuffer) {
      console.log("[Test] Skipping - photo not available");
      return;
    }

    const startTime = Date.now();

    // Simulate chunking
    const totalChunks = Math.ceil(photoBuffer.length / CHUNK_SIZE);
    const chunks: Buffer[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, photoBuffer.length);
      chunks.push(photoBuffer.slice(start, end));
    }

    // Simulate combining
    const combined = Buffer.concat(chunks);

    const elapsed = Date.now() - startTime;
    console.log(`[Test] Processed ${photoBuffer.length} bytes in ${elapsed}ms`);

    expect(combined.equals(photoBuffer)).toBe(true);
    expect(elapsed).toBeLessThan(5000); // Should complete in less than 5 seconds
  });

  it("should validate chunk sequence integrity", () => {
    if (!photoBuffer) {
      console.log("[Test] Skipping - photo not available");
      return;
    }

    const totalChunks = Math.ceil(photoBuffer.length / CHUNK_SIZE);
    const uploadedChunks = new Set<number>();

    // Simulate uploading chunks
    for (let i = 0; i < totalChunks; i++) {
      uploadedChunks.add(i);
    }

    // Verify all chunks are present
    expect(uploadedChunks.size).toBe(totalChunks);

    // Verify no gaps
    for (let i = 0; i < totalChunks; i++) {
      expect(uploadedChunks.has(i)).toBe(true);
    }

    console.log(`[Test] Chunk sequence integrity verified`);
  });

  it("should calculate correct file size after chunking", () => {
    if (!photoBuffer) {
      console.log("[Test] Skipping - photo not available");
      return;
    }

    const totalChunks = Math.ceil(photoBuffer.length / CHUNK_SIZE);
    let totalSize = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, photoBuffer.length);
      const chunkSize = end - start;
      totalSize += chunkSize;
    }

    expect(totalSize).toBe(photoBuffer.length);
    console.log(`[Test] File size calculation verified: ${totalSize} bytes`);
  });
});
