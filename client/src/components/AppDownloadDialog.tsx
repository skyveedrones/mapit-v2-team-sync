import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Apple, Smartphone, Chrome } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface AppDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppDownloadDialog({ open, onOpenChange }: AppDownloadDialogProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Detect if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] Install prompt captured');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleIOSInstall = () => {
    toast.info("To install on iPhone/iPad:", {
      description: "1. Tap the Share button (square with arrow)\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to install",
      duration: 10000,
    });
  };

  const handleAndroidInstall = () => {
    toast.info("To install on Android:", {
      description: "1. Tap the menu (three dots)\n2. Tap 'Add to Home screen' or 'Install app'\n3. Tap 'Install' to confirm",
      duration: 10000,
    });
  };

  const handleDesktopDownload = async (platform: string) => {
    console.log(`[App Download] User clicked download for ${platform}`);
    
    // Try to trigger PWA installation
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User ${outcome} the install prompt`);
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!', {
          description: 'You can now access Mapit from your desktop.',
        });
        setDeferredPrompt(null);
        onOpenChange(false);
      } else {
        toast.info('Installation cancelled', {
          description: 'You can install later from your browser menu.',
        });
      }
    } else {
      // Fallback: Show browser-specific instructions
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
      const isEdge = /Edg/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      if (isChrome || isEdge) {
        toast.info('Install from browser menu', {
          description: `Click the install icon (⊕) in the address bar, or go to Menu → Install Mapit.`,
          duration: 8000,
        });
      } else if (isSafari) {
        toast.info('Safari installation', {
          description: 'Safari doesn\'t support PWA installation on desktop. Please use Chrome or Edge.',
          duration: 8000,
        });
      } else {
        toast.info('Install from browser', {
          description: 'Look for an install option in your browser\'s menu (usually under More Tools or Settings).',
          duration: 8000,
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Download Mapit App</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {isStandalone
              ? "App is already installed! You can access it from your home screen."
              : isIOS
              ? "Install Mapit on your iPhone or iPad for the best experience."
              : isAndroid
              ? "Install Mapit on your Android device for offline access and faster performance."
              : "Get the best experience with our app. Available for all platforms."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {isIOS ? (
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4 px-4 border-2 border-primary/20 hover:border-primary/40"
              onClick={handleIOSInstall}
            >
              <Apple className="h-6 w-6 mr-3 text-primary" />
              <div className="text-left flex-1">
                <div className="font-semibold">Install on iPhone/iPad</div>
                <div className="text-sm text-muted-foreground">
                  Tap to see installation instructions
                </div>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </Button>
          ) : isAndroid ? (
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4 px-4 border-2 border-primary/20 hover:border-primary/40"
              onClick={handleAndroidInstall}
            >
              <Smartphone className="h-6 w-6 mr-3 text-primary" />
              <div className="text-left flex-1">
                <div className="font-semibold">Install on Android</div>
                <div className="text-sm text-muted-foreground">
                  Tap to see installation instructions
                </div>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 px-4"
                onClick={() => handleDesktopDownload("Windows")}
              >
                <Monitor className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left flex-1">
                  <div className="font-semibold">Windows</div>
                  <div className="text-sm text-muted-foreground">For Windows 10 and later</div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 px-4"
                onClick={() => handleDesktopDownload("macOS")}
              >
                <Apple className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left flex-1">
                  <div className="font-semibold">macOS</div>
                  <div className="text-sm text-muted-foreground">For macOS 11 and later</div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 px-4"
                onClick={() => handleDesktopDownload("Linux")}
              >
                <Chrome className="h-5 w-5 mr-3 text-primary" />
                <div className="text-left flex-1">
                  <div className="font-semibold">Linux</div>
                  <div className="text-sm text-muted-foreground">For Ubuntu, Fedora, and more</div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          )}

          {/* Show mobile install options on desktop */}
          {!isIOS && !isAndroid && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Mobile Devices:</p>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleIOSInstall}
                >
                  <Apple className="h-4 w-4 mr-2" />
                  iPhone/iPad Installation Guide
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleAndroidInstall}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Android Installation Guide
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
