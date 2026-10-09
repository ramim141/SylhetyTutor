import React from "react";
import { Home, Search, PlusCircle, MapPin, User } from "lucide-react";
import { useTranslation } from "../../i18n";

export function BottomNav({ activeTab = "home", onTabChange }) {
  const { t } = useTranslation();

  const tabs = [
    { id: "home", label: t("nav.home") || "Home", icon: Home },
    { id: "tutors", label: t("nav.findTutors") || "Tutors", icon: Search },
    {
      id: "post",
      label: "Post",
      icon: PlusCircle,
      isAction: true,
    },
    { id: "areas", label: "Areas", icon: MapPin },
    { id: "account", label: t("nav.signIn") || "Account", icon: User },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur-xl border-t border-border shadow-lg pb-[env(safe-area-inset-bottom,6px)] pt-1.5 transition-colors"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange && onTabChange(tab.id)}
                className="flex flex-col items-center justify-center -mt-5 group cursor-pointer focus:outline-hidden"
              >
                <div className="w-12 h-12 rounded-full bg-orange text-on-orange flex items-center justify-center shadow-md shadow-orange/30 group-active:scale-95 transition-all">
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-display font-bold text-orange mt-1">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange && onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-14 cursor-pointer select-none transition-all active:scale-95 focus:outline-hidden ${
                isActive
                  ? "text-orange font-bold"
                  : "text-fg-secondary hover:text-fg font-medium"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? "stroke-[2.5] scale-110" : "stroke-2"
                }`}
              />
              <span className="text-[11px] font-display mt-1 tracking-tight truncate max-w-16">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
