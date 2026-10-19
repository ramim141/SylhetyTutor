import { useEffect } from "react";

export function SEO({ title, description, jsonLd }) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) {
      document.title = title.includes("SylhetyTutor") ? title : `${title} | SylhetyTutor`;
    }

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute("content") : null;
    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", description);
    }

    let scriptTag = null;
    if (jsonLd) {
      scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.text = JSON.stringify(jsonLd);
      document.head.appendChild(scriptTag);
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc !== null) {
        metaDesc.setAttribute("content", prevDesc);
      }
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag);
      }
    };
  }, [title, description, jsonLd]);

  return null;
}
