-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `lastname` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `dni` VARCHAR(191) NULL,
    `genero` ENUM('M', 'F', 'X') NOT NULL DEFAULT 'X',
    `birthDate` DATE NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `platformRole` ENUM('USER', 'SUPERADMIN', 'SUPPORT') NOT NULL DEFAULT 'USER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_dni_key`(`dni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Complejo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `ciudad` VARCHAR(191) NOT NULL,
    `provincia` VARCHAR(191) NOT NULL,
    `pais` VARCHAR(191) NOT NULL DEFAULT 'AR',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Complejo_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComplejoMembership` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'DATAENTRY', 'FISCAL', 'STAFF') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ComplejoMembership_userId_role_idx`(`userId`, `role`),
    UNIQUE INDEX `ComplejoMembership_complejoId_userId_key`(`complejoId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerfilJugadorComplejo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `categoria` VARCHAR(191) NULL,
    `observado` BOOLEAN NOT NULL DEFAULT false,
    `isBlocked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PerfilJugadorComplejo_userId_idx`(`userId`),
    UNIQUE INDEX `PerfilJugadorComplejo_complejoId_userId_key`(`complejoId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cancha` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `name` VARCHAR(191) NULL,
    `numero` INTEGER NOT NULL,
    `superficie` VARCHAR(191) NULL,
    `isIndoor` BOOLEAN NOT NULL DEFAULT false,
    `dobles` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Cancha_complejoId_isActive_idx`(`complejoId`, `isActive`),
    UNIQUE INDEX `Cancha_complejoId_numero_key`(`complejoId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `createdById` INTEGER NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `posterUrl` VARCHAR(191) NULL,
    `tipo` ENUM('FINDE', 'SEMANAL') NOT NULL DEFAULT 'FINDE',
    `inicio` DATETIME(3) NOT NULL,
    `fin` DATETIME(3) NOT NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `isVisible` BOOLEAN NOT NULL DEFAULT false,
    `isFinished` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Evento_complejoId_inicio_idx`(`complejoId`, `inicio`),
    INDEX `Evento_isVisible_isOpen_idx`(`isVisible`, `isOpen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Torneo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventoId` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `categoriaCode` VARCHAR(191) NOT NULL,
    `comentario` VARCHAR(191) NULL,
    `capacidad` INTEGER NOT NULL DEFAULT 24,
    `status` ENUM('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'FINISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `publicado` BOOLEAN NOT NULL DEFAULT false,
    `zonaCerrada` BOOLEAN NOT NULL DEFAULT false,
    `zonaGenerada` BOOLEAN NOT NULL DEFAULT false,
    `partidosGenerados` BOOLEAN NOT NULL DEFAULT false,
    `actualizado` BOOLEAN NOT NULL DEFAULT false,
    `inicio` DATETIME(3) NULL,
    `fin` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Torneo_eventoId_status_idx`(`eventoId`, `status`),
    UNIQUE INDEX `Torneo_eventoId_nombre_key`(`eventoId`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pareja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `torneoId` INTEGER NOT NULL,
    `player1Id` INTEGER NOT NULL,
    `player2Id` INTEGER NOT NULL,
    `asignado` BOOLEAN NOT NULL DEFAULT false,
    `suplente` BOOLEAN NOT NULL DEFAULT false,
    `pago` BOOLEAN NOT NULL DEFAULT false,
    `restriccion` VARCHAR(191) NULL,
    `puntos` INTEGER NOT NULL DEFAULT 0,
    `partidoGanados` INTEGER NOT NULL DEFAULT 0,
    `partidoPerdidos` INTEGER NOT NULL DEFAULT 0,
    `setGanados` INTEGER NOT NULL DEFAULT 0,
    `setPerdidos` INTEGER NOT NULL DEFAULT 0,
    `gameGanados` INTEGER NOT NULL DEFAULT 0,
    `gamePerdidos` INTEGER NOT NULL DEFAULT 0,
    `posicionActual` INTEGER NULL,
    `posicionFinal` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Pareja_torneoId_suplente_idx`(`torneoId`, `suplente`),
    UNIQUE INDEX `Pareja_torneoId_player1Id_player2Id_key`(`torneoId`, `player1Id`, `player2Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grupo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `torneoId` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `comentario` VARCHAR(191) NULL,
    `cerrado` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Grupo_torneoId_nombre_key`(`torneoId`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GrupoPareja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grupoId` INTEGER NOT NULL,
    `parejaId` INTEGER NOT NULL,
    `seed` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GrupoPareja_grupoId_parejaId_key`(`grupoId`, `parejaId`),
    UNIQUE INDEX `GrupoPareja_grupoId_seed_key`(`grupoId`, `seed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Partido` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `torneoId` INTEGER NOT NULL,
    `grupoId` INTEGER NULL,
    `canchaId` INTEGER NULL,
    `scheduledAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'WALKOVER', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `pareja1Id` INTEGER NULL,
    `pareja2Id` INTEGER NULL,
    `ganadorId` INTEGER NULL,
    `perdedorId` INTEGER NULL,
    `walkover` BOOLEAN NOT NULL DEFAULT false,
    `fiscalizadoBy` INTEGER NULL,
    `llave` VARCHAR(191) NULL,
    `pareja1Letra` VARCHAR(191) NULL,
    `pareja2Letra` VARCHAR(191) NULL,
    `notas` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Partido_torneoId_scheduledAt_idx`(`torneoId`, `scheduledAt`),
    INDEX `Partido_canchaId_scheduledAt_idx`(`canchaId`, `scheduledAt`),
    INDEX `Partido_grupoId_scheduledAt_idx`(`grupoId`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartidoSet` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `partidoId` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `gamesPareja1` INTEGER NOT NULL,
    `gamesPareja2` INTEGER NOT NULL,
    `tiebreakP1` INTEGER NULL,
    `tiebreakP2` INTEGER NULL,

    UNIQUE INDEX `PartidoSet_partidoId_numero_key`(`partidoId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ronda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `torneoId` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ronda_torneoId_orden_idx`(`torneoId`, `orden`),
    UNIQUE INDEX `Ronda_torneoId_nombre_key`(`torneoId`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ranking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jugadorId` INTEGER NOT NULL,
    `torneoId` INTEGER NOT NULL,
    `rondaId` INTEGER NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ranking_torneoId_jugadorId_idx`(`torneoId`, `jugadorId`),
    UNIQUE INDEX `Ranking_jugadorId_torneoId_rondaId_key`(`jugadorId`, `torneoId`, `rondaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recategorizacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `jugadorId` INTEGER NOT NULL,
    `createdById` INTEGER NULL,
    `fecha` DATE NOT NULL,
    `nivelPrevio` VARCHAR(191) NOT NULL,
    `nivelNuevo` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Recategorizacion_complejoId_fecha_idx`(`complejoId`, `fecha`),
    INDEX `Recategorizacion_jugadorId_fecha_idx`(`jugadorId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TurnoSlot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `canchaId` INTEGER NOT NULL,
    `createdById` INTEGER NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `duracionMin` INTEGER NOT NULL,
    `status` ENUM('LIBRE', 'RESERVADO', 'BLOQUEADO') NOT NULL DEFAULT 'LIBRE',
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TurnoSlot_canchaId_startAt_status_idx`(`canchaId`, `startAt`, `status`),
    UNIQUE INDEX `TurnoSlot_canchaId_startAt_endAt_key`(`canchaId`, `startAt`, `endAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TurnoReserva` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `turnoSlotId` INTEGER NOT NULL,
    `jugadorId` INTEGER NOT NULL,
    `createdById` INTEGER NULL,
    `status` ENUM('CONFIRMADA', 'CANCELADA', 'NO_SHOW') NOT NULL DEFAULT 'CONFIRMADA',
    `notas` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `cancelledAt` DATETIME(3) NULL,

    UNIQUE INDEX `TurnoReserva_turnoSlotId_key`(`turnoSlotId`),
    INDEX `TurnoReserva_jugadorId_createdAt_idx`(`jugadorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sponsor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `link` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComplejoSponsor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `sponsorId` INTEGER NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ComplejoSponsor_complejoId_orden_idx`(`complejoId`, `orden`),
    UNIQUE INDEX `ComplejoSponsor_complejoId_sponsorId_key`(`complejoId`, `sponsorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Generacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejoId` INTEGER NOT NULL,
    `eventoId` INTEGER NULL,
    `torneoId` INTEGER NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `jsonData` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Generacion_complejoId_tipo_idx`(`complejoId`, `tipo`),
    INDEX `Generacion_eventoId_tipo_idx`(`eventoId`, `tipo`),
    INDEX `Generacion_torneoId_tipo_idx`(`torneoId`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailVerification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailVerification_userId_expiresAt_idx`(`userId`, `expiresAt`),
    UNIQUE INDEX `EmailVerification_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushToken` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `platform` ENUM('WEB', 'ANDROID', 'IOS') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsed` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PushToken_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `type` ENUM('MATCH_REMINDER', 'MATCH_CHANGED', 'TOURNAMENT_START', 'SYSTEM') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `scheduledAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ComplejoMembership` ADD CONSTRAINT `ComplejoMembership_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplejoMembership` ADD CONSTRAINT `ComplejoMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerfilJugadorComplejo` ADD CONSTRAINT `PerfilJugadorComplejo_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerfilJugadorComplejo` ADD CONSTRAINT `PerfilJugadorComplejo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cancha` ADD CONSTRAINT `Cancha_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evento` ADD CONSTRAINT `Evento_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evento` ADD CONSTRAINT `Evento_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Torneo` ADD CONSTRAINT `Torneo_eventoId_fkey` FOREIGN KEY (`eventoId`) REFERENCES `Evento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pareja` ADD CONSTRAINT `Pareja_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `Torneo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pareja` ADD CONSTRAINT `Pareja_player1Id_fkey` FOREIGN KEY (`player1Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pareja` ADD CONSTRAINT `Pareja_player2Id_fkey` FOREIGN KEY (`player2Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grupo` ADD CONSTRAINT `Grupo_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `Torneo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GrupoPareja` ADD CONSTRAINT `GrupoPareja_grupoId_fkey` FOREIGN KEY (`grupoId`) REFERENCES `Grupo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GrupoPareja` ADD CONSTRAINT `GrupoPareja_parejaId_fkey` FOREIGN KEY (`parejaId`) REFERENCES `Pareja`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partido` ADD CONSTRAINT `Partido_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `Torneo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partido` ADD CONSTRAINT `Partido_grupoId_fkey` FOREIGN KEY (`grupoId`) REFERENCES `Grupo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partido` ADD CONSTRAINT `Partido_canchaId_fkey` FOREIGN KEY (`canchaId`) REFERENCES `Cancha`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partido` ADD CONSTRAINT `Partido_pareja1Id_fkey` FOREIGN KEY (`pareja1Id`) REFERENCES `Pareja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partido` ADD CONSTRAINT `Partido_pareja2Id_fkey` FOREIGN KEY (`pareja2Id`) REFERENCES `Pareja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partido` ADD CONSTRAINT `Partido_ganadorId_fkey` FOREIGN KEY (`ganadorId`) REFERENCES `Pareja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partido` ADD CONSTRAINT `Partido_perdedorId_fkey` FOREIGN KEY (`perdedorId`) REFERENCES `Pareja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartidoSet` ADD CONSTRAINT `PartidoSet_partidoId_fkey` FOREIGN KEY (`partidoId`) REFERENCES `Partido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ronda` ADD CONSTRAINT `Ronda_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `Torneo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ranking` ADD CONSTRAINT `Ranking_jugadorId_fkey` FOREIGN KEY (`jugadorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ranking` ADD CONSTRAINT `Ranking_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `Torneo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ranking` ADD CONSTRAINT `Ranking_rondaId_fkey` FOREIGN KEY (`rondaId`) REFERENCES `Ronda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recategorizacion` ADD CONSTRAINT `Recategorizacion_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recategorizacion` ADD CONSTRAINT `Recategorizacion_jugadorId_fkey` FOREIGN KEY (`jugadorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recategorizacion` ADD CONSTRAINT `Recategorizacion_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoSlot` ADD CONSTRAINT `TurnoSlot_canchaId_fkey` FOREIGN KEY (`canchaId`) REFERENCES `Cancha`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoSlot` ADD CONSTRAINT `TurnoSlot_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoReserva` ADD CONSTRAINT `TurnoReserva_turnoSlotId_fkey` FOREIGN KEY (`turnoSlotId`) REFERENCES `TurnoSlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoReserva` ADD CONSTRAINT `TurnoReserva_jugadorId_fkey` FOREIGN KEY (`jugadorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnoReserva` ADD CONSTRAINT `TurnoReserva_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplejoSponsor` ADD CONSTRAINT `ComplejoSponsor_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplejoSponsor` ADD CONSTRAINT `ComplejoSponsor_sponsorId_fkey` FOREIGN KEY (`sponsorId`) REFERENCES `Sponsor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Generacion` ADD CONSTRAINT `Generacion_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `Complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Generacion` ADD CONSTRAINT `Generacion_eventoId_fkey` FOREIGN KEY (`eventoId`) REFERENCES `Evento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Generacion` ADD CONSTRAINT `Generacion_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `Torneo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailVerification` ADD CONSTRAINT `EmailVerification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushToken` ADD CONSTRAINT `PushToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
