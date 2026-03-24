/**
 * Route Guard Utilities
 * 
 * Provides validation functions for route parameters
 */

/**
 * Validates if a string is a valid positive integer ID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidId(id: string | undefined): boolean {
  if (!id) return false;
  
  const parsed = parseInt(id, 10);
  return !isNaN(parsed) && parsed > 0 && Number.isInteger(parsed);
}

/**
 * Validates if a string is a valid positive integer client ID
 * Rejects organization IDs (240001+) that should be redirected
 * @param clientId - The client ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidClientId(clientId: string | undefined): boolean {
  if (!isValidId(clientId)) return false;
  
  const id = parseInt(clientId!, 10);
  
  // Reject organization IDs that should be redirected
  // Organization 240001 (City of Forney) -> Client 4560004
  if (id === 240001) return false;
  
  return true;
}

/**
 * Validates if a string is a valid positive integer project ID
 * @param projectId - The project ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidProjectId(projectId: string | undefined): boolean {
  return isValidId(projectId);
}

/**
 * Validates if a string is a valid positive integer media ID
 * @param mediaId - The media ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidMediaId(mediaId: string | undefined): boolean {
  return isValidId(mediaId);
}
