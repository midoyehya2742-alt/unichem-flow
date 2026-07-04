import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation, I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("root.page_not_found", { defaultValue: "Page not found" })}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("root.page_does_not_exist", { defaultValue: "The page you're looking for doesn't exist." })}
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {t("root.go_home", { defaultValue: "Go home" })}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{t("root.something_went_wrong", { defaultValue: "Something went wrong" })}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("root.try_refreshing", { defaultValue: "Try refreshing the page." })}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {t("root.try_again", { defaultValue: "Try again" })}
          </button>
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
      { title: "UniChem ERP" },
      { name: "description", content: "Internal sales & finance management system for UniChem." },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/pwa-icon.jpg" },
      { rel: "apple-touch-icon", href: "/pwa-icon.jpg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
// Moved i18n import to top

function RootShell({ children }: { children: ReactNode }) {
  const dir = typeof i18n.dir === "function" ? i18n.dir() : (i18n.language === "ar" ? "rtl" : "ltr");
  const lang = i18n.language || "en";

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head suppressHydrationWarning><HeadContent /></head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <Outlet />
            <Toaster
              richColors
              position="top-right"
              closeButton
              duration={4000}
              toastOptions={{
                classNames: {
                  toast: "font-sans text-sm rounded-xl shadow-lg",
                  title: "font-semibold",
                  description: "text-xs opacity-80",
                  closeButton: "opacity-60 hover:opacity-100",
                },
              }}
            />
          </AuthProvider>
        </I18nextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
