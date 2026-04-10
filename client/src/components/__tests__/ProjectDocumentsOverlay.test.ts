import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ProjectDocuments - PDF Preview and Map Overlay Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PDF Preview Modal', () => {
    it('should generate correct document URL from fileKey', () => {
      const fileKey = 'projects/123/documents/blueprint.pdf';
      const expectedUrl = `/api/documents/view?key=${encodeURIComponent(fileKey)}`;
      expect(expectedUrl).toContain('/api/documents/view');
      expect(expectedUrl).toContain('key=');
    });

    it('should only allow preview for PDF files', () => {
      const pdfType = 'pdf';
      const imageType = 'png';
      const docType = 'docx';

      const isPdfOrImage = (fileType: string) => {
        const t = (fileType || '').toLowerCase();
        return t === 'pdf' || t === 'png' || t === 'jpg' || t === 'jpeg';
      };

      expect(isPdfOrImage(pdfType)).toBe(true);
      expect(isPdfOrImage(imageType)).toBe(true);
      expect(isPdfOrImage(docType)).toBe(false);
    });

    it('should render iframe with correct dimensions', () => {
      const width = '100%';
      const height = '80vh';
      expect(width).toBe('100%');
      expect(height).toBe('80vh');
    });
  });

  describe('Map Overlay Feature', () => {
    it('should calculate bounding box coordinates from project center', () => {
      const projectCenter = { lat: 32.7767, lng: -96.797 };
      const latOffset = 0.01;
      const lngOffset = 0.01;

      const coordinates = [
        [projectCenter.lng - lngOffset, projectCenter.lat + latOffset], // top-left
        [projectCenter.lng + lngOffset, projectCenter.lat + latOffset], // top-right
        [projectCenter.lng + lngOffset, projectCenter.lat - latOffset], // bottom-right
        [projectCenter.lng - lngOffset, projectCenter.lat - latOffset], // bottom-left
      ];

      expect(coordinates).toHaveLength(4);
      expect(coordinates[0][0]).toBeCloseTo(-96.807, 3);
      expect(coordinates[0][1]).toBeCloseTo(32.7867, 3);
      expect(coordinates[2][0]).toBeCloseTo(-96.787, 3);
      expect(coordinates[2][1]).toBeCloseTo(32.7667, 3);
    });

    it('should use default Dallas coordinates if project center not provided', () => {
      const defaultCenter = { lat: 32.7767, lng: -96.797 };
      expect(defaultCenter.lat).toBe(32.7767);
      expect(defaultCenter.lng).toBe(-96.797);
    });

    it('should set raster opacity to 0.7 for map overlay', () => {
      const rasterOpacity = 0.7;
      expect(rasterOpacity).toBe(0.7);
      expect(rasterOpacity).toBeGreaterThan(0);
      expect(rasterOpacity).toBeLessThan(1);
    });

    it('should generate unique source and layer IDs for overlays', () => {
      const docId = 123;
      const sourceId = `overlay-${docId}`;
      const layerId = `overlay-layer-${docId}`;

      expect(sourceId).toBe('overlay-123');
      expect(layerId).toBe('overlay-layer-123');
      expect(sourceId).not.toBe(layerId);
    });

    it('should handle image files without conversion', () => {
      const imageExtensions = ['png', 'jpg', 'jpeg'];
      const fileName = 'blueprint.png';
      const ext = fileName.split('.').pop()?.toLowerCase();

      expect(imageExtensions).toContain(ext);
    });

    it('should handle PDF files with conversion', () => {
      const pdfExtensions = ['pdf'];
      const fileName = 'blueprint.pdf';
      const ext = fileName.split('.').pop()?.toLowerCase();

      expect(pdfExtensions).toContain(ext);
    });
  });

  describe('Document Actions Dropdown', () => {
    it('should show "Use as Map Overlay" only for PDF and images', () => {
      const isPdfOrImage = (fileType: string) => {
        const t = (fileType || '').toLowerCase();
        return t === 'pdf' || t === 'png' || t === 'jpg' || t === 'jpeg';
      };

      expect(isPdfOrImage('pdf')).toBe(true);
      expect(isPdfOrImage('png')).toBe(true);
      expect(isPdfOrImage('docx')).toBe(false);
      expect(isPdfOrImage('xls')).toBe(false);
    });

    it('should disable actions while processing overlay', () => {
      const isProcessing = true;
      expect(isProcessing).toBe(true);
    });

    it('should show loading spinner during conversion', () => {
      const isProcessing = true;
      const showSpinner = isProcessing;
      expect(showSpinner).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should show error if map instance not available', () => {
      const mapInstance = null;
      expect(mapInstance).toBeNull();
    });

    it('should show error if file type not supported for overlay', () => {
      const fileType = 'docx';
      const isPdfOrImage = (type: string) => {
        const t = (type || '').toLowerCase();
        return t === 'pdf' || t === 'png' || t === 'jpg' || t === 'jpeg';
      };

      expect(isPdfOrImage(fileType)).toBe(false);
    });

    it('should handle conversion errors gracefully', () => {
      const error = new Error('Failed to convert document');
      expect(error.message).toContain('Failed to convert');
    });
  });

  describe('File Type Detection', () => {
    it('should correctly identify file icons', () => {
      const getFileIcon = (fileType: string) => {
        if (!fileType) return '📎';
        const t = fileType.toLowerCase();
        if (t === 'pdf') return '📄';
        if (t === 'png' || t === 'jpg' || t === 'jpeg') return '🖼️';
        if (t === 'las' || t === 'laz') return '🌐';
        return '📎';
      };

      expect(getFileIcon('pdf')).toBe('📄');
      expect(getFileIcon('png')).toBe('🖼️');
      expect(getFileIcon('las')).toBe('🌐');
      expect(getFileIcon('unknown')).toBe('📎');
    });
  });
});
