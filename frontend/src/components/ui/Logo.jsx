// Brand logo (cap on a location pin + wordmark). Web-sized copies of
// public/"SylhetyTutor Graduation Pin Logo.png": 311x72, transparent background.
//   logo.png       navy wordmark, for light surfaces
//   logo-dark.png  light-navy wordmark (DESIGN.md "logo on dark bg"), for dark surfaces
const SIZE = { width: 311, height: 72 };

/**
 * variant="auto"    follows the theme: the right file is shown via CSS (see .logo-light /
 *                   .logo-dark in base.css), so it also switches when the theme is toggled.
 * variant="on-dark" always the dark-surface file, for panels that are dark in both themes.
 */
export function Logo({ variant = "auto", className = "h-9" }) {
  if (variant === "on-dark") {
    return <img src="/images/logo-dark.png" alt="SylhetyTutor" {...SIZE} className={`block w-auto ${className}`} />;
  }
  return (
    <>
      <img src="/images/logo.png" alt="SylhetyTutor" {...SIZE} className={`logo-light w-auto ${className}`} />
      <img src="/images/logo-dark.png" alt="SylhetyTutor" {...SIZE} className={`logo-dark w-auto ${className}`} />
    </>
  );
}
