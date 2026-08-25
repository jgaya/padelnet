-- CreateTable
CREATE TABLE `ImagenPerfil` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `archivoImagen` VARCHAR(255) NOT NULL,
    `archivoAvatar` VARCHAR(255) NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
    `moderadaPorId` INTEGER NULL,
    `moderadaAt` DATETIME(3) NULL,
    `motivoRechazo` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImagenPerfil_estado_createdAt_idx`(`estado`, `createdAt`),
    INDEX `ImagenPerfil_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImagenPerfil` ADD CONSTRAINT `ImagenPerfil_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImagenPerfil` ADD CONSTRAINT `ImagenPerfil_moderadaPorId_fkey` FOREIGN KEY (`moderadaPorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
