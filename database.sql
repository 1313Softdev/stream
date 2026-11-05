-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: streamadda
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `slot_id` varchar(64) DEFAULT NULL,
  `period` varchar(50) NOT NULL,
  `count` int(11) DEFAULT 1,
  `currency` varchar(10) DEFAULT 'INR',
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(50) DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES ('ord_1793836127998','usr_admin_01',NULL,'3 Months',1,'INR',3499.00,'completed','2026-11-04 23:48:47'),('ord-1793834756462','6ae0fd7c4863791bef736a0a','6ae0fddc4863791bef736a11','3 Months',1,'INR',1999.00,'completed','2026-11-04 23:25:56'),('ord-1793835015393','usr_1793834994521_80dvdz','6ae0fddc4863791bef736a11','3 Months',1,'INR',1999.00,'completed','2026-11-04 23:30:15');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_gateways`
--

DROP TABLE IF EXISTS `payment_gateways`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_gateways` (
  `id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `mode` varchar(20) NOT NULL DEFAULT 'manual',
  `upi_id` varchar(255) NOT NULL DEFAULT '',
  `merchant_name` varchar(255) NOT NULL DEFAULT 'StreamAdda Live',
  `api_key` varchar(255) NOT NULL DEFAULT '',
  `api_secret` varchar(255) NOT NULL DEFAULT '',
  `merchant_id` varchar(255) NOT NULL DEFAULT '',
  `webhook_secret` varchar(255) NOT NULL DEFAULT '',
  `qr_code_image_url` text DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `auto_verify` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_gateways`
--

LOCK TABLES `payment_gateways` WRITE;
/*!40000 ALTER TABLE `payment_gateways` DISABLE KEYS */;
INSERT INTO `payment_gateways` VALUES ('gpay','Google Pay (Merchant VPA)',1,'manual','streamadda@okaxis','StreamAdda Media Services','','','','',NULL,'Pay directly via Google Pay to our merchant VPA and submit your transaction UTR reference.',0,'2026-11-04 23:48:10'),('paytm','Paytm Business Gateway',1,'manual','paytmqr.streamadda@paytm','StreamAdda Media','','','','',NULL,'Pay via Paytm UPI or Wallet scan and enter your Order ID / UTR.',0,'2026-11-04 23:48:10'),('razorpay','Razorpay Automatic Gateway',0,'automatic','','StreamAdda Inc','','','','',NULL,'Pay instantly via Credit/Debit Cards, NetBanking, and UPI with instant automated activation.',1,'2026-11-04 23:48:10'),('upi','UPI Dynamic QR & Direct Intent',1,'manual','streamadda@upi','StreamAdda Live Broadcast','','','','',NULL,'Scan the dynamic QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) and submit your 12-digit UTR reference number below.',0,'2026-11-04 23:48:10');
/*!40000 ALTER TABLE `payment_gateways` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_transactions` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `user_name` varchar(255) DEFAULT '',
  `user_email` varchar(255) DEFAULT '',
  `plan_id` varchar(64) NOT NULL,
  `slot_id` varchar(64) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'INR',
  `gateway_type` varchar(50) NOT NULL DEFAULT 'upi',
  `utr_number` varchar(100) DEFAULT NULL,
  `proof_image_url` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `admin_note` text DEFAULT NULL,
  `verified_by` varchar(64) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
INSERT INTO `payment_transactions` VALUES ('tx_1793836127966_2dbxp','usr_admin_01','Satnam Singh','britishpunjabitv13@gmail.com','3 Months',NULL,3499.00,'INR','upi','431289056712',NULL,'approved','Verified via bank statement','admin','2026-11-04 23:48:47','2026-11-04 23:48:47','2026-11-04 23:48:47');
/*!40000 ALTER TABLE `payment_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `key_name` varchar(100) NOT NULL,
  `value_text` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('canonical_url','https://streamadda.com','2026-11-04 23:48:10'),('custom_head_scripts','','2026-11-04 23:48:10'),('default_payment_gateway','upi','2026-11-04 23:48:10'),('default_storage_quota_gb','5','2026-11-04 23:51:10'),('google_drive_api_key','','2026-11-04 23:48:10'),('google_drive_enabled','true','2026-11-04 23:48:55'),('google_drive_folder_id','1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs','2026-11-04 23:48:55'),('google_drive_service_account_json','','2026-11-04 23:48:10'),('meta_description','Stream your Pre-Recorded videos 24x7 nonstop to YouTube, Facebook, Twitch with cloud RTMP servers. Grow subscribers and monetize with zero downtime.','2026-11-04 23:48:10'),('meta_keywords','live streaming, 24/7 stream, youtube live, stream pre recorded video, rtmp streaming, cloud live streamer','2026-11-04 23:48:10'),('og_image','https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80','2026-11-04 23:48:10'),('site_title','StreamAdda - 24/7 Cloud Live Streaming for Creators','2026-11-04 23:48:10');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slots`
--

DROP TABLE IF EXISTS `slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slots` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `stream_status` varchar(50) NOT NULL DEFAULT 'Off',
  `expire_on` varchar(100) DEFAULT NULL,
  `expires_at` bigint(20) DEFAULT NULL,
  `stream_key` varchar(255) DEFAULT NULL,
  `platform` varchar(50) NOT NULL DEFAULT 'YouTube',
  `stream_loop` tinyint(1) NOT NULL DEFAULT 1,
  `auto_start_on_key_update` tinyint(1) DEFAULT 0,
  `rtmp_server_url` text DEFAULT NULL,
  `schedule_start_enabled` tinyint(1) DEFAULT 0,
  `stream_start_time` varchar(100) DEFAULT NULL,
  `scheduled_start_time_ms` bigint(20) DEFAULT NULL,
  `stream_end_time` varchar(100) DEFAULT NULL,
  `video_id` varchar(64) DEFAULT NULL,
  `target_bitrate_kbps` int(11) DEFAULT 2500,
  `fps_preset` int(11) DEFAULT 30,
  `audio_bitrate_kbps` int(11) DEFAULT 128,
  `quality_preset_name` varchar(50) DEFAULT '1080p',
  `started_at` bigint(20) DEFAULT NULL,
  `live_viewers` int(11) DEFAULT 0,
  `bitrate` int(11) DEFAULT 0,
  `fps` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slots`
--

LOCK TABLES `slots` WRITE;
/*!40000 ALTER TABLE `slots` DISABLE KEYS */;
INSERT INTO `slots` VALUES ('6ae0fddc4863791bef736a11','6ae0fd7c4863791bef736a0a','Slot 1793129948103','active','Off','4 May 2027 - 04:29 PM',1809437961861,'77hb-vvh8-yuj4-40ex-8ay6','YouTube',1,0,NULL,1,'November 5th, 2026 05:27 AM',NULL,'October 30th, 2026 04:29 PM',NULL,4500,30,128,'1080p-4500',NULL,0,0,0,'2026-11-04 23:08:44','2026-11-05 00:25:57'),('918623731a1a9216983','usr_1793838883467_v87pu2','Slot 1793838892101','active','Off','29 Nov 2026 - 11:59 PM',1796430901635,'live-d2l1uowi4n','YouTube',1,0,NULL,0,'October 30th, 2026 06:00 PM',NULL,'November 29th, 2026 11:59 PM',NULL,2500,30,128,'1080p',NULL,0,0,0,'2026-11-05 00:35:01','2026-11-05 00:35:01'),('slot__guest_8168','usr_guest','Live Slot 1','active','Off','30 Oct 2026 - 04:29 PM',1793891226078,'hdef-dcea-vtkm-m7hw-50s0','YouTube',1,0,NULL,0,NULL,NULL,'October 30th, 2026 04:29 PM','vid-lofi-01',2500,30,128,'1080p',NULL,0,0,0,'2026-11-05 00:36:28','2026-11-05 00:36:28'),('slot_80dvdz_1494','usr_1793834994521_80dvdz','Live Slot 1','active','Off','30 Oct 2026 - 04:29 PM',1793890969355,'hdef-dcea-vtkm-m7hw-50s0','YouTube',1,0,NULL,0,NULL,NULL,'October 30th, 2026 04:29 PM','vid-lofi-01',2500,30,128,'1080p',NULL,0,0,0,'2026-11-05 00:32:11','2026-11-05 00:32:11'),('slot_d11iwu_9931','usr_1793838043442_d11iwu','Live Slot 1','active','Off','30 Oct 2026 - 04:29 PM',1793891256294,'hdef-dcea-vtkm-m7hw-50s0','YouTube',1,0,NULL,0,NULL,NULL,'October 30th, 2026 04:29 PM','vid-lofi-01',2500,30,128,'1080p',NULL,0,0,0,'2026-11-05 00:37:39','2026-11-05 00:37:39'),('slot_v87pu2_4509','usr_1793838883467_v87pu2','Live Slot 1','active','Off','30 Oct 2026 - 04:29 PM',1793891043354,'hdef-dcea-vtkm-m7hw-50s0','YouTube',1,0,NULL,0,NULL,NULL,'October 30th, 2026 04:29 PM','vid-lofi-01',2500,30,128,'1080p',NULL,0,0,0,'2026-11-05 00:34:44','2026-11-05 00:34:44');
/*!40000 ALTER TABLE `slots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription_plans` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `period` varchar(50) NOT NULL,
  `duration_label` varchar(50) NOT NULL,
  `duration_days` int(11) NOT NULL DEFAULT 30,
  `price_inr` decimal(10,2) NOT NULL DEFAULT 1999.00,
  `price_usd` decimal(10,2) NOT NULL DEFAULT 24.99,
  `storage_gb` int(11) NOT NULL DEFAULT 10,
  `max_slots` int(11) NOT NULL DEFAULT 1,
  `features_json` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_popular` tinyint(1) NOT NULL DEFAULT 0,
  `badge_text` varchar(100) DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` VALUES ('plan_3months','3 Months Pro Plan','3 Months','3 Months',90,3499.00,44.99,50,3,'[\"24/7 Continuous Loop Streaming\",\"1080p Full HD at 60fps\",\"50 GB Cloud Video Storage\",\"Best Value · Save 30%\",\"Unlimited Video Swapping\",\"24/7 Dedicated Server Support\"]',1,1,'Best Value · Save 30%',4,'2026-11-04 23:48:10','2026-11-04 23:48:10'),('plan_days','Daily Live Pass','Days','1 Day',1,13.00,1.00,5,1,'[\"24/7 Continuous Loop Streaming\",\"1080p Full HD at 60fps\",\"5 GB Cloud Video Storage\",\"Basic RTMP Ingest Support\"]',1,0,NULL,1,'2026-11-04 23:48:10','2026-11-05 00:23:26'),('plan_months','Monthly Creator','Months','1 Month',30,1499.00,19.99,20,2,'[\"24/7 Continuous Loop Streaming\",\"1080p Full HD at 60fps\",\"20 GB Cloud Video Storage\",\"Multi-Slot Management\",\"Stream Scheduler & Auto-Start\",\"Standard Support\"]',1,0,NULL,3,'2026-11-04 23:48:10','2026-11-04 23:48:10'),('plan_weeks','Weekly Starter','Weeks','1 Week',7,499.00,6.99,10,1,'[\"24/7 Continuous Loop Streaming\",\"1080p Full HD at 60fps\",\"10 GB Cloud Video Storage\",\"Stream Scheduler\",\"Priority Cloud Transcoding\"]',1,0,NULL,2,'2026-11-04 23:48:10','2026-11-04 23:48:10'),('plan_year','Annual Master Plan','Year','1 Year',365,9999.00,129.99,100,5,'[\"24/7 Continuous Loop Streaming\",\"1080p Full HD at 60fps\",\"100 GB Cloud Video Storage\",\"5 Concurrent Live Slots\",\"Dedicated Cloud Server\",\"VIP Priority Support\"]',1,0,'Pro Tier',5,'2026-11-04 23:48:10','2026-11-04 23:48:10');
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'Streamer',
  `email` varchar(255) NOT NULL DEFAULT '',
  `password_hash` varchar(255) DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `storage_quota_bytes` bigint(20) NOT NULL DEFAULT 10737418240,
  `storage_used_bytes` bigint(20) NOT NULL DEFAULT 0,
  `subscription_plan_id` varchar(64) DEFAULT NULL,
  `subscription_expires_at` bigint(20) DEFAULT NULL,
  `avatar_initials` varchar(10) DEFAULT 'S',
  `country` varchar(100) DEFAULT 'India',
  `city` varchar(100) DEFAULT 'Mohali',
  `phone` varchar(50) DEFAULT '',
  `phone_code` varchar(10) DEFAULT '+91',
  `theme` varchar(20) DEFAULT 'light',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('6ae0fd7c4863791bef736a0a','Satnam Singh','britishpunjabitv13@gmail.com','222f5d9c937f64b37f4af8d3b95f7f04:990b5c2ad1ce966f1790031f4c1253367f66fac7a0910bdb19ee9e99fe2572bf2137083c7b39a732bb29f3fee14cb8aff7ff777db537cd73a41390194cadf7ae','admin','active',10737418240,0,NULL,NULL,'S','India','Mohali','88470 57896','+91','light','2026-11-04 23:08:44','2026-11-05 00:08:12'),('usr_1793834994521_80dvdz','Gursewak','kukudigitallabs@gmail.com','5a96efe3783eab452fa7fadeda06cafc:ab507691a029f9f0386a5fed67d690553e3a064424606ab3e68b6b0dc00e9b7e69392b541565a2129e6d5a48ed9fdd1f83a33d441bbbc265ccec2ea64d3ef91c','user','active',10737418240,333502626,NULL,NULL,'G','India','Mohali','','+91','light','2026-11-04 23:29:54','2026-11-05 00:33:41'),('usr_1793837159516_6ilne3','Regular User','regularuser@example.com','a6b24ba3d1dfe47918618884b2fcf5b5:384ffc6409c2919bada3819feb1389d1f1b9527d53c1d378104cf1efe2614ccb84e23dccfffa45a487606baf2f8696d2302baaba936e3bc4ce611dc5eafbdd72','user','active',10737418240,0,NULL,NULL,'RU','India','Mohali','','+91','light','2026-11-05 00:05:59','2026-11-05 00:05:59'),('usr_1793838043442_d11iwu','kuku','1313softdev@gmail.com','7c487dbfe724e9ab7b469d3f8eceb504:f3726bcf28d4ef8b26106724bfc032a49e38fad62d92544c8063ae3eda41ec732e63cae85dbeb3eeaf1f811c0d1bc40a6746cdcc788c8697218da79c4d2af613','user','active',10737418240,171538214,NULL,NULL,'K','India','Mohali','','+91','light','2026-11-05 00:20:43','2026-11-05 00:38:01'),('usr_1793838883467_v87pu2','user1','user1@gmail.com','05166588ba6acba103e6acb3171407a7:26c5d3d84cc48303b41c5fda45f85e2095e7999e49178561285cfdb0591160ee2e3acfa27eeaccd56d04e9955d33547e02a2798071631d1046f97f950ac6035b','user','active',10737418240,0,NULL,NULL,'U','India','Mohali','','+91','light','2026-11-05 00:34:43','2026-11-05 00:34:43'),('usr_guest','Streamer','',NULL,'user','active',10737418240,0,NULL,NULL,'S','India','Mohali','','+91','light','2026-11-05 00:36:28','2026-11-05 00:36:28');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `videos`
--

DROP TABLE IF EXISTS `videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `videos` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `duration` varchar(50) DEFAULT '00:00',
  `size_bytes` bigint(20) DEFAULT 0,
  `size_formatted` varchar(50) DEFAULT '0 MB',
  `resolution` varchar(50) DEFAULT '1080p',
  `thumbnail_url` text DEFAULT NULL,
  `video_url` text NOT NULL,
  `video_path` text DEFAULT NULL,
  `category` varchar(100) DEFAULT 'General',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `videos`
--

LOCK TABLES `videos` WRITE;
/*!40000 ALTER TABLE `videos` DISABLE KEYS */;
INSERT INTO `videos` VALUES 
('vid-lofi-01','6ae0fd7c4863791bef736a0a','Lofi Chill Beats (Demo)','0:30',915020,'0.9 MB','1080p 30fps','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60','/videos/lofi-chill.mp4','public/videos/lofi-chill.mp4','General','2026-11-05 00:00:00'),
('vid-nature-02','6ae0fd7c4863791bef736a0a','Nature Relaxation (Demo)','0:30',943683,'0.9 MB','1080p 30fps','https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60','/videos/nature-relax.mp4','public/videos/nature-relax.mp4','General','2026-11-05 00:00:00'),
('vid-tech-03','6ae0fd7c4863791bef736a0a','Tech Masterclass (Demo)','0:30',944403,'0.9 MB','1080p 30fps','https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60','/videos/tech-masterclass.mp4','public/videos/tech-masterclass.mp4','General','2026-11-05 00:00:00'),
('vid-sample-04','6ae0fd7c4863791bef736a0a','Stream Sample (Demo)','0:15',337182,'0.3 MB','720p 30fps','https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60','/sample-stream.mp4','public/sample-stream.mp4','General','2026-11-05 00:00:00');
/*!40000 ALTER TABLE `videos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-05  9:44:02
