import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { APP_VERSION, getVersionString } from "@shared/version";
import { AlertCircle, CheckCircle2, Info, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getBuildHash, fetchRemoteVersion, isUpdateAvailable as checkUpdateAvailable, getVersionInfo } from "@/lib/buildVersion";

interface VersionInfo {
  hash: string;
  fullHash: string;
  timestamp: string;
  buildTime: string;
}

export default function VersionCheck() {
  const [autoCheck, setAutoCheck] = useState(() => {
    const saved = localStorage.getItem("autoCheckUpdates");
    return saved !== "false"; // Default to true
  });
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [versionMismatch, setVersionMismatch] = useState(false);
  const [backendVersion, setBackendVersion] = useState<string | null>(null);
  const [displayVersion, setDisplayVersion] = useState<string | null>(null);

  const currentVersion = getBuildHash();
  
  // Load version info on mount
  useEffect(() => {
    getVersionInfo().then(info => {
      if (info) {
        setDisplayVersion(`${info.version} (${info.commit})`);
      }
    });
  }, []);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      // Fallback to local version.json check (backend validation removed due to tRPC hook limitation)
      const remoteVersion = await fetchRemoteVersion();
      
      if (!remoteVersion) {
        throw new Error('Failed to fetch version info');
      }
      
      const remoteHash = remoteVersion.hash;
      setLatestVersion(remoteHash);
      setLastChecked(new Date());
      
      const hasUpdate = checkUpdateAvailable(remoteHash);
      setUpdateAvailable(hasUpdate);
    } catch (error) {
      console.error("[UpdateChecker] Failed to check for updates:", error);
      setLatestVersion(currentVersion);
      setLastChecked(new Date());
      setUpdateAvailable(false);
      
      toast.error("Failed to check for updates", {
        description: "Unable to connect to update server.",
      });
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
    // Use service worker to skip cache and reload with fresh assets
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      }).then(() => {
        // After unregistering service worker, do a hard refresh
        // This bypasses all caches and fetches fresh assets
        window.location.href = window.location.href;
      });
    } else {
      // Fallback: hard reload with cache busting
      window.location.href = window.location.href + '?t=' + Date.now();
    }
  };

  // Auto-check on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      checkForUpdates();
    }
  }, []); // Only run on mount

  // Auto-refresh if update is available - DISABLED
  // useEffect(() => {
  //   if (updateAvailable && !isChecking) {
  //     // Auto-refresh after 3 seconds
  //     const timer = setTimeout(() => {
  //       console.log('[VersionCheck] Auto-refreshing to pull latest version');
  //       handleRefresh();
  //     }, 3000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [updateAvailable, isChecking]);

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
              {displayVersion || getVersionString()}
            </div>
          </div>
          {updateAvailable || versionMismatch ? (
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

        {/* Version Mismatch Banner */}
        {versionMismatch && backendVersion && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-red-500">Version Mismatch Detected</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Current: {currentVersion} | Remote: {latestVersion}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  A newer build is available. Please refresh the page to load the latest version.
                </div>
                <Button
                  onClick={handleRefresh}
                  className="mt-3 bg-red-500 hover:bg-red-600 text-white"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Update Available Banner */}
        {updateAvailable && !versionMismatch && latestVersion && (
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
