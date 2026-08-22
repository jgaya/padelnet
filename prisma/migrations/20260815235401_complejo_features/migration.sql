-- CreateTable
CREATE TABLE `ComplejoFeature` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `feature` ENUM('NOTIFICACIONES', 'LOGROS') NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ComplejoFeature_feature_enabled_idx`(`feature`, `enabled`),
    UNIQUE INDEX `ComplejoFeature_complejoId_feature_key`(`complejoId`, `feature`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ComplejoFeature` ADD CONSTRAINT `ComplejoFeature_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplejoFeature` ADD CONSTRAINT `ComplejoFeature_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

