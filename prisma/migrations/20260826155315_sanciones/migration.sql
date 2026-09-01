-- CreateTable
CREATE TABLE `Sancion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `jugadorId` INTEGER NOT NULL,
    `desde` DATE NOT NULL,
    `hasta` DATE NOT NULL,
    `motivo` TEXT NOT NULL,
    `estado` ENUM('VIGENTE', 'ANULADA') NOT NULL DEFAULT 'VIGENTE',
    `creadaPorId` INTEGER NULL,
    `anuladaPorId` INTEGER NULL,
    `anuladaAt` DATETIME(3) NULL,
    `motivoAnulacion` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Sancion_complejoId_jugadorId_estado_idx`(`complejoId`, `jugadorId`, `estado`),
    INDEX `Sancion_complejoId_desde_idx`(`complejoId`, `desde`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Sancion` ADD CONSTRAINT `Sancion_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sancion` ADD CONSTRAINT `Sancion_jugadorId_fkey` FOREIGN KEY (`jugadorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sancion` ADD CONSTRAINT `Sancion_creadaPorId_fkey` FOREIGN KEY (`creadaPorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sancion` ADD CONSTRAINT `Sancion_anuladaPorId_fkey` FOREIGN KEY (`anuladaPorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
