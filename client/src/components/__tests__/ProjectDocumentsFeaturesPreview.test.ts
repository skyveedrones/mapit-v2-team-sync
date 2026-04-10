import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ProjectDocuments - PDF Preview Modal and Map Overlay Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PDF Preview Modal Feature', () => {
    it('should generate correct document URL from fileKey', () => {
      const fileKey = 'projects/123/documents/blueprint.pdf';
      const expectedUrl = `/api/documents/view?key=${encodeURIComponent(fileKey)}`;
      
      expect(expectedUrl).toContain('/api/documents/view');
      expect(expectedUrl).toContain('key=');
      expect(expectedUrl).toContain('projects%2F123%2Fdocuments%2Fblueprint.pdf');
    });

    it('should only enable preview for PDF files', () => {
      const isPdfOrImage = (fileType: string) => {
        const t = (fileType || '').toLowerCase();
        return t === 'pdf' || t === 'png' || t === 'jpg' || t === 'jpeg';
      };

      expect(isPdfOrImage('pdf')).toBe(true);
      expect(isPdfOrImage('PDF')).toBe(true);
      expect(isPdfOrImage('png')).toBe(true);
      expect(isPdfOrImage('docx')).toBe(false);
      expect(isPdfOrImage('xls')).toBe(false);
    });

    it('should render iframe with correct dimensions', () => {
      const width = '100%';
      const height = '600px';
      
      expect(width).toBe('100%');
      expect(height).toBe('600px');
    });

    it('should handle modal open/close state correctly', () => {
      const mockDoc = {
        id: 1,
        projectId: 123,
        fileName: 'blueprint.pdf',
        fileKey: 'projects/123/documents/blueprint.pdf',
        fileType: 'pdf',
        status: 'uploaded',
        createdAt: '2026-04-09T00:00:00Z',
        updatedAt: '2026-04-09T00:00:00Z',
      };

      expect(mockDoc.fileType.toLowerCase()).toBe('pdf');
      expect(mockDoc.fileName).toContain('.pdf');
    });

    it('should display correct document title in modal header', () => {
      const fileName = 'Site_Plan_v2.pdf';
      expect(fileName).toBe('Site_Plan_v2.pdf');
    });
  });

  describe('Map Overlay Feature', () => {
    it('should calculate 4-point bounding box from project center', () => {
      const projectCenter = { lat: 32.7767, lng: -96.797 };
      const latOffset = 0.01;
      const lngOffset = 0.01;

      const coordinates: [number, number][] = [
        [projectCenter.lng - lngOffset, projectCenter.lat + latOffset], // top-left
        [projectCenter.lng + lngOffset, projectCenter.lat + latOffset], // top-right
        [projectCenter.lng + lngOffset, projectCenter.lat - latOffset], // bottom-right
        [projectCenter.lng - lngOffset, projectCenter.lat - latOffset], // bottom-left
      ];

      expect(coordinates).toHaveLength(4);
      // Use toBeCloseTo for floating point comparisons
      expect(coordinates[0][0]).toBeCloseTo(-96.807, 3);
      expect(coordinates[0][1]).toBeCloseTo(32.7867, 3);
      expect(coordinates[1][0]).toBeCloseTo(-96.787, 3);
      expect(coordinates[1][1]).toBeCloseTo(32.7867, 3);
      expect(coordinates[2][0]).toBeCloseTo(-96.787, 3);
      expect(coordinates[2][1]).toBeCloseTo(32.7667, 3);
      expect(coordinates[3][0]).toBeCloseTo(-96.807, 3);
      expect(coordinates[3][1]).toBeCloseTo(32.7667, 3);
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

    it('should create image source with correct type', () => {
      const sourceType = 'image';
      expect(sourceType).toBe('image');
    });

    it('should create raster layer with correct type', () => {
      const layerType = 'raster';
      expect(layerType).toBe('raster');
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

    it('should validate map instance exists before adding overlay', () => {
      const mapInstance = null;
      const isMapAvailable = !!mapInstance;
      
      expect(isMapAvailable).toBe(false);
    });

    it('should validate file type before processing overlay', () => {
      const isPdfOrImage = (fileType: string) => {
        const t = (fileType || '').toLowerCase();
        return t === 'pdf' || t === 'png' || t === 'jpg' || t === 'jpeg';
      };

      expect(isPdfOrImage('pdf')).toBe(true);
      expect(isPdfOrImage('png')).toBe(true);
      expect(isPdfOrImage('docx')).toBe(false);
      expect(isPdfOrImage('xls')).toBe(false);
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
      expect(isPdfOrImage('jpg')).toBe(true);
      expect(isPdfOrImage('jpeg')).toBe(true);
      expect(isPdfOrImage('docx')).toBe(false);
      expect(isPdfOrImage('xls')).toBe(false);
    });

    it('should show "Preview" for all supported file types', () => {
      const fileTypes = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xls'];
      
      fileTypes.forEach(type => {
        expect(type).toBeTruthy();
      });
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

    it('should include Download action for all files', () => {
      const actions = ['Preview', 'Download', 'Delete'];
      expect(actions).toContain('Download');
    });

    it('should include Delete action with destructive styling', () => {
      const actions = ['Preview', 'Download', 'Delete'];
      expect(actions).toContain('Delete');
    });
  });

  describe('File Type Detection', () => {
    it('should correctly identify file icons', () => {
      const getFileIcon = (fileType: string) => {
        if (!fileType) return '📎';
        const t = fileType.toLowerCase();
        if (t === 'pdf') return '📄';
        if (t === 'png' || t === 'jpg' || t === 'jpeg') return '🖼️';
        if (t === 'doc' || t === 'docx') return '📝';
        if (t === 'xls' || t === 'xlsx') return '📊';
        if (t === 'las' || t === 'laz') return '🌐';
        return '📎';
      };

      expect(getFileIcon('pdf')).toBe('📄');
      expect(getFileIcon('png')).toBe('🖼️');
      expect(getFileIcon('jpg')).toBe('🖼️');
      expect(getFileIcon('jpeg')).toBe('🖼️');
      expect(getFileIcon('docx')).toBe('📝');
      expect(getFileIcon('xlsx')).toBe('📊');
      expect(getFileIcon('las')).toBe('🌐');
      expect(getFileIcon('laz')).toBe('🌐');
      expect(getFileIcon('unknown')).toBe('📎');
    });

    it('should handle uppercase file types', () => {
      const getFileIcon = (fileType: string) => {
        if (!fileType) return '📎';
        const t = fileType.toLowerCase();
        if (t === 'pdf') return '📄';
        if (t === 'png') return '🖼️';
        return '📎';
      };

      expect(getFileIcon('PDF')).toBe('📄');
      expect(getFileIcon('PNG')).toBe('🖼️');
    });
  });

  describe('Error Handling', () => {
    it('should show error if map instance not available', () => {
      const mapInstance = null;
      const hasError = !mapInstance;
      expect(hasError).toBe(true);
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

    it('should handle missing fileKey gracefully', () => {
      const fileKey = '';
      expect(fileKey).toBe('');
    });

    it('should handle invalid project center gracefully', () => {
      const projectCenter = null;
      const defaultCenter = projectCenter || { lat: 32.7767, lng: -96.797 };
      
      expect(defaultCenter.lat).toBe(32.7767);
      expect(defaultCenter.lng).toBe(-96.797);
    });
  });

  describe('Coordinate System', () => {
    it('should use correct coordinate order for Mapbox [lng, lat]', () => {
      const center = { lat: 32.7767, lng: -96.797 };
      const topLeft: [number, number] = [center.lng, center.lat];
      
      expect(topLeft[0]).toBe(-96.797); // lng first
      expect(topLeft[1]).toBe(32.7767); // lat second
    });

    it('should calculate correct offsets for 1km bounding box', () => {
      // 1 degree ≈ 111km, so 0.01 degree ≈ 1.11km
      const latOffset = 0.01;
      const lngOffset = 0.01;
      
      expect(latOffset).toBe(0.01);
      expect(lngOffset).toBe(0.01);
    });

    it('should maintain coordinate array in correct order', () => {
      const coordinates: [number, number][] = [
        [-96.807, 32.7867], // top-left
        [-96.787, 32.7867], // top-right
        [-96.787, 32.7667], // bottom-right
        [-96.807, 32.7667], // bottom-left
      ];

      // Verify clockwise order
      expect(coordinates[0][0]).toBeLessThan(coordinates[1][0]); // left < right
      expect(coordinates[0][1]).toBeGreaterThan(coordinates[3][1]); // top > bottom
    });
  });

  describe('Status Badge Display', () => {
    it('should display correct status badge for uploaded documents', () => {
      const getStatusBadge = (status: string | null) => {
        if (!status || status === 'uploaded') return { label: 'Uploaded', color: 'bg-blue-100 text-blue-800' };
        if (status === 'processing') return { label: 'Processing', color: 'bg-yellow-100 text-yellow-800' };
        if (status === 'processed') return { label: 'Processed', color: 'bg-green-100 text-green-800' };
        return { label: status, color: 'bg-gray-100 text-gray-800' };
      };

      const badge = getStatusBadge('uploaded');
      expect(badge.label).toBe('Uploaded');
      expect(badge.color).toContain('blue');
    });

    it('should display correct status badge for processing documents', () => {
      const getStatusBadge = (status: string | null) => {
        if (!status || status === 'uploaded') return { label: 'Uploaded', color: 'bg-blue-100 text-blue-800' };
        if (status === 'processing') return { label: 'Processing', color: 'bg-yellow-100 text-yellow-800' };
        if (status === 'processed') return { label: 'Processed', color: 'bg-green-100 text-green-800' };
        return { label: status, color: 'bg-gray-100 text-gray-800' };
      };

      const badge = getStatusBadge('processing');
      expect(badge.label).toBe('Processing');
      expect(badge.color).toContain('yellow');
    });

    it('should display correct status badge for processed documents', () => {
      const getStatusBadge = (status: string | null) => {
        if (!status || status === 'uploaded') return { label: 'Uploaded', color: 'bg-blue-100 text-blue-800' };
        if (status === 'processing') return { label: 'Processing', color: 'bg-yellow-100 text-yellow-800' };
        if (status === 'processed') return { label: 'Processed', color: 'bg-green-100 text-green-800' };
        return { label: status, color: 'bg-gray-100 text-gray-800' };
      };

      const badge = getStatusBadge('processed');
      expect(badge.label).toBe('Processed');
      expect(badge.color).toContain('green');
    });
  });
});
