import { parseMarkdownSimple } from "@/lib/markdown-simple";

/**
 * Renderiza el Markdown minimo del reglamento como JSX.
 *
 * Sin dangerouslySetInnerHTML: el texto lo carga el admin y React escapa todo,
 * asi que no hay forma de inyectar markup.
 */
export default function MarkdownSimple({ texto }: { texto: string }) {
  const bloques = parseMarkdownSimple(texto);

  return (
    <div className="space-y-4">
      {bloques.map((bloque, index) => {
        if (bloque.tipo === "titulo") {
          return bloque.nivel === 2 ? (
            <h2 key={index} className="text-lg font-semibold text-deep-black">
              {bloque.texto}
            </h2>
          ) : (
            <h3 key={index} className="text-base font-semibold text-deep-black">
              {bloque.texto}
            </h3>
          );
        }

        if (bloque.tipo === "lista") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {bloque.items.map((item, i) => (
                <li key={i} className="text-sm text-deep-black/80">
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="text-sm leading-relaxed text-deep-black/80">
            {bloque.texto}
          </p>
        );
      })}
    </div>
  );
}
