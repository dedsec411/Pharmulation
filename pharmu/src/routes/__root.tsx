import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { TutorialBot } from "@/components/TutorialBot";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useInitAuth } from "@/lib/use-init-auth";
import { THEME_BOOT_SCRIPT, useThemeStore, useThemeSync } from "@/lib/theme-store";
import { MotionConfig } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import {
  SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, OG_IMAGE, canonical,
} from "@/lib/site";
import { Analytics } from "@vercel/analytics/react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-teal">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/10"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${SITE_NAME} - ${SITE_TAGLINE}` },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "theme-color", content: "#00BFA5" },

      // The share card. This previously pointed at a preview image on the
      // scaffolding tool's bucket - a URL nobody here controls, showing
      // nothing about this product - so a link pasted into WhatsApp or a group
      // chat previewed as somebody else's screenshot, or as nothing at all.
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: `${SITE_NAME} - ${SITE_TAGLINE}` },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/") },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "The Pharmulation wordmark above the line: train like a real pharmacist." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE_NAME} - ${SITE_TAGLINE}` },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      // There was no favicon at all. The manifest asked for one and got a 404,
      // so every browser tab showed the blank default page icon.
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // The inline script below stamps the real data-theme before React runs,
    // because the server cannot know which theme this visitor chose and
    // guessing means a light-theme user watches the app flash black to white.
    //
    // That leaves the server HTML and the hydrating DOM disagreeing about this
    // one attribute, which React reported on every single page load: "a tree
    // hydrated but some attributes of the server rendered HTML didn't match".
    // suppressHydrationWarning is the sanctioned answer for exactly this - an
    // attribute deliberately set before hydration - and it applies only to
    // this element, so a genuine mismatch anywhere else still surfaces.
    //
    // The default is rendered here as well so the markup is right for the
    // common case, and still themed if the script is blocked.
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthBootstrap() {
  useInitAuth();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const theme = useThemeStore((s) => s.theme);
  useThemeSync();

  return (
    <QueryClientProvider client={queryClient}>
      {/* styles.css already flattens CSS animations for a visitor who has asked
          for reduced motion, but framer-motion runs in JS and never saw that
          rule - so every entry animation, hover lift and celebration played
          regardless. This is the one switch that makes the JS half honour the
          same preference. */}
      <MotionConfig reducedMotion="user">
        <AuthBootstrap />
        <PageTransition>
          <Outlet />
        </PageTransition>
        <TutorialBot />
        {/* The theme switch of last resort. Most screens carry one in their
            own chrome - the nav bar, the case header - and styles.css hides
            this one whenever they do, so a screen that has neither (a mode
            being chosen, a feedback screen, anything added later) is still
            never a dead end for someone who needs the light theme.
            Bottom-right: Dr. Hakim owns bottom-left. */}
        {/* Positioned by this wrapper, not by a class passed to the switch:
            the switch is already `relative`, and `relative` is generated after
            `fixed` in Tailwind's sheet, so a `fixed` handed to it loses the tie
            and the control lands at the foot of the document. Measured at
            [-20, 920] in a 390x844 viewport before this wrapper existed. */}
        <div data-theme-slot="floating" className="fixed bottom-5 right-5 z-40 print:hidden">
          <ThemeToggle
            slot="floating"
            className="border-border bg-background/85 shadow-[0_8px_30px_-8px_rgb(0_0_0/0.45)] backdrop-blur"
          />
        </div>
        {/* Page views and which modes get played, so there is something better
            than a guess about what to build next. Deliberately this one rather
            than a tag manager: it sets no cookies and builds no profile of a
            visitor, which is why there is no consent banner in the way of the
            first thing anybody sees. */}
        <Analytics />
        {/* Toasts are drawn by sonner outside our stylesheet, so the theme has
            to be handed to it explicitly or they stay dark on a light page. */}
        {/* On a phone sonner spans the full width at the top, which put every
            score toast over the case bar's Back button and clock. mobileOffset
            only applies at phone width, so the desktop corner is unchanged. */}
        <Toaster position="top-right" theme={theme} richColors mobileOffset={{ top: 76 }} />
      </MotionConfig>
    </QueryClientProvider>
  );
}



