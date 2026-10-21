const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function amount(cents: number) {
  return euros.format(cents / 100);
}
