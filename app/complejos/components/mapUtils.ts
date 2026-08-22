type ComplejoUbicacion = {
  name: string;
  direccion: string | null;
  ciudad: string;
  provincia: string;
  pais: string;
};

export function buildMapsQuery(complejo: ComplejoUbicacion) {
  const pieces = [
    complejo.name,
    complejo.direccion,
    complejo.ciudad,
    complejo.provincia,
    complejo.pais,
  ]
    .map((piece) => piece?.trim())
    .filter((piece): piece is string => Boolean(piece));

  return pieces.join(", ");
}

export function mapUrls(query: string) {
  const encoded = encodeURIComponent(query);
  return {
    embed: `https://www.google.com/maps?q=${encoded}&output=embed`,
    external: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  };
}

export function phoneHref(phone: string | null) {
  if (!phone) {
    return null;
  }

  const normalized = phone.replace(/[^\d+]/g, "");
  if (!normalized) {
    return null;
  }

  return `tel:${normalized}`;
}
