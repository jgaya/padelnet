-- Los tokens de un solo uso mandados por mail ahora cubren dos casos:
-- confirmar la direccion y restablecer la contrasena. `purpose` los separa para
-- que un link de verificacion no sirva para cambiar la contrasena, ni al reves.
--
-- Los que ya existen son todos de verificacion, que es el default.
ALTER TABLE `EmailVerification`
  ADD COLUMN `purpose` ENUM('VERIFICACION', 'RESET_PASSWORD') NOT NULL DEFAULT 'VERIFICACION';
