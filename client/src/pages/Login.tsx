/**
 * Login/Signup Landing Page
 * Professional authentication page matching MAPit branding
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { CheckCircle2, Shield, Zap, Map, Upload, Download } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const features = [
    {
      icon: Upload,
      title: "Easy Upload",
      description: "Upload drone photos and videos with automatic GPS extraction",
    },
    {
      icon: Map,
      title: "Interactive Maps",
      description: "Visualize flights on Google Maps with markers and flight paths",
    },
    {
      icon: Download,
      title: "Professional Reports",
      description: "Generate branded PDF reports with maps and media galleries",
    },
  ];

  const benefits = [
    "Secure authentication",
    "Free tier available",
    "No credit card required to start",
    "Instant access after signup",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img
              src="/images/mapit-logo.webp"
              alt="MAPit"
              className="h-8 w-auto"
            />
          </div>
          <Button onClick={handleLogin} size="sm">
            Sign In
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center gap-3 flex-wrap">
                  <span>Welcome to</span>
                  <img
                    src="/images/mapit-logo.webp"
                    alt="MAPit"
                    className="h-12 md:h-16 w-auto"
                  />
                </h1>
                <p className="text-xl text-muted-foreground">
                  Professional drone mapping solutions that empower smarter project planning, monitoring, and decision-making.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">What You Can Do</h2>
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                      className="flex gap-3"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Column - Login Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="p-8 space-y-6 bg-card/50 backdrop-blur-sm border-2 border-primary/20">
                <div className="space-y-2 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Get Started</h2>
                  <p className="text-muted-foreground">
                    Sign in or create your account to start mapping
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={handleLogin}
                    size="lg"
                    className="w-full text-lg h-12"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Continue to Login
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        How it works
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        1
                      </div>
                      <p>Click the button above to open the secure authentication portal</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        2
                      </div>
                      <p>Sign in with your existing account or create a new one</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        3
                      </div>
                      <p>You'll be automatically redirected back and ready to go</p>
                    </div>
                  </div>


                </div>
              </Card>

              {/* Additional Info */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>
                  New user?{" "}
                  <button
                    onClick={handleLogin}
                    className="text-primary hover:underline font-medium"
                  >
                    Create a free account
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 MAPit by SkyVee Drones. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
