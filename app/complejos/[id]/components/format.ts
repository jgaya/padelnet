type CategoriaInfo = {
  categoriaRegla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA";
  categoriaN: number | null;
};

export function formatDate(value: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatTime(value: string | null) {
  if (!value) return "--:--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function categoriaLabel(torneo: CategoriaInfo) {
  switch (torneo.categoriaRegla) {
    case "MAYOR_IGUAL":
      return `Categoria ${torneo.categoriaN}+`;
    case "MENOR_IGUAL":
      return `Categoria ${torneo.categoriaN}-`;
    case "IGUAL":
      return `Categoria ${torneo.categoriaN}`;
    case "SUMA":
      return `Suma ${torneo.categoriaN}`;
    case "LIBRE":
    default:
      return "Categoria libre";
  }
}

export function sexoLabel(sexo: "MASCULINO" | "FEMENINO" | "MIXTO") {
  switch (sexo) {
    case "MASCULINO":
      return "Masculino";
    case "FEMENINO":
      return "Femenino";
    case "MIXTO":
    default:
      return "Mixto";
  }
}
