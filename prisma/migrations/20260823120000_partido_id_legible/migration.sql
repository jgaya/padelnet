-- AlterTable
ALTER TABLE `Partido` ADD COLUMN `idLegible` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Partido_torneoId_idLegible_idx` ON `Partido`(`torneoId`, `idLegible`);
