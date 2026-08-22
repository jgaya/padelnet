-- DropForeignKey
ALTER TABLE `TurnoReserva` DROP FOREIGN KEY `TurnoReserva_jugadorId_fkey`;

-- DropForeignKey
ALTER TABLE `TurnoSlot` DROP FOREIGN KEY `TurnoSlot_canchaId_fkey`;

-- DropIndex
DROP INDEX `TurnoSlot_canchaId_startAt_endAt_key` ON `TurnoSlot`;

-- AlterTable
ALTER TABLE `ComplejoFeature` MODIFY `feature` ENUM('NOTIFICACIONES', 'LOGROS', 'TURNOS') NOT NULL;

-- AlterTable
ALTER TABLE `Partido` ADD COLUMN `duracionMin` INTEGER NULL;

-- AlterTable
ALTER TABLE `TurnoReserva` ADD COLUMN `nombreContacto` VARCHAR(191) NULL,
    ADD COLUMN `pagado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pagadoAt` DATETIME(3) NULL,
    ADD COLUMN `telefonoContacto` VARCHAR(191) NULL,
    MODIFY `jugadorId` INTEGER NULL;

-- AlterTable
ALTER TABLE `TurnoSlot` ADD COLUMN `serieId` INTEGER NULL;

-- CreateTable
CREATE TABLE `ComplejoHorario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `diaSemana` INTEGER NOT NULL,
    `aperturaMin` INTEGER NOT NULL,
    `cierreMin` INTEGER NOT NULL,
    `cerrado` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ComplejoHorario_complejoId_diaSemana_key`(`complejoId`, `diaSemana`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComplejoHorarioExcepcion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `aperturaMin` INTEGER NOT NULL,
    `cierreMin` INTEGER NOT NULL,
    `cerrado` BOOLEAN NOT NULL DEFAULT false,
    `motivo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ComplejoHorarioExcepcion_complejoId_fecha_idx`(`complejoId`, `fecha`),
    UNIQUE INDEX `ComplejoHorarioExcepcion_complejoId_fecha_key`(`complejoId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TurnoSerie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `canchaId` INTEGER NOT NULL,
    `frecuencia` ENUM('DIARIA', 'SEMANAL', 'MENSUAL') NOT NULL,
    `desde` DATE NOT NULL,
    `hasta` DATE NULL,
    `inicioMin` INTEGER NOT NULL,
    `duracionMin` INTEGER NOT NULL,
    `jugadorId` INTEGER NULL,
    `nombreContacto` VARCHAR(191) NULL,
    `telefonoContacto` VARCHAR(191) NULL,
    `notas` VARCHAR(191) NULL,
    `createdById` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TurnoSerie_complejoId_deletedAt_idx`(`complejoId`, `deletedAt`),
    INDEX `TurnoSerie_canchaId_desde_idx`(`canchaId`, `desde`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TurnoSlot_serieId_startAt_idx` ON `TurnoSlot`(`serieId`, `startAt`);

-- AddForeignKey
ALTER TABLE `ComplejoHorario` ADD CONSTRAINT `ComplejoHorario_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplejoHorarioExcepcion` ADD CONSTRAINT `ComplejoHorarioExcepcion_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoSerie` ADD CONSTRAINT `TurnoSerie_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoSerie` ADD CONSTRAINT `TurnoSerie_canchaId_fkey` FOREIGN KEY (`canchaId`) REFERENCES `Cancha`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoSerie` ADD CONSTRAINT `TurnoSerie_jugadorId_fkey` FOREIGN KEY (`jugadorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoSerie` ADD CONSTRAINT `TurnoSerie_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoSlot` ADD CONSTRAINT `TurnoSlot_serieId_fkey` FOREIGN KEY (`serieId`) REFERENCES `TurnoSerie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoReserva` ADD CONSTRAINT `TurnoReserva_jugadorId_fkey` FOREIGN KEY (`jugadorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
-- Se recrea: hubo que soltarla para poder borrar el unique
-- TurnoSlot_canchaId_startAt_endAt_key, del que MySQL se colgaba como indice de
-- la FK. Ahora la cubre TurnoSlot_canchaId_startAt_status_idx.
ALTER TABLE `TurnoSlot` ADD CONSTRAINT `TurnoSlot_canchaId_fkey` FOREIGN KEY (`canchaId`) REFERENCES `Cancha`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
