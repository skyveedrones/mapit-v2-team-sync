/**
 * ClientIdGuard Component
 * 
 * Validates client IDs before allowing access to protected routes.
 * - Checks if clientId is a valid positive integer
 * - Redirects to /clients if invalid
 * - Allows valid IDs to proceed
 */

import { useParams, useLocation } from "wouter";
import { useEffect, ReactNode } from "react";

interface ClientIdGuardProps {
  children: ReactNode;
}

export function ClientIdGuard({ children }: ClientIdGuardProps) {
  const { clientId } = useParams<{ clientId: string }>();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Validate clientId
    if (!clientId) {
      setLocation("/clients");
      return;
    }

    const id = parseInt(clientId, 10);
    
    // Check if it's a valid positive integer
    if (isNaN(id) || id <= 0 || !Number.isInteger(id)) {
      setLocation("/clients");
      return;
    }

    // Allow valid IDs to proceed
  }, [clientId, setLocation]);

  // If clientId is invalid, don't render children
  if (!clientId) {
    return null;
  }

  const id = parseInt(clientId, 10);
  if (isNaN(id) || id <= 0 || !Number.isInteger(id)) {
    return null;
  }

  return <>{children}</>;
}
