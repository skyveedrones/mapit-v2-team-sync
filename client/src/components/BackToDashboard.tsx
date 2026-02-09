/**
 * BackToDashboard Component
 * Reusable navigation component for returning to the dashboard
 */

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface BackToDashboardProps {
  variant?: "default" | "ghost";
  size?: "default" | "sm";
  className?: string;
}

export function BackToDashboard({ 
  variant = "ghost", 
  size = "sm", 
  className = "mb-4 -ml-2" 
}: BackToDashboardProps) {
  return (
    <Link href="/dashboard">
      <Button variant={variant} size={size} className={className}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>
    </Link>
  );
}
