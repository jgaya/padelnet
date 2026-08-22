-- Verificacion de email.
--
-- El modelo EmailVerification ya existia en el schema pero no lo usaba nadie:
-- el registro creaba la cuenta sin confirmar nada. Se agrega la marca en User.

-- AlterTable
ALTER TABLE `User` ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false;

-- Los usuarios que ya existian se dan por verificados: la verificacion aplica de
-- aca en adelante y no queremos dejar afuera de un dia para el otro a gente que
-- ya venia usando la app.
UPDATE `User` SET `emailVerified` = true;
