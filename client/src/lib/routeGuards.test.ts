import { describe, it, expect } from 'vitest';
import {
  isValidId,
  isValidClientId,
  isValidProjectId,
  isValidMediaId,
} from './routeGuards';

describe('Route Guard Utilities', () => {
  describe('isValidId', () => {
    it('should return true for valid positive integers', () => {
      expect(isValidId('1')).toBe(true);
      expect(isValidId('100')).toBe(true);
      expect(isValidId('999999')).toBe(true);
    });

    it('should return false for invalid IDs', () => {
      expect(isValidId(undefined)).toBe(false);
      expect(isValidId('')).toBe(false);
      expect(isValidId('0')).toBe(false);
      expect(isValidId('-1')).toBe(false);
      expect(isValidId('abc')).toBe(false);
    });

    it('should handle edge cases with parseInt behavior', () => {
      // parseInt('1.5') returns 1, which is valid
      expect(isValidId('1.5')).toBe(true);
      // parseInt('1e2') returns 1, which is valid
      expect(isValidId('1e2')).toBe(true);
    });
  });

  describe('isValidClientId', () => {
    it('should return true for valid client IDs', () => {
      expect(isValidClientId('1')).toBe(true);
      expect(isValidClientId('4560004')).toBe(true);
      expect(isValidClientId('100')).toBe(true);
    });

    it('should return false for organization IDs that should be redirected', () => {
      expect(isValidClientId('240001')).toBe(false);
    });

    it('should return false for invalid IDs', () => {
      expect(isValidClientId(undefined)).toBe(false);
      expect(isValidClientId('')).toBe(false);
      expect(isValidClientId('0')).toBe(false);
      expect(isValidClientId('-1')).toBe(false);
      expect(isValidClientId('abc')).toBe(false);
    });
  });

  describe('isValidProjectId', () => {
    it('should return true for valid project IDs', () => {
      expect(isValidProjectId('1')).toBe(true);
      expect(isValidProjectId('100')).toBe(true);
      expect(isValidProjectId('999999')).toBe(true);
    });

    it('should return false for invalid IDs', () => {
      expect(isValidProjectId(undefined)).toBe(false);
      expect(isValidProjectId('')).toBe(false);
      expect(isValidProjectId('0')).toBe(false);
      expect(isValidProjectId('-1')).toBe(false);
    });
  });

  describe('isValidMediaId', () => {
    it('should return true for valid media IDs', () => {
      expect(isValidMediaId('1')).toBe(true);
      expect(isValidMediaId('100')).toBe(true);
      expect(isValidMediaId('999999')).toBe(true);
    });

    it('should return false for invalid IDs', () => {
      expect(isValidMediaId(undefined)).toBe(false);
      expect(isValidMediaId('')).toBe(false);
      expect(isValidMediaId('0')).toBe(false);
      expect(isValidMediaId('-1')).toBe(false);
    });
  });
});
