CREATE DATABASE  IF NOT EXISTS `padelnet` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `padelnet`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: padelnet
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('39be2fa8-1994-4027-aff6-6be20679e51e','1e447047a0b5b05602e8ebb019ad3f438c96061f130478aa2022b150620a4085','2026-03-08 21:34:37.025','20260308103000_user_categoria_optional',NULL,NULL,'2026-03-08 21:34:36.925',1),('74e6fb45-28c1-4578-a342-a13018f08f51','5eb4f7f4c5dddf14ec19462f7466914343a4425c0026ac7ef33b6e3fccdc817e','2026-03-04 19:52:39.654','20260304150000_torneo_rules',NULL,NULL,'2026-03-04 19:52:39.545',1),('a603716c-97a6-40d2-991d-589cae6e969b','1d752438243608f6a449a8668fd7e57865d94280d567ef8dd54eb520797f68c1','2026-03-10 23:56:20.699','20260310235620_torneo_update',NULL,NULL,'2026-03-10 23:56:20.590',1),('ecbf2349-95ad-469d-8dff-f568b725a282','5236afc51c892fb2e2f2f85e7b8c282d987cae6525c9c8f57d5c89f32880d62b','2026-03-01 20:29:26.763','20260301202922_padelnet',NULL,NULL,'2026-03-01 20:29:22.840',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cancha`
--

DROP TABLE IF EXISTS `cancha`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cancha` (
  `id` int NOT NULL AUTO_INCREMENT,
  `complejoId` int NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero` int NOT NULL,
  `superficie` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isIndoor` tinyint(1) NOT NULL DEFAULT '0',
  `dobles` tinyint(1) NOT NULL DEFAULT '1',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `deletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Cancha_complejoId_numero_key` (`complejoId`,`numero`),
  KEY `Cancha_complejoId_isActive_idx` (`complejoId`,`isActive`),
  CONSTRAINT `Cancha_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `complejo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cancha`
--

LOCK TABLES `cancha` WRITE;
/*!40000 ALTER TABLE `cancha` DISABLE KEYS */;
INSERT INTO `cancha` VALUES (1,1,'Rod Laver',1,NULL,1,1,1,NULL,'2026-03-04 01:29:23.411','2026-03-04 01:29:23.411'),(2,1,'la 2',2,NULL,1,1,1,NULL,'2026-07-01 20:24:07.802','2026-07-01 20:24:07.802'),(3,1,'La vencida',3,NULL,1,1,1,NULL,'2026-07-29 00:18:20.449','2026-07-29 00:18:20.449');
/*!40000 ALTER TABLE `cancha` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `complejo`
--

DROP TABLE IF EXISTS `complejo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `complejo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provincia` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pais` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AR',
  `timezone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `deletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Complejo_slug_key` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `complejo`
--

LOCK TABLES `complejo` WRITE;
/*!40000 ALTER TABLE `complejo` DISABLE KEYS */;
INSERT INTO `complejo` VALUES (1,'PadelComplex','padelcomplex','padel@complex.com','0249154051094','Calle Falsa 123','Tandil','Buenos Aires','AR','America/Argentina/Buenos_Aires',1,NULL,'2026-03-02 18:47:52.453','2026-03-02 18:47:52.453');
/*!40000 ALTER TABLE `complejo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `complejomembership`
--

DROP TABLE IF EXISTS `complejomembership`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `complejomembership` (
  `id` int NOT NULL AUTO_INCREMENT,
  `complejoId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('OWNER','ADMIN','DATAENTRY','FISCAL','STAFF') COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ComplejoMembership_complejoId_userId_key` (`complejoId`,`userId`),
  KEY `ComplejoMembership_userId_role_idx` (`userId`,`role`),
  CONSTRAINT `ComplejoMembership_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `complejo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ComplejoMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `complejomembership`
--

LOCK TABLES `complejomembership` WRITE;
/*!40000 ALTER TABLE `complejomembership` DISABLE KEYS */;
INSERT INTO `complejomembership` VALUES (1,1,7,'ADMIN',1,'2026-06-26 14:49:45.650','2026-06-26 14:49:45.650');
/*!40000 ALTER TABLE `complejomembership` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `complejosponsor`
--

DROP TABLE IF EXISTS `complejosponsor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `complejosponsor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `complejoId` int NOT NULL,
  `sponsorId` int NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ComplejoSponsor_complejoId_sponsorId_key` (`complejoId`,`sponsorId`),
  KEY `ComplejoSponsor_complejoId_orden_idx` (`complejoId`,`orden`),
  KEY `ComplejoSponsor_sponsorId_fkey` (`sponsorId`),
  CONSTRAINT `ComplejoSponsor_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `complejo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ComplejoSponsor_sponsorId_fkey` FOREIGN KEY (`sponsorId`) REFERENCES `sponsor` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `complejosponsor`
--

LOCK TABLES `complejosponsor` WRITE;
/*!40000 ALTER TABLE `complejosponsor` DISABLE KEYS */;
/*!40000 ALTER TABLE `complejosponsor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emailverification`
--

DROP TABLE IF EXISTS `emailverification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emailverification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `token` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `usedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `EmailVerification_token_key` (`token`),
  KEY `EmailVerification_userId_expiresAt_idx` (`userId`,`expiresAt`),
  CONSTRAINT `EmailVerification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emailverification`
--

LOCK TABLES `emailverification` WRITE;
/*!40000 ALTER TABLE `emailverification` DISABLE KEYS */;
/*!40000 ALTER TABLE `emailverification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evento`
--

DROP TABLE IF EXISTS `evento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `complejoId` int NOT NULL,
  `createdById` int DEFAULT NULL,
  `nombre` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `posterUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` enum('FINDE','SEMANAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'FINDE',
  `inicio` datetime(3) NOT NULL,
  `fin` datetime(3) NOT NULL,
  `isOpen` tinyint(1) NOT NULL DEFAULT '1',
  `isVisible` tinyint(1) NOT NULL DEFAULT '0',
  `isFinished` tinyint(1) NOT NULL DEFAULT '0',
  `deletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Evento_complejoId_inicio_idx` (`complejoId`,`inicio`),
  KEY `Evento_isVisible_isOpen_idx` (`isVisible`,`isOpen`),
  KEY `Evento_createdById_fkey` (`createdById`),
  CONSTRAINT `Evento_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `complejo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Evento_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evento`
--

LOCK TABLES `evento` WRITE;
/*!40000 ALTER TABLE `evento` DISABLE KEYS */;
INSERT INTO `evento` VALUES (1,1,1,'Pares 1','prueba',NULL,'FINDE','2026-03-27 15:00:00.000','2026-03-31 02:59:00.000',1,1,0,NULL,'2026-03-04 19:08:08.468','2026-03-04 19:08:08.468');
/*!40000 ALTER TABLE `evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `generacion`
--

DROP TABLE IF EXISTS `generacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `generacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `complejoId` int NOT NULL,
  `eventoId` int DEFAULT NULL,
  `torneoId` int DEFAULT NULL,
  `tipo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jsonData` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Generacion_complejoId_tipo_idx` (`complejoId`,`tipo`),
  KEY `Generacion_eventoId_tipo_idx` (`eventoId`,`tipo`),
  KEY `Generacion_torneoId_tipo_idx` (`torneoId`,`tipo`),
  CONSTRAINT `Generacion_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `complejo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Generacion_eventoId_fkey` FOREIGN KEY (`eventoId`) REFERENCES `evento` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Generacion_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `torneo` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `generacion`
--

LOCK TABLES `generacion` WRITE;
/*!40000 ALTER TABLE `generacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `generacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grupo`
--

DROP TABLE IF EXISTS `grupo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `torneoId` int NOT NULL,
  `nombre` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `comentario` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cerrado` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Grupo_torneoId_nombre_key` (`torneoId`,`nombre`),
  CONSTRAINT `Grupo_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `torneo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grupo`
--

LOCK TABLES `grupo` WRITE;
/*!40000 ALTER TABLE `grupo` DISABLE KEYS */;
INSERT INTO `grupo` VALUES (1,1,'Zona A',NULL,0,'2026-06-30 02:27:24.302','2026-07-29 00:16:59.994'),(2,1,'Zona B',NULL,0,'2026-06-30 02:27:24.310','2026-07-29 00:17:00.002'),(3,1,'Zona C',NULL,0,'2026-06-30 02:27:24.312','2026-07-29 00:17:00.006'),(4,1,'Zona D',NULL,0,'2026-06-30 02:27:24.315','2026-07-29 00:17:00.008'),(5,1,'Zona E',NULL,0,'2026-06-30 02:27:24.320','2026-07-29 00:17:00.011'),(6,1,'Zona F',NULL,0,'2026-06-30 02:27:24.322','2026-07-29 00:17:00.020'),(7,1,'Zona G',NULL,0,'2026-06-30 02:27:24.324','2026-07-29 00:17:00.023'),(8,1,'Zona H',NULL,0,'2026-06-30 02:27:24.326','2026-07-29 00:17:00.026'),(9,1,'Zona I',NULL,0,'2026-06-30 02:27:24.328','2026-07-29 00:17:00.029'),(10,1,'Zona J',NULL,0,'2026-06-30 02:27:24.330','2026-07-29 00:17:00.035'),(11,1,'Zona K',NULL,0,'2026-06-30 02:27:24.332','2026-07-29 00:17:00.038');
/*!40000 ALTER TABLE `grupo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grupopareja`
--

DROP TABLE IF EXISTS `grupopareja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupopareja` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupoId` int NOT NULL,
  `parejaId` int NOT NULL,
  `seed` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `GrupoPareja_grupoId_parejaId_key` (`grupoId`,`parejaId`),
  UNIQUE KEY `GrupoPareja_grupoId_seed_key` (`grupoId`,`seed`),
  KEY `GrupoPareja_parejaId_fkey` (`parejaId`),
  CONSTRAINT `GrupoPareja_grupoId_fkey` FOREIGN KEY (`grupoId`) REFERENCES `grupo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GrupoPareja_parejaId_fkey` FOREIGN KEY (`parejaId`) REFERENCES `pareja` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grupopareja`
--

LOCK TABLES `grupopareja` WRITE;
/*!40000 ALTER TABLE `grupopareja` DISABLE KEYS */;
INSERT INTO `grupopareja` VALUES (33,1,2,1,'2026-07-29 00:17:00.045'),(34,1,15,2,'2026-07-29 00:17:00.045'),(35,1,1,3,'2026-07-29 00:17:00.045'),(36,2,26,1,'2026-07-29 00:17:00.055'),(37,2,27,2,'2026-07-29 00:17:00.055'),(38,2,24,3,'2026-07-29 00:17:00.055'),(39,3,6,1,'2026-07-29 00:17:00.058'),(40,3,21,2,'2026-07-29 00:17:00.058'),(41,3,25,3,'2026-07-29 00:17:00.058'),(42,4,3,1,'2026-07-29 00:17:00.060'),(43,4,10,2,'2026-07-29 00:17:00.060'),(44,4,14,3,'2026-07-29 00:17:00.060'),(45,5,28,1,'2026-07-29 00:17:00.063'),(46,5,11,2,'2026-07-29 00:17:00.063'),(47,5,23,3,'2026-07-29 00:17:00.063'),(48,6,4,1,'2026-07-29 00:17:00.069'),(49,6,32,2,'2026-07-29 00:17:00.069'),(50,6,12,3,'2026-07-29 00:17:00.069'),(51,7,22,1,'2026-07-29 00:17:00.073'),(52,7,30,2,'2026-07-29 00:17:00.073'),(53,7,20,3,'2026-07-29 00:17:00.073'),(54,8,8,1,'2026-07-29 00:17:00.076'),(55,8,31,2,'2026-07-29 00:17:00.076'),(56,8,29,3,'2026-07-29 00:17:00.076'),(57,9,7,1,'2026-07-29 00:17:00.085'),(58,9,9,2,'2026-07-29 00:17:00.085'),(59,9,5,3,'2026-07-29 00:17:00.085'),(60,10,16,1,'2026-07-29 00:17:00.089'),(61,10,19,2,'2026-07-29 00:17:00.089'),(62,10,17,3,'2026-07-29 00:17:00.089'),(63,11,13,1,'2026-07-29 00:17:00.092'),(64,11,18,2,'2026-07-29 00:17:00.092'),(65,11,33,3,'2026-07-29 00:17:00.092');
/*!40000 ALTER TABLE `grupopareja` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` int NOT NULL,
  `type` enum('MATCH_REMINDER','MATCH_CHANGED','TOURNAMENT_START','SYSTEM') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheduledAt` datetime(3) DEFAULT NULL,
  `sentAt` datetime(3) DEFAULT NULL,
  `status` enum('PENDING','SENT','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `metadata` json DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Notification_userId_status_createdAt_idx` (`userId`,`status`,`createdAt`),
  CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification`
--

LOCK TABLES `notification` WRITE;
/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pareja`
--

DROP TABLE IF EXISTS `pareja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pareja` (
  `id` int NOT NULL AUTO_INCREMENT,
  `torneoId` int NOT NULL,
  `player1Id` int NOT NULL,
  `player2Id` int NOT NULL,
  `asignado` tinyint(1) NOT NULL DEFAULT '0',
  `suplente` tinyint(1) NOT NULL DEFAULT '0',
  `pago` tinyint(1) NOT NULL DEFAULT '0',
  `restriccion` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `puntos` int NOT NULL DEFAULT '0',
  `partidoGanados` int NOT NULL DEFAULT '0',
  `partidoPerdidos` int NOT NULL DEFAULT '0',
  `setGanados` int NOT NULL DEFAULT '0',
  `setPerdidos` int NOT NULL DEFAULT '0',
  `gameGanados` int NOT NULL DEFAULT '0',
  `gamePerdidos` int NOT NULL DEFAULT '0',
  `posicionActual` int DEFAULT NULL,
  `posicionFinal` int DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Pareja_torneoId_player1Id_player2Id_key` (`torneoId`,`player1Id`,`player2Id`),
  KEY `Pareja_torneoId_suplente_idx` (`torneoId`,`suplente`),
  KEY `Pareja_player1Id_fkey` (`player1Id`),
  KEY `Pareja_player2Id_fkey` (`player2Id`),
  CONSTRAINT `Pareja_player1Id_fkey` FOREIGN KEY (`player1Id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Pareja_player2Id_fkey` FOREIGN KEY (`player2Id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Pareja_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `torneo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pareja`
--

LOCK TABLES `pareja` WRITE;
/*!40000 ALTER TABLE `pareja` DISABLE KEYS */;
INSERT INTO `pareja` VALUES (1,1,7,9,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-08 23:08:31.098','2026-03-08 23:08:31.098'),(2,1,10,11,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(3,1,12,13,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(4,1,14,15,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(5,1,16,17,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(6,1,18,19,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(7,1,20,21,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(8,1,22,23,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(9,1,24,25,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(10,1,26,27,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(11,1,28,29,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(12,1,30,31,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(13,1,32,33,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(14,1,34,35,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(15,1,36,37,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(16,1,38,39,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(17,1,40,41,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(18,1,42,43,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(19,1,44,45,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(20,1,46,47,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(21,1,48,49,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(22,1,50,51,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(23,1,52,53,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(24,1,54,55,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(25,1,56,57,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(26,1,58,59,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(27,1,60,61,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(28,1,62,63,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(29,1,64,65,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(30,1,66,67,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(31,1,68,69,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(32,1,70,71,1,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(33,1,72,73,1,1,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000');
/*!40000 ALTER TABLE `pareja` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partido`
--

DROP TABLE IF EXISTS `partido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partido` (
  `id` int NOT NULL AUTO_INCREMENT,
  `torneoId` int NOT NULL,
  `grupoId` int DEFAULT NULL,
  `canchaId` int DEFAULT NULL,
  `scheduledAt` datetime(3) DEFAULT NULL,
  `status` enum('PENDING','SCHEDULED','IN_PROGRESS','FINISHED','WALKOVER','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `pareja1Id` int DEFAULT NULL,
  `pareja2Id` int DEFAULT NULL,
  `ganadorId` int DEFAULT NULL,
  `perdedorId` int DEFAULT NULL,
  `walkover` tinyint(1) NOT NULL DEFAULT '0',
  `fiscalizadoBy` int DEFAULT NULL,
  `llave` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pareja1Letra` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pareja2Letra` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notas` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Partido_torneoId_scheduledAt_idx` (`torneoId`,`scheduledAt`),
  KEY `Partido_canchaId_scheduledAt_idx` (`canchaId`,`scheduledAt`),
  KEY `Partido_grupoId_scheduledAt_idx` (`grupoId`,`scheduledAt`),
  KEY `Partido_pareja1Id_fkey` (`pareja1Id`),
  KEY `Partido_pareja2Id_fkey` (`pareja2Id`),
  KEY `Partido_ganadorId_fkey` (`ganadorId`),
  KEY `Partido_perdedorId_fkey` (`perdedorId`),
  CONSTRAINT `Partido_canchaId_fkey` FOREIGN KEY (`canchaId`) REFERENCES `cancha` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Partido_ganadorId_fkey` FOREIGN KEY (`ganadorId`) REFERENCES `pareja` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Partido_grupoId_fkey` FOREIGN KEY (`grupoId`) REFERENCES `grupo` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Partido_pareja1Id_fkey` FOREIGN KEY (`pareja1Id`) REFERENCES `pareja` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Partido_pareja2Id_fkey` FOREIGN KEY (`pareja2Id`) REFERENCES `pareja` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Partido_perdedorId_fkey` FOREIGN KEY (`perdedorId`) REFERENCES `pareja` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Partido_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `torneo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partido`
--

LOCK TABLES `partido` WRITE;
/*!40000 ALTER TABLE `partido` DISABLE KEYS */;
INSERT INTO `partido` VALUES (1,1,4,1,'2026-03-27 12:00:00.000','SCHEDULED',3,14,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.212','2026-08-05 02:46:17.212'),(2,1,7,2,'2026-03-27 12:00:00.000','SCHEDULED',30,20,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.226','2026-08-05 02:46:17.226'),(3,1,5,3,'2026-03-27 12:00:00.000','SCHEDULED',11,23,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.229','2026-08-05 02:46:17.229'),(4,1,9,1,'2026-03-27 13:15:00.000','SCHEDULED',9,5,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.232','2026-08-05 02:46:17.232'),(5,1,1,2,'2026-03-27 13:15:00.000','SCHEDULED',2,15,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.236','2026-08-05 02:46:17.236'),(6,1,2,3,'2026-03-27 13:15:00.000','SCHEDULED',27,24,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.240','2026-08-05 02:46:17.240'),(7,1,10,1,'2026-03-27 14:30:00.000','SCHEDULED',16,19,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.243','2026-08-05 02:46:17.243'),(8,1,11,2,'2026-03-27 14:30:00.000','SCHEDULED',13,33,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.245','2026-08-05 02:46:17.245'),(9,1,3,3,'2026-03-27 14:30:00.000','SCHEDULED',6,25,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.247','2026-08-05 02:46:17.247'),(10,1,8,1,'2026-03-27 15:45:00.000','SCHEDULED',31,29,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.250','2026-08-05 02:46:17.250'),(11,1,6,2,'2026-03-27 15:45:00.000','SCHEDULED',4,12,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.252','2026-08-05 02:46:17.252'),(12,1,7,1,'2026-03-28 12:00:00.000','SCHEDULED',22,30,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.255','2026-08-05 02:46:17.255'),(13,1,10,2,'2026-03-28 12:00:00.000','SCHEDULED',19,17,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.258','2026-08-05 02:46:17.258'),(14,1,11,3,'2026-03-28 12:00:00.000','SCHEDULED',18,33,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.260','2026-08-05 02:46:17.260'),(15,1,5,1,'2026-03-28 13:15:00.000','SCHEDULED',28,11,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.263','2026-08-05 02:46:17.263'),(16,1,2,2,'2026-03-28 13:15:00.000','SCHEDULED',26,27,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.266','2026-08-05 02:46:17.266'),(17,1,4,3,'2026-03-28 13:15:00.000','SCHEDULED',10,14,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.268','2026-08-05 02:46:17.268'),(18,1,10,1,'2026-03-28 14:30:00.000','SCHEDULED',16,17,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.272','2026-08-05 02:46:17.272'),(19,1,7,2,'2026-03-28 14:30:00.000','SCHEDULED',22,20,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.274','2026-08-05 02:46:17.274'),(20,1,9,3,'2026-03-28 14:30:00.000','SCHEDULED',7,9,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.276','2026-08-05 02:46:17.276'),(21,1,11,1,'2026-03-28 15:45:00.000','SCHEDULED',13,18,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.279','2026-08-05 02:46:17.279'),(22,1,4,2,'2026-03-28 15:45:00.000','SCHEDULED',3,10,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.282','2026-08-05 02:46:17.282'),(23,1,3,3,'2026-03-28 15:45:00.000','SCHEDULED',6,21,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.284','2026-08-05 02:46:17.284'),(24,1,9,1,'2026-03-28 17:00:00.000','SCHEDULED',7,5,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.288','2026-08-05 02:46:17.288'),(25,1,8,2,'2026-03-28 17:00:00.000','SCHEDULED',8,29,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.291','2026-08-05 02:46:17.291'),(26,1,6,3,'2026-03-28 17:00:00.000','SCHEDULED',4,32,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.293','2026-08-05 02:46:17.293'),(27,1,1,1,'2026-03-28 18:15:00.000','SCHEDULED',2,1,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.296','2026-08-05 02:46:17.296'),(28,1,3,2,'2026-03-28 18:15:00.000','SCHEDULED',21,25,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.298','2026-08-05 02:46:17.298'),(29,1,5,3,'2026-03-28 18:15:00.000','FINISHED',28,23,28,23,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.301','2026-08-05 03:44:07.362'),(30,1,6,1,'2026-03-28 19:30:00.000','SCHEDULED',32,12,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.303','2026-08-05 02:46:17.303'),(31,1,8,2,'2026-03-28 19:30:00.000','SCHEDULED',8,31,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.306','2026-08-05 02:46:17.306'),(32,1,2,3,'2026-03-28 19:30:00.000','SCHEDULED',26,24,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.310','2026-08-05 02:46:17.310'),(33,1,1,1,'2026-03-28 20:45:00.000','SCHEDULED',15,1,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.312','2026-08-05 02:46:17.312'),(34,1,NULL,1,'2026-03-28 23:15:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.315','2026-08-05 02:46:17.315'),(35,1,NULL,2,'2026-03-28 23:15:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.317','2026-08-05 02:46:17.317'),(36,1,NULL,3,'2026-03-28 23:15:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.320','2026-08-05 02:46:17.320'),(37,1,NULL,1,'2026-03-29 00:30:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.323','2026-08-05 02:46:17.323'),(38,1,NULL,2,'2026-03-29 00:30:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.325','2026-08-05 02:46:17.325'),(39,1,NULL,3,'2026-03-29 00:30:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.328','2026-08-05 02:46:17.328'),(40,1,NULL,1,'2026-03-29 12:00:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.331','2026-08-05 02:46:17.331'),(41,1,NULL,2,'2026-03-29 12:00:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.334','2026-08-05 02:46:17.334'),(42,1,NULL,3,'2026-03-29 12:00:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.337','2026-08-05 02:46:17.337'),(43,1,NULL,1,'2026-03-29 13:15:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.340','2026-08-05 02:46:17.340'),(44,1,NULL,2,'2026-03-29 13:15:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.343','2026-08-05 02:46:17.343'),(45,1,NULL,1,'2026-03-29 15:45:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.346','2026-08-05 02:46:17.346'),(46,1,NULL,2,'2026-03-29 15:45:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.348','2026-08-05 02:46:17.348'),(47,1,NULL,3,'2026-03-29 15:45:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.351','2026-08-05 02:46:17.351'),(48,1,NULL,1,'2026-03-29 17:00:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.353','2026-08-05 02:46:17.353'),(49,1,NULL,2,'2026-03-29 17:00:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.356','2026-08-05 02:46:17.356'),(50,1,NULL,3,'2026-03-29 17:00:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.358','2026-08-05 02:46:17.358'),(51,1,NULL,1,'2026-03-29 18:15:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.361','2026-08-05 02:46:17.361'),(52,1,NULL,2,'2026-03-29 18:15:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.363','2026-08-05 02:46:17.363'),(53,1,NULL,1,'2026-03-29 20:45:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.366','2026-08-05 02:46:17.366'),(54,1,NULL,2,'2026-03-29 20:45:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.368','2026-08-05 02:46:17.368'),(55,1,NULL,3,'2026-03-29 20:45:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.371','2026-08-05 02:46:17.371'),(56,1,NULL,1,'2026-03-29 22:00:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.374','2026-08-05 02:46:17.374'),(57,1,NULL,1,'2026-03-30 00:30:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.377','2026-08-05 02:46:17.377'),(58,1,NULL,2,'2026-03-30 00:30:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.380','2026-08-05 02:46:17.380'),(59,1,NULL,1,'2026-03-30 12:00:00.000','SCHEDULED',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 02:46:17.382','2026-08-05 02:46:17.382');
/*!40000 ALTER TABLE `partido` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidoset`
--

DROP TABLE IF EXISTS `partidoset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partidoset` (
  `id` int NOT NULL AUTO_INCREMENT,
  `partidoId` int NOT NULL,
  `numero` int NOT NULL,
  `gamesPareja1` int NOT NULL,
  `gamesPareja2` int NOT NULL,
  `tiebreakP1` int DEFAULT NULL,
  `tiebreakP2` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PartidoSet_partidoId_numero_key` (`partidoId`,`numero`),
  CONSTRAINT `PartidoSet_partidoId_fkey` FOREIGN KEY (`partidoId`) REFERENCES `partido` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidoset`
--

LOCK TABLES `partidoset` WRITE;
/*!40000 ALTER TABLE `partidoset` DISABLE KEYS */;
INSERT INTO `partidoset` VALUES (1,29,1,6,2,NULL,NULL),(2,29,2,6,4,NULL,NULL),(3,29,3,0,0,NULL,NULL);
/*!40000 ALTER TABLE `partidoset` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `perfiljugadorcomplejo`
--

DROP TABLE IF EXISTS `perfiljugadorcomplejo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `perfiljugadorcomplejo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `complejoId` int NOT NULL,
  `userId` int NOT NULL,
  `categoria` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observado` tinyint(1) NOT NULL DEFAULT '0',
  `isBlocked` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PerfilJugadorComplejo_complejoId_userId_key` (`complejoId`,`userId`),
  KEY `PerfilJugadorComplejo_userId_idx` (`userId`),
  CONSTRAINT `PerfilJugadorComplejo_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `complejo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PerfilJugadorComplejo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `perfiljugadorcomplejo`
--

LOCK TABLES `perfiljugadorcomplejo` WRITE;
/*!40000 ALTER TABLE `perfiljugadorcomplejo` DISABLE KEYS */;
INSERT INTO `perfiljugadorcomplejo` VALUES (1,1,10,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(2,1,11,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(3,1,12,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(4,1,13,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(5,1,14,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(6,1,15,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(7,1,16,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(8,1,17,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(9,1,18,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(10,1,19,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(11,1,20,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(12,1,21,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(13,1,22,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(14,1,23,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(15,1,24,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(16,1,25,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(17,1,26,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(18,1,27,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(19,1,28,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(20,1,29,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(21,1,30,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(22,1,31,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(23,1,32,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(24,1,33,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(25,1,34,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(26,1,35,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(27,1,36,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(28,1,37,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(29,1,38,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(30,1,39,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(31,1,40,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(32,1,41,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(33,1,42,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(34,1,43,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(35,1,44,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(36,1,45,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(37,1,46,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(38,1,47,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(39,1,48,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(40,1,49,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(41,1,50,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(42,1,51,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(43,1,52,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(44,1,53,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(45,1,54,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(46,1,55,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(47,1,56,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(48,1,57,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(49,1,58,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(50,1,59,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(51,1,60,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(52,1,61,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(53,1,62,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(54,1,63,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(55,1,64,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(56,1,65,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(57,1,66,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(58,1,67,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(59,1,68,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(60,1,69,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(61,1,70,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(62,1,71,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(63,1,72,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000'),(64,1,73,'7ma',0,0,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000');
/*!40000 ALTER TABLE `perfiljugadorcomplejo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pushtoken`
--

DROP TABLE IF EXISTS `pushtoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pushtoken` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` int DEFAULT NULL,
  `platform` enum('WEB','ANDROID','IOS') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastUsed` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PushToken_token_key` (`token`),
  KEY `PushToken_userId_fkey` (`userId`),
  CONSTRAINT `PushToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pushtoken`
--

LOCK TABLES `pushtoken` WRITE;
/*!40000 ALTER TABLE `pushtoken` DISABLE KEYS */;
/*!40000 ALTER TABLE `pushtoken` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ranking`
--

DROP TABLE IF EXISTS `ranking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ranking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugadorId` int NOT NULL,
  `torneoId` int NOT NULL,
  `rondaId` int NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Ranking_jugadorId_torneoId_rondaId_key` (`jugadorId`,`torneoId`,`rondaId`),
  KEY `Ranking_torneoId_jugadorId_idx` (`torneoId`,`jugadorId`),
  KEY `Ranking_rondaId_fkey` (`rondaId`),
  CONSTRAINT `Ranking_jugadorId_fkey` FOREIGN KEY (`jugadorId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Ranking_rondaId_fkey` FOREIGN KEY (`rondaId`) REFERENCES `ronda` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Ranking_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `torneo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ranking`
--

LOCK TABLES `ranking` WRITE;
/*!40000 ALTER TABLE `ranking` DISABLE KEYS */;
/*!40000 ALTER TABLE `ranking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recategorizacion`
--

DROP TABLE IF EXISTS `recategorizacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recategorizacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `complejoId` int NOT NULL,
  `jugadorId` int NOT NULL,
  `createdById` int DEFAULT NULL,
  `fecha` date NOT NULL,
  `nivelPrevio` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivelNuevo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Recategorizacion_complejoId_fecha_idx` (`complejoId`,`fecha`),
  KEY `Recategorizacion_jugadorId_fecha_idx` (`jugadorId`,`fecha`),
  KEY `Recategorizacion_createdById_fkey` (`createdById`),
  CONSTRAINT `Recategorizacion_complejoId_fkey` FOREIGN KEY (`complejoId`) REFERENCES `complejo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Recategorizacion_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Recategorizacion_jugadorId_fkey` FOREIGN KEY (`jugadorId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recategorizacion`
--

LOCK TABLES `recategorizacion` WRITE;
/*!40000 ALTER TABLE `recategorizacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `recategorizacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ronda`
--

DROP TABLE IF EXISTS `ronda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ronda` (
  `id` int NOT NULL AUTO_INCREMENT,
  `torneoId` int NOT NULL,
  `nombre` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Ronda_torneoId_nombre_key` (`torneoId`,`nombre`),
  KEY `Ronda_torneoId_orden_idx` (`torneoId`,`orden`),
  CONSTRAINT `Ronda_torneoId_fkey` FOREIGN KEY (`torneoId`) REFERENCES `torneo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ronda`
--

LOCK TABLES `ronda` WRITE;
/*!40000 ALTER TABLE `ronda` DISABLE KEYS */;
/*!40000 ALTER TABLE `ronda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sponsor`
--

DROP TABLE IF EXISTS `sponsor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sponsor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `imageUrl` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sponsor`
--

LOCK TABLES `sponsor` WRITE;
/*!40000 ALTER TABLE `sponsor` DISABLE KEYS */;
/*!40000 ALTER TABLE `sponsor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `torneo`
--

DROP TABLE IF EXISTS `torneo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `torneo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eventoId` int NOT NULL,
  `nombre` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoriaCode` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `comentario` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacidad` int NOT NULL DEFAULT '24',
  `status` enum('DRAFT','PUBLISHED','IN_PROGRESS','FINISHED','ARCHIVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `publicado` tinyint(1) NOT NULL DEFAULT '0',
  `zonaCerrada` tinyint(1) NOT NULL DEFAULT '0',
  `zonaGenerada` tinyint(1) NOT NULL DEFAULT '0',
  `partidosGenerados` tinyint(1) NOT NULL DEFAULT '0',
  `actualizado` tinyint(1) NOT NULL DEFAULT '0',
  `inicio` datetime(3) DEFAULT NULL,
  `fin` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `sexo` enum('MASCULINO','FEMENINO','MIXTO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MIXTO',
  `categoriaRegla` enum('LIBRE','MAYOR_IGUAL','MENOR_IGUAL','IGUAL','SUMA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LIBRE',
  `categoriaN` int DEFAULT NULL,
  `imagenUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jugxZona` int NOT NULL DEFAULT '3',
  `valorInsc` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Torneo_eventoId_nombre_key` (`eventoId`,`nombre`),
  KEY `Torneo_eventoId_status_idx` (`eventoId`,`status`),
  CONSTRAINT `Torneo_eventoId_fkey` FOREIGN KEY (`eventoId`) REFERENCES `evento` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `torneo`
--

LOCK TABLES `torneo` WRITE;
/*!40000 ALTER TABLE `torneo` DISABLE KEYS */;
INSERT INTO `torneo` VALUES (1,1,'Caballeros 7ma','=7',NULL,32,'PUBLISHED',1,0,1,1,0,'2026-03-27 20:11:00.000','2026-03-30 20:11:00.000',NULL,'2026-03-04 20:11:32.655','2026-08-05 02:46:17.385','MASCULINO','IGUAL',7,NULL,3,'$25000 por pareja'),(2,1,'Mixto 5','=5','segundo torneo',24,'PUBLISHED',1,1,0,0,0,'2026-03-21 02:20:00.000','2026-03-23 02:20:00.000',NULL,'2026-03-08 02:20:35.848','2026-06-30 02:27:51.818','MIXTO','IGUAL',5,NULL,3,'$30000 por persona + turno');
/*!40000 ALTER TABLE `torneo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turnoreserva`
--

DROP TABLE IF EXISTS `turnoreserva`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `turnoreserva` (
  `id` int NOT NULL AUTO_INCREMENT,
  `turnoSlotId` int NOT NULL,
  `jugadorId` int NOT NULL,
  `createdById` int DEFAULT NULL,
  `status` enum('CONFIRMADA','CANCELADA','NO_SHOW') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CONFIRMADA',
  `notas` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `cancelledAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TurnoReserva_turnoSlotId_key` (`turnoSlotId`),
  KEY `TurnoReserva_jugadorId_createdAt_idx` (`jugadorId`,`createdAt`),
  KEY `TurnoReserva_createdById_fkey` (`createdById`),
  CONSTRAINT `TurnoReserva_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TurnoReserva_jugadorId_fkey` FOREIGN KEY (`jugadorId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `TurnoReserva_turnoSlotId_fkey` FOREIGN KEY (`turnoSlotId`) REFERENCES `turnoslot` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turnoreserva`
--

LOCK TABLES `turnoreserva` WRITE;
/*!40000 ALTER TABLE `turnoreserva` DISABLE KEYS */;
/*!40000 ALTER TABLE `turnoreserva` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turnoslot`
--

DROP TABLE IF EXISTS `turnoslot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `turnoslot` (
  `id` int NOT NULL AUTO_INCREMENT,
  `canchaId` int NOT NULL,
  `createdById` int DEFAULT NULL,
  `startAt` datetime(3) NOT NULL,
  `endAt` datetime(3) NOT NULL,
  `duracionMin` int NOT NULL,
  `status` enum('LIBRE','RESERVADO','BLOQUEADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LIBRE',
  `deletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TurnoSlot_canchaId_startAt_endAt_key` (`canchaId`,`startAt`,`endAt`),
  KEY `TurnoSlot_canchaId_startAt_status_idx` (`canchaId`,`startAt`,`status`),
  KEY `TurnoSlot_createdById_fkey` (`createdById`),
  CONSTRAINT `TurnoSlot_canchaId_fkey` FOREIGN KEY (`canchaId`) REFERENCES `cancha` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TurnoSlot_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turnoslot`
--

LOCK TABLES `turnoslot` WRITE;
/*!40000 ALTER TABLE `turnoslot` DISABLE KEYS */;
/*!40000 ALTER TABLE `turnoslot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastname` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dni` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `genero` enum('M','F','X') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'X',
  `birthDate` date DEFAULT NULL,
  `avatarUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imageUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platformRole` enum('USER','SUPERADMIN','SUPPORT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `deletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `categoria` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  UNIQUE KEY `User_dni_key` (`dni`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'admin@sistema.com','$2b$10$UDEHkjiSRF39NQouGwZPkuVTEuwCe9nM.ehA1WXt2e3e0SuyIyVUi','Administrador','Administrador',NULL,'10810166','M',NULL,'',NULL,'SUPERADMIN',1,NULL,'2026-03-02 18:22:49.428','0000-00-00 00:00:00.000',NULL),(7,'monty@burns.com','$2b$10$aE4BHnKcJJUCn9oLeQVgw.WUwGizk3nkaKf.JwKe5K/zdBlGOguk6','Monty','Burns',NULL,'10810162','M','1985-11-21','/uploads/users/7/avatar-1773180999492-f84ee52d-ad9b-463e-989a-4b71c09ec3ac.png','/uploads/users/7/image-1773180999492-f84ee52d-ad9b-463e-989a-4b71c09ec3ac.png','USER',1,NULL,'2026-03-08 18:38:23.335','2026-03-10 22:16:46.852','7'),(8,'','','','',NULL,NULL,'X',NULL,NULL,NULL,'USER',1,NULL,'2026-03-08 21:36:45.492','0000-00-00 00:00:00.000','5'),(9,'bart@simpsons.com','$2b$10$63oMXgYKaXDLJJXkZydtyOBPoGr1y891T8pg13Hb3tLmkFouAICXG','Bart','Simpson',NULL,NULL,'M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-08 23:00:53.641','2026-03-08 23:00:53.641','7'),(10,'jugador10@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador10','Test10',NULL,'DNI00010','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(11,'jugador11@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador11','Test11',NULL,'DNI00011','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(12,'jugador12@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador12','Test12',NULL,'DNI00012','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(13,'jugador13@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador13','Test13',NULL,'DNI00013','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(14,'jugador14@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador14','Test14',NULL,'DNI00014','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(15,'jugador15@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador15','Test15',NULL,'DNI00015','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(16,'jugador16@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador16','Test16',NULL,'DNI00016','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(17,'jugador17@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador17','Test17',NULL,'DNI00017','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(18,'jugador18@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador18','Test18',NULL,'DNI00018','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(19,'jugador19@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador19','Test19',NULL,'DNI00019','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(20,'jugador20@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador20','Test20',NULL,'DNI00020','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(21,'jugador21@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador21','Test21',NULL,'DNI00021','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(22,'jugador22@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador22','Test22',NULL,'DNI00022','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(23,'jugador23@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador23','Test23',NULL,'DNI00023','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(24,'jugador24@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador24','Test24',NULL,'DNI00024','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(25,'jugador25@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador25','Test25',NULL,'DNI00025','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(26,'jugador26@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador26','Test26',NULL,'DNI00026','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(27,'jugador27@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador27','Test27',NULL,'DNI00027','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(28,'jugador28@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador28','Test28',NULL,'DNI00028','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(29,'jugador29@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador29','Test29',NULL,'DNI00029','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(30,'jugador30@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador30','Test30',NULL,'DNI00030','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(31,'jugador31@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador31','Test31',NULL,'DNI00031','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(32,'jugador32@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador32','Test32',NULL,'DNI00032','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(33,'jugador33@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador33','Test33',NULL,'DNI00033','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(34,'jugador34@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador34','Test34',NULL,'DNI00034','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(35,'jugador35@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador35','Test35',NULL,'DNI00035','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(36,'jugador36@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador36','Test36',NULL,'DNI00036','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(37,'jugador37@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador37','Test37',NULL,'DNI00037','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(38,'jugador38@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador38','Test38',NULL,'DNI00038','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(39,'jugador39@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador39','Test39',NULL,'DNI00039','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(40,'jugador40@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador40','Test40',NULL,'DNI00040','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(41,'jugador41@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador41','Test41',NULL,'DNI00041','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(42,'jugador42@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador42','Test42',NULL,'DNI00042','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(43,'jugador43@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador43','Test43',NULL,'DNI00043','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(44,'jugador44@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador44','Test44',NULL,'DNI00044','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(45,'jugador45@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador45','Test45',NULL,'DNI00045','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(46,'jugador46@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador46','Test46',NULL,'DNI00046','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(47,'jugador47@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador47','Test47',NULL,'DNI00047','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(48,'jugador48@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador48','Test48',NULL,'DNI00048','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(49,'jugador49@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador49','Test49',NULL,'DNI00049','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(50,'jugador50@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador50','Test50',NULL,'DNI00050','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(51,'jugador51@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador51','Test51',NULL,'DNI00051','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(52,'jugador52@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador52','Test52',NULL,'DNI00052','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(53,'jugador53@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador53','Test53',NULL,'DNI00053','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(54,'jugador54@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador54','Test54',NULL,'DNI00054','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(55,'jugador55@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador55','Test55',NULL,'DNI00055','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(56,'jugador56@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador56','Test56',NULL,'DNI00056','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(57,'jugador57@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador57','Test57',NULL,'DNI00057','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(58,'jugador58@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador58','Test58',NULL,'DNI00058','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(59,'jugador59@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador59','Test59',NULL,'DNI00059','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(60,'jugador60@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador60','Test60',NULL,'DNI00060','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(61,'jugador61@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador61','Test61',NULL,'DNI00061','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(62,'jugador62@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador62','Test62',NULL,'DNI00062','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(63,'jugador63@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador63','Test63',NULL,'DNI00063','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(64,'jugador64@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador64','Test64',NULL,'DNI00064','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(65,'jugador65@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador65','Test65',NULL,'DNI00065','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(66,'jugador66@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador66','Test66',NULL,'DNI00066','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(67,'jugador67@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador67','Test67',NULL,'DNI00067','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(68,'jugador68@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador68','Test68',NULL,'DNI00068','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(69,'jugador69@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador69','Test69',NULL,'DNI00069','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(70,'jugador70@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador70','Test70',NULL,'DNI00070','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(71,'jugador71@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador71','Test71',NULL,'DNI00071','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(72,'jugador72@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador72','Test72',NULL,'DNI00072','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma'),(73,'jugador73@padel.test','$2b$10$zIIx82hH7HCrLqPpc6DkvuYoakdtRp4b0r4gYnfyAlr8TfZN6pzj6','Jugador73','Test73',NULL,'DNI00073','M',NULL,NULL,NULL,'USER',1,NULL,'2026-03-12 16:01:01.000','2026-03-12 16:01:01.000','7ma');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-14 17:58:17
