import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { APP_VERSION, getVersionString } from "@shared/version";
import { AlertCircle, CheckCircle2, Info, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function VersionCheck() {
  const [autoCheck, setAutoCheck] = useState(() => {
    const saved = localStorage.getItem("autoCheckUpdates");
    return saved !== "false"; // Default to true
  });
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const currentVersion = APP_VERSION.commit.substring(0, 7);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      // Fetch the version.ts file from the published site to get the latest version
      const response = await fetch('/version.json?' + Date.now(), {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data = await response.json();
        const publishedVersion = data.commit.substring(0, 7);
        
        setLatestVersion(publishedVersion);
        setLastChecked(new Date());
        
        if (publishedVersion !== currentVersion) {
          setUpdateAvailable(true);
          toast.info("Update available!", {
            description: "A new version of the application is available. Refresh to update.",
          });
        } else {
          setUpdateAvailable(false);
          toast.success("You're up to date!", {
            description: "You're using the latest version.",
          });
        }
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      toast.error("Failed to check for updates");
    } finally {
      setIsChecking(false);
    }
  };

  const handleAutoCheckChange = (checked: boolean) => {
    setAutoCheck(checked);
    localStorage.setItem("autoCheckUpdates", checked.toString());
    toast.success(checked ? "Automatic update checks enabled" : "Automatic update checks disabled");
  };

  const handleRefresh = () => {
    // Hard refresh that bypasses cache
    // Method 1: Use location.reload(true) - deprecated but still works in most browsers
    // Method 2: Clear cache and reload by adding timestamp to URL
    // Method 3: Use Cache API to clear service worker cache
    
    // Clear any service worker caches first
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Force hard reload by modifying the URL with a cache-busting parameter
    const url = new URL(window.location.href);
    url.searchParams.set('_refresh', Date.now().toString());
    window.location.href = url.toString();
  };

  // Auto-check on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      checkForUpdates();
    }
  }, []);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Info className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <CardTitle>Version & Updates</CardTitle>
            <CardDescription>
              Check for updates and manage automatic update notifications
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Version */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <div className="text-sm font-medium">Current Version</div>
            <div className="text-xs text-muted-foreground mt-1">
              {getVersionString()}
            </div>
          </div>
          {updateAvailable ? (
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Update Available</span>
            </div>
          ) : lastChecked ? (
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Up to Date</span>
            </div>
          ) : null}
        </div>

        {/* Update Available Banner */}
        {updateAvailable && latestVersion && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-amber-500">New Version Available</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Version {latestVersion} is available. Refresh the page to update.
                </div>
                <Button
                  onClick={handleRefresh}
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Auto-check Setting */}
        <div className="flex items-center space-x-3 p-4 rounded-lg border border-border">
          <Checkbox
            id="autoCheck"
            checked={autoCheck}
            onCheckedChange={handleAutoCheckChange}
          />
          <div className="flex-1">
            <Label htmlFor="autoCheck" className="cursor-pointer font-medium">
              Automatically check for updates
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Check for new versions when you open Settings
            </p>
          </div>
        </div>

        {/* Manual Check Button */}
        <div className="flex items-center justify-between">
          <div>
            {lastChecked && (
              <p className="text-sm text-muted-foreground">
                Last checked: {lastChecked.toLocaleString()}
              </p>
            )}
          </div>
          <Button
            onClick={checkForUpdates}
            disabled={isChecking}
            variant="outline"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check for Updates
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
