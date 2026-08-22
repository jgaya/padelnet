-- El reglamento era texto fijo en la pagina, igual para todos los complejos.
-- Ahora lo edita cada club. Arranca en NULL: la pagina publica muestra un estado
-- vacio hasta que el admin cargue el suyo.
ALTER TABLE `Complejo` ADD COLUMN `reglamento` TEXT NULL;
