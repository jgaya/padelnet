-- CreateTable
CREATE TABLE `Auditoria` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tabla` VARCHAR(64) NOT NULL,
    `accion` ENUM('CREAR', 'ACTUALIZAR', 'BORRAR', 'MASIVA') NOT NULL,
    `registroId` VARCHAR(64) NULL,
    `actorId` INTEGER NULL,
    `actorNombre` VARCHAR(160) NULL,
    `actorEmail` VARCHAR(160) NULL,
    `origen` VARCHAR(16) NOT NULL,
    `cambios` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Auditoria_tabla_registroId_createdAt_idx`(`tabla`, `registroId`, `createdAt`),
    INDEX `Auditoria_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `Auditoria_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Auditoria` ADD CONSTRAINT `Auditoria_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
