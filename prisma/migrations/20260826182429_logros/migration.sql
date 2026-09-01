-- CreateTable
CREATE TABLE `Logro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(48) NOT NULL,
    `titulo` VARCHAR(80) NOT NULL,
    `descripcion` VARCHAR(200) NOT NULL,
    `icono` VARCHAR(200) NULL,
    `rareza` ENUM('COMUN', 'POCO_COMUN', 'RARO', 'EPICO', 'LEGENDARIO') NOT NULL,
    `progresoObjetivo` INTEGER NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Logro_codigo_key`(`codigo`),
    INDEX `Logro_activo_orden_idx`(`activo`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogroUsuario` (
    `userId` INTEGER NOT NULL,
    `logroId` INTEGER NOT NULL,
    `progreso` INTEGER NOT NULL DEFAULT 0,
    `obtenidoAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LogroUsuario_userId_obtenidoAt_idx`(`userId`, `obtenidoAt`),
    PRIMARY KEY (`userId`, `logroId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LogroUsuario` ADD CONSTRAINT `LogroUsuario_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogroUsuario` ADD CONSTRAINT `LogroUsuario_logroId_fkey` FOREIGN KEY (`logroId`) REFERENCES `Logro`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
