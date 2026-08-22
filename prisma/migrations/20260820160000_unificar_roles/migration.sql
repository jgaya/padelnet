-- Unificacion de los tres juegos de roles.
--
--   PlatformRole: se elimina SUPPORT. Era el marcador de "tiene un rol en algun
--   complejo", cosa que la fila de ComplejoMembership ya dice. Ademas el login
--   lo convertia en admin global, que era una escalada de privilegios.
--
--   ComplejoRole: OWNER se fusiona en ADMIN. La titularidad pasa a ser un dato
--   (esPropietario) y deja de ser un nivel de permiso.
--
-- Los UPDATE van ANTES de los MODIFY: MySQL no deja achicar un enum que todavia
-- tiene filas con los valores que se van. En dev no hay ninguna fila afectada,
-- pero otros entornos si pueden tener OWNER o SUPPORT.

-- AlterTable
ALTER TABLE `ComplejoMembership` ADD COLUMN `esPropietario` BOOLEAN NOT NULL DEFAULT false;

-- Migracion de datos: el viejo OWNER se conserva como titularidad.
UPDATE `ComplejoMembership` SET `esPropietario` = true WHERE `role` = 'OWNER';
UPDATE `ComplejoMembership` SET `role` = 'ADMIN' WHERE `role` = 'OWNER';

-- Reparacion previa: hay filas viejas con updatedAt en '0000-00-00', anteriores
-- al modo estricto. El MODIFY de mas abajo reconstruye la tabla User y MySQL
-- rechaza esos valores, asi que hay que sanearlos primero.
UPDATE `User` SET `updatedAt` = `createdAt`
WHERE CAST(`updatedAt` AS CHAR) LIKE '0000%';

-- Migracion de datos: los SUPPORT pasan a USER. El acceso que tuvieran a un
-- complejo ya esta representado por su fila en ComplejoMembership.
UPDATE `User` SET `platformRole` = 'USER' WHERE `platformRole` = 'SUPPORT';

-- AlterTable
ALTER TABLE `ComplejoMembership` MODIFY `role` ENUM('ADMIN', 'DATAENTRY', 'FISCAL', 'STAFF') NOT NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `platformRole` ENUM('USER', 'SUPERADMIN') NOT NULL DEFAULT 'USER';
