import React, { useEffect } from "react";
import { X } from "lucide-react";

export function BottomSheet({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet Box */}
      <div className="relative bg-bg-card border-t border-border rounded-t-2xl shadow-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-300">
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-fg-muted/30 rounded-full mx-auto mb-4 cursor-pointer" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border-light mb-4">
          <h3 className="font-display font-bold text-lg text-fg">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-fg rounded-full bg-bg-subtle cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
