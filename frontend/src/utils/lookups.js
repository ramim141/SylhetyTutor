// Name to show for an area / subject / class level / university in the current language.
// English uses the short name when there is one (SUST); Bangla and Mixed use the Bangla name,
// like the home page's area chips.
export function labelOf(item, lang) {
  if (!item) return "";
  return lang === "en" ? item.short_name || item.name_en : item.name_bn;
}

export function findBySlug(list = [], slug) {
  return list.find((item) => item.slug === slug);
}
