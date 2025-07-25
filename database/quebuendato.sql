-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 22-07-2025 a las 23:19:58
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `phpmyadmin`
--
CREATE DATABASE IF NOT EXISTS `phpmyadmin` DEFAULT CHARACTER SET utf8 COLLATE utf8_bin;
USE `phpmyadmin`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__bookmark`
--

CREATE TABLE `pma__bookmark` (
  `id` int(10) UNSIGNED NOT NULL,
  `dbase` varchar(255) NOT NULL DEFAULT '',
  `user` varchar(255) NOT NULL DEFAULT '',
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '',
  `query` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Bookmarks';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__central_columns`
--

CREATE TABLE `pma__central_columns` (
  `db_name` varchar(64) NOT NULL,
  `col_name` varchar(64) NOT NULL,
  `col_type` varchar(64) NOT NULL,
  `col_length` text DEFAULT NULL,
  `col_collation` varchar(64) NOT NULL,
  `col_isNull` tinyint(1) NOT NULL,
  `col_extra` varchar(255) DEFAULT '',
  `col_default` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Central list of columns';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__column_info`
--

CREATE TABLE `pma__column_info` (
  `id` int(5) UNSIGNED NOT NULL,
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `table_name` varchar(64) NOT NULL DEFAULT '',
  `column_name` varchar(64) NOT NULL DEFAULT '',
  `comment` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '',
  `mimetype` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '',
  `transformation` varchar(255) NOT NULL DEFAULT '',
  `transformation_options` varchar(255) NOT NULL DEFAULT '',
  `input_transformation` varchar(255) NOT NULL DEFAULT '',
  `input_transformation_options` varchar(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Column information for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__designer_settings`
--

CREATE TABLE `pma__designer_settings` (
  `username` varchar(64) NOT NULL,
  `settings_data` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Settings related to Designer';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__export_templates`
--

CREATE TABLE `pma__export_templates` (
  `id` int(5) UNSIGNED NOT NULL,
  `username` varchar(64) NOT NULL,
  `export_type` varchar(10) NOT NULL,
  `template_name` varchar(64) NOT NULL,
  `template_data` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Saved export templates';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__favorite`
--

CREATE TABLE `pma__favorite` (
  `username` varchar(64) NOT NULL,
  `tables` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Favorite tables';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__history`
--

CREATE TABLE `pma__history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(64) NOT NULL DEFAULT '',
  `db` varchar(64) NOT NULL DEFAULT '',
  `table` varchar(64) NOT NULL DEFAULT '',
  `timevalue` timestamp NOT NULL DEFAULT current_timestamp(),
  `sqlquery` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='SQL history for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__navigationhiding`
--

CREATE TABLE `pma__navigationhiding` (
  `username` varchar(64) NOT NULL,
  `item_name` varchar(64) NOT NULL,
  `item_type` varchar(64) NOT NULL,
  `db_name` varchar(64) NOT NULL,
  `table_name` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Hidden items of navigation tree';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__pdf_pages`
--

CREATE TABLE `pma__pdf_pages` (
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `page_nr` int(10) UNSIGNED NOT NULL,
  `page_descr` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='PDF relation pages for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__recent`
--

CREATE TABLE `pma__recent` (
  `username` varchar(64) NOT NULL,
  `tables` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Recently accessed tables';

--
-- Volcado de datos para la tabla `pma__recent`
--

INSERT INTO `pma__recent` (`username`, `tables`) VALUES
('root', '[{\"db\":\"quebuendato\",\"table\":\"usuario\"},{\"db\":\"quebuendato\",\"table\":\"tipo_usuario\"}]');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__relation`
--

CREATE TABLE `pma__relation` (
  `master_db` varchar(64) NOT NULL DEFAULT '',
  `master_table` varchar(64) NOT NULL DEFAULT '',
  `master_field` varchar(64) NOT NULL DEFAULT '',
  `foreign_db` varchar(64) NOT NULL DEFAULT '',
  `foreign_table` varchar(64) NOT NULL DEFAULT '',
  `foreign_field` varchar(64) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Relation table';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__savedsearches`
--

CREATE TABLE `pma__savedsearches` (
  `id` int(5) UNSIGNED NOT NULL,
  `username` varchar(64) NOT NULL DEFAULT '',
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `search_name` varchar(64) NOT NULL DEFAULT '',
  `search_data` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Saved searches';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__table_coords`
--

CREATE TABLE `pma__table_coords` (
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `table_name` varchar(64) NOT NULL DEFAULT '',
  `pdf_page_number` int(11) NOT NULL DEFAULT 0,
  `x` float UNSIGNED NOT NULL DEFAULT 0,
  `y` float UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Table coordinates for phpMyAdmin PDF output';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__table_info`
--

CREATE TABLE `pma__table_info` (
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `table_name` varchar(64) NOT NULL DEFAULT '',
  `display_field` varchar(64) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Table information for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__table_uiprefs`
--

CREATE TABLE `pma__table_uiprefs` (
  `username` varchar(64) NOT NULL,
  `db_name` varchar(64) NOT NULL,
  `table_name` varchar(64) NOT NULL,
  `prefs` text NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Tables'' UI preferences';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__tracking`
--

CREATE TABLE `pma__tracking` (
  `db_name` varchar(64) NOT NULL,
  `table_name` varchar(64) NOT NULL,
  `version` int(10) UNSIGNED NOT NULL,
  `date_created` datetime NOT NULL,
  `date_updated` datetime NOT NULL,
  `schema_snapshot` text NOT NULL,
  `schema_sql` text DEFAULT NULL,
  `data_sql` longtext DEFAULT NULL,
  `tracking` set('UPDATE','REPLACE','INSERT','DELETE','TRUNCATE','CREATE DATABASE','ALTER DATABASE','DROP DATABASE','CREATE TABLE','ALTER TABLE','RENAME TABLE','DROP TABLE','CREATE INDEX','DROP INDEX','CREATE VIEW','ALTER VIEW','DROP VIEW') DEFAULT NULL,
  `tracking_active` int(1) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Database changes tracking for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__userconfig`
--

CREATE TABLE `pma__userconfig` (
  `username` varchar(64) NOT NULL,
  `timevalue` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `config_data` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='User preferences storage for phpMyAdmin';

--
-- Volcado de datos para la tabla `pma__userconfig`
--

INSERT INTO `pma__userconfig` (`username`, `timevalue`, `config_data`) VALUES
('root', '2025-07-22 21:19:57', '{\"Console\\/Mode\":\"collapse\",\"lang\":\"es\"}');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__usergroups`
--

CREATE TABLE `pma__usergroups` (
  `usergroup` varchar(64) NOT NULL,
  `tab` varchar(64) NOT NULL,
  `allowed` enum('Y','N') NOT NULL DEFAULT 'N'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='User groups with configured menu items';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pma__users`
--

CREATE TABLE `pma__users` (
  `username` varchar(64) NOT NULL,
  `usergroup` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Users and their assignments to user groups';

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `pma__bookmark`
--
ALTER TABLE `pma__bookmark`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `pma__central_columns`
--
ALTER TABLE `pma__central_columns`
  ADD PRIMARY KEY (`db_name`,`col_name`);

--
-- Indices de la tabla `pma__column_info`
--
ALTER TABLE `pma__column_info`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `db_name` (`db_name`,`table_name`,`column_name`);

--
-- Indices de la tabla `pma__designer_settings`
--
ALTER TABLE `pma__designer_settings`
  ADD PRIMARY KEY (`username`);

--
-- Indices de la tabla `pma__export_templates`
--
ALTER TABLE `pma__export_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `u_user_type_template` (`username`,`export_type`,`template_name`);

--
-- Indices de la tabla `pma__favorite`
--
ALTER TABLE `pma__favorite`
  ADD PRIMARY KEY (`username`);

--
-- Indices de la tabla `pma__history`
--
ALTER TABLE `pma__history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `username` (`username`,`db`,`table`,`timevalue`);

--
-- Indices de la tabla `pma__navigationhiding`
--
ALTER TABLE `pma__navigationhiding`
  ADD PRIMARY KEY (`username`,`item_name`,`item_type`,`db_name`,`table_name`);

--
-- Indices de la tabla `pma__pdf_pages`
--
ALTER TABLE `pma__pdf_pages`
  ADD PRIMARY KEY (`page_nr`),
  ADD KEY `db_name` (`db_name`);

--
-- Indices de la tabla `pma__recent`
--
ALTER TABLE `pma__recent`
  ADD PRIMARY KEY (`username`);

--
-- Indices de la tabla `pma__relation`
--
ALTER TABLE `pma__relation`
  ADD PRIMARY KEY (`master_db`,`master_table`,`master_field`),
  ADD KEY `foreign_field` (`foreign_db`,`foreign_table`);

--
-- Indices de la tabla `pma__savedsearches`
--
ALTER TABLE `pma__savedsearches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `u_savedsearches_username_dbname` (`username`,`db_name`,`search_name`);

--
-- Indices de la tabla `pma__table_coords`
--
ALTER TABLE `pma__table_coords`
  ADD PRIMARY KEY (`db_name`,`table_name`,`pdf_page_number`);

--
-- Indices de la tabla `pma__table_info`
--
ALTER TABLE `pma__table_info`
  ADD PRIMARY KEY (`db_name`,`table_name`);

--
-- Indices de la tabla `pma__table_uiprefs`
--
ALTER TABLE `pma__table_uiprefs`
  ADD PRIMARY KEY (`username`,`db_name`,`table_name`);

--
-- Indices de la tabla `pma__tracking`
--
ALTER TABLE `pma__tracking`
  ADD PRIMARY KEY (`db_name`,`table_name`,`version`);

--
-- Indices de la tabla `pma__userconfig`
--
ALTER TABLE `pma__userconfig`
  ADD PRIMARY KEY (`username`);

--
-- Indices de la tabla `pma__usergroups`
--
ALTER TABLE `pma__usergroups`
  ADD PRIMARY KEY (`usergroup`,`tab`,`allowed`);

--
-- Indices de la tabla `pma__users`
--
ALTER TABLE `pma__users`
  ADD PRIMARY KEY (`username`,`usergroup`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `pma__bookmark`
--
ALTER TABLE `pma__bookmark`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pma__column_info`
--
ALTER TABLE `pma__column_info`
  MODIFY `id` int(5) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pma__export_templates`
--
ALTER TABLE `pma__export_templates`
  MODIFY `id` int(5) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pma__history`
--
ALTER TABLE `pma__history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pma__pdf_pages`
--
ALTER TABLE `pma__pdf_pages`
  MODIFY `page_nr` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pma__savedsearches`
--
ALTER TABLE `pma__savedsearches`
  MODIFY `id` int(5) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- Base de datos: `quebuendato`
--
CREATE DATABASE IF NOT EXISTS `quebuendato` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `quebuendato`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `carrera`
--

CREATE TABLE `carrera` (
  `id_carrera` int(11) NOT NULL,
  `descripcion` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `dificultad`
--

CREATE TABLE `dificultad` (
  `id_dificultad` int(11) NOT NULL,
  `descripcion` varchar(250) DEFAULT NULL,
  `puntos` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `encuesta`
--

CREATE TABLE `encuesta` (
  `id_encuesta` int(11) NOT NULL,
  `titulo` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `encuesta`
--

INSERT INTO `encuesta` (`id_encuesta`, `titulo`) VALUES
(1, 'encuesta_preferencias');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estatus_pregunta`
--

CREATE TABLE `estatus_pregunta` (
  `id_estatus_p` int(11) NOT NULL,
  `estatus` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estatus_pregunta`
--

INSERT INTO `estatus_pregunta` (`id_estatus_p`, `estatus`) VALUES
(1, 'Publicado'),
(2, 'Borrador'),
(3, 'Archivado'),
(4, 'Revision');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `examen`
--

CREATE TABLE `examen` (
  `id_examen` int(11) NOT NULL,
  `id_dificultad` int(11) NOT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_termino` datetime NOT NULL,
  `duracion` time NOT NULL,
  `puntuacion_competencia` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `examenes_grupo`
--

CREATE TABLE `examenes_grupo` (
  `id_examen_grupo` int(11) NOT NULL,
  `fecha_examen` datetime NOT NULL,
  `duracion_minutos` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `grupos`
--

CREATE TABLE `grupos` (
  `id_grupo` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `grupo_examenes`
--

CREATE TABLE `grupo_examenes` (
  `id_grupo` int(11) NOT NULL,
  `id_examen_grupo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `grupo_usuarios`
--

CREATE TABLE `grupo_usuarios` (
  `id_grupo` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial`
--

CREATE TABLE `historial` (
  `id_examen` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_pregunta` int(11) NOT NULL,
  `id_respuesta` int(11) NOT NULL,
  `puntos` int(11) NOT NULL,
  `porcentaje` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `materias`
--

CREATE TABLE `materias` (
  `id_materia` int(11) NOT NULL,
  `descripcion` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `materias`
--

INSERT INTO `materias` (`id_materia`, `descripcion`) VALUES
(1, 'MATEMÁTICAS'),
(2, 'CIENCIA'),
(3, 'DEPORTES'),
(4, 'ESPAÑOL'),
(5, 'HISTORIA UNIVERSAL'),
(6, 'ECONOMÍA'),
(7, 'PROGRAMACIÓN'),
(8, 'HUMANIDADES'),
(9, 'GEOGRAFÍA'),
(10, 'MEDICINA'),
(11, 'CULTURA GENERAL'),
(12, 'ARTES'),
(13, 'TECNOLOGÍA');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `opcion_pregunta`
--

CREATE TABLE `opcion_pregunta` (
  `id_opcion` int(11) NOT NULL,
  `id_pregunta` int(11) DEFAULT NULL,
  `texto_opcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `opcion_pregunta`
--

INSERT INTO `opcion_pregunta` (`id_opcion`, `id_pregunta`, `texto_opcion`) VALUES
(5, 2, 'Prepararme para mi examen de admision'),
(6, 2, 'Mejorar mis conocimientos en general'),
(7, 2, 'Competir y ponerme a prueba'),
(8, 3, 'Menos de 30 minutos'),
(9, 3, '30 minutos - 1 hora'),
(10, 3, '1 a 2 horas'),
(11, 3, 'Mas de 2 horas'),
(12, 4, 'Preparatoria'),
(13, 4, 'Egresado'),
(14, 5, 'Si'),
(15, 5, 'No');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pregunta`
--

CREATE TABLE `pregunta` (
  `id_pregunta` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `pregunta` varchar(200) NOT NULL,
  `retroalimentacion` text DEFAULT NULL,
  `imagen` blob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pregunta`
--

INSERT INTO `pregunta` (`id_pregunta`, `id_materia`, `pregunta`, `retroalimentacion`, `imagen`) VALUES
(1, 1, '¿Cuál es la solución de la ecuación 2x+3=15?', 'Para despejar x, primero resta 3 en ambos lados de la ecuación y luego divide entre 2.', NULL),
(2, 1, '¿Cuál es el área de un triángulo con base de 10 cm y altura de 5 cm?', 'El área de un triángulo se calcula con la fórmula A = (base × altura) / 2.', NULL),
(3, 2, '¿Cuál es el planeta más cercano al sol?', 'El planeta más cercano al Sol es Mercurio.', NULL),
(4, 2, '¿Qué elemento químico de la tabla periódica tiene como símbolo \"O\"?', 'El elemento con símbolo \"O\" es el oxígeno.', NULL),
(5, 3, '¿Qué jugador de básquetbol tiene 6 anillos de campeonato?', 'Michael Jordan ganó 6 anillos con los Chicago Bulls en la NBA.', NULL),
(6, 3, '¿Cuál de los siguientes equipos de béisbol tiene más títulos de liga?', 'Los New York Yankees tienen la mayor cantidad de títulos en la MLB.', NULL),
(7, 4, '¿Qué palabra es un antónimo de \"feliz\"?', 'Un antónimo de \"feliz\" es \"triste\".', NULL),
(8, 4, '¿Qué elemento es esencial en un texto narrativo?', 'Un elemento esencial en un texto narrativo es la trama.', NULL),
(9, 5, '¿Cuál es el nombre oficial de México?', 'El nombre oficial de México es \"Estados Unidos Mexicanos\".', NULL),
(10, 5, '¿Cuáles fueron los 3 barcos en los que viajó Cristóbal Colón?', 'Las tres carabelas eran la Niña, la Pinta y la Santa María.', NULL),
(11, 6, '¿Qué es la oferta y la demanda?', 'La oferta y la demanda son principios económicos que regulan los precios en el mercado.', NULL),
(12, 6, '¿Cuál es la principal función de un banco?', 'La función principal de un banco es resguardar dinero y otorgar préstamos.', NULL),
(13, 7, '¿Qué significa FOR en programación?', 'FOR es una estructura de control utilizada para ciclos en programación.', NULL),
(14, 7, '', 'Falta definir la pregunta.', NULL),
(15, 8, '¿Quién es el padre de la filosofía?', 'Sócrates es considerado el padre de la filosofía.', NULL),
(16, 8, '¿Qué es la antropología?', 'La antropología es la ciencia que estudia al ser humano en su contexto social y cultural.', NULL),
(17, 9, '¿Cuál es el río más largo del mundo?', 'El río Amazonas es el más largo del mundo.', NULL),
(18, 9, '¿En dónde se encuentra \"La selva amazónica\"?', 'La selva amazónica se encuentra en América del Sur.', NULL),
(19, 10, '¿Cuántos huesos tiene el cuerpo humano?', 'El cuerpo humano tiene 206 huesos en un adulto.', NULL),
(20, 10, '¿Qué vitamina es esencial para la coagulación de la sangre?', 'La vitamina K es esencial para la coagulación de la sangre.', NULL),
(21, 11, '¿Cuál es el idioma más hablado del mundo?', 'El idioma más hablado del mundo es el inglés en términos de hablantes totales.', NULL),
(22, 11, '¿En qué año se produjo la independencia de los Estados Unidos?', 'La independencia de los Estados Unidos fue en 1776.', NULL),
(23, 12, '¿Quién pintó la famosa obra \"La noche estrellada\"?', 'La obra \"La noche estrellada\" fue pintada por Vincent van Gogh.', NULL),
(24, 12, '¿Cuál de las siguientes obras fue creada por Pablo Picasso?', 'Una de las obras más famosas de Picasso es \"Guernica\".', NULL),
(25, 13, '¿Qué es la innovación?', 'La innovación es la creación o mejora de productos y procesos.', NULL),
(26, 13, '¿Quién fue el creador de la TV a color?', 'Guillermo González Camarena inventó la televisión a color.', NULL),
(27, 13, '¿Quién inventó la bombilla de luz?', 'Thomas Edison es el inventor de la bombilla de luz.', NULL),
(28, 1, '¿Cuál es el perímetro de un rectángulo que tiene una longitud de 12 cm y un ancho de 5 cm?', 'El perímetro se calcula con la fórmula P = 2 × (largo + ancho).', NULL),
(29, 1, 'En una clase de 30 alumnos, 18 son hombres. ¿Cuál es el porcentaje de hombres en la clase?', 'Para calcular el porcentaje, divide el número de hombres entre el total de alumnos y multiplica por 100.', NULL),
(30, 1, 'Si 4 kg de manzanas cuestan $80, ¿Cuánto costarán 12.5 kg?', 'Utiliza una regla de tres simple para encontrar el costo proporcional.', NULL),
(31, 2, '¿Quién es el padre de la ciencia?', 'Aristóteles es considerado el padre de la ciencia debido a sus aportes en diversas disciplinas.', NULL),
(32, 2, '¿Cuál de los siguientes nombres es el de \"Aj\"?', 'La respuesta depende de las opciones proporcionadas.', NULL),
(33, 2, '¿Cuál es el número atómico de \"Astato\"?', 'El astato tiene un número atómico de 85.', NULL),
(34, 3, '¿Cuántos pasos están permitidos dar con el balón en la mano (sin hacer un regate)?', 'En el baloncesto, se permite dar hasta dos pasos sin botar el balón antes de lanzar o pasar.', NULL),
(35, 3, '¿Cuál selección tiene más mundiales en toda su historia?', 'Brasil es la selección con más títulos de la Copa del Mundo, con 5 campeonatos.', NULL),
(36, 3, '¿Cuántas entradas son en un partido de béisbol?', 'Un partido de béisbol profesional tiene 9 entradas.', NULL),
(37, 4, '¿Cuáles de los siguientes es un adjetivo calificativo?', 'Un adjetivo calificativo describe las características de un sustantivo, como \"grande\" o \"bonito\".', NULL),
(38, 4, '¿Cuál de las siguientes palabras es un adjetivo calificativo?', 'Un adjetivo calificativo aporta información sobre las cualidades de un sustantivo.', NULL),
(39, 4, '¿Qué tipo de texto es una receta de cocina?', 'Una receta de cocina es un texto instructivo porque indica los pasos para preparar un platillo.', NULL),
(40, 5, '¿En qué año inició la Segunda Guerra Mundial?', 'La Segunda Guerra Mundial comenzó en 1939.', NULL),
(41, 5, '¿En qué año se terminó la Segunda Guerra Mundial?', 'La Segunda Guerra Mundial terminó en 1945.', NULL),
(42, 5, '¿Qué país se encargó de tomar a la fuerza y comprar a precio mínimo el 55% del territorio mexicano?', 'Estados Unidos adquirió gran parte del territorio mexicano tras la guerra de 1846-1848 y el Tratado de Guadalupe Hidalgo.', NULL),
(43, 6, '¿Qué es la \"globalización económica\"?', 'La globalización económica es el proceso de integración e interdependencia de las economías mundiales.', NULL),
(44, 6, '¿Qué es el Producto Interno Bruto (PIB)?', 'El PIB mide el valor total de bienes y servicios producidos en un país durante un periodo determinado.', NULL),
(45, 6, '¿Qué es la inflación?', 'La inflación es el aumento generalizado y sostenido de los precios en una economía.', NULL),
(46, 7, 'En Python, ¿Cómo se define una función?', 'En Python, una función se define con la palabra clave \"def\", seguida del nombre de la función y paréntesis.', NULL),
(47, 7, '¿Qué es un bucle infinito?', 'Un bucle infinito es una estructura de repetición que nunca se detiene porque la condición de salida no se cumple.', NULL),
(48, 7, '¿Qué es una variable en programación?', 'Una variable es un espacio en la memoria que almacena un valor que puede cambiar durante la ejecución del programa.', NULL),
(49, 8, '¿Quién es conocido como el padre de la psicología moderna?', 'Wilhelm Wundt es considerado el padre de la psicología moderna por establecer el primer laboratorio de psicología experimental.', NULL),
(50, 8, '¿Qué era el Renacimiento?', 'El Renacimiento fue un movimiento cultural y artístico que surgió en Europa entre los siglos XIV y XVII.', NULL),
(51, 8, '¿Cuál de las siguientes disciplinas forma parte de las ciencias sociales?', 'Las ciencias sociales incluyen disciplinas como sociología, antropología, economía y política.', NULL),
(52, 8, '¿En qué país se encuentra la antigua ciudad de Petra?', 'Petra se encuentra en Jordania.', NULL),
(53, 9, '¿Cuál es la capital de Hungría?', 'La capital de Hungría es Budapest.', NULL),
(54, 9, '¿Cuál es la capital de Luxemburgo?', 'La capital de Luxemburgo es Luxemburgo.', NULL),
(55, 9, '¿Cuál es la capital de Suiza?', 'La capital de Suiza es Berna.', NULL),
(56, 10, '¿Qué tipo de células son responsables de la producción de anticuerpos?', 'Los linfocitos B son responsables de la producción de anticuerpos.', NULL),
(57, 10, '¿Qué órgano produce la insulina?', 'El páncreas es el órgano encargado de producir insulina.', NULL),
(58, 10, '¿Qué tipo de microorganismo causa la tuberculosis?', 'La tuberculosis es causada por la bacteria Mycobacterium tuberculosis.', NULL),
(59, 11, '¿Cuál es la capital de Australia?', 'La capital de Australia es Canberra.', NULL),
(60, 11, '¿Qué país es conocido como la \"Tierra del Sol Naciente\"?', 'Japón es conocido como la \"Tierra del Sol Naciente\".', NULL),
(61, 11, '¿En qué año se independizó Estados Unidos de Gran Bretaña?', 'Estados Unidos declaró su independencia el 4 de julio de 1776.', NULL),
(62, 12, '¿Cuáles son los colores primarios?', 'Los colores primarios son rojo, azul y amarillo.', NULL),
(63, 12, '¿Cuáles son los 3 colores secundarios?', 'Los colores secundarios son verde, naranja y morado, obtenidos al mezclar los primarios.', NULL),
(64, 12, '¿En qué país se originó la danza tradicional flamenca?', 'El flamenco es una danza tradicional de España, específicamente de Andalucía.', NULL),
(65, 13, '¿Quién es conocido como el padre de la computación?', 'Alan Turing es considerado el padre de la computación moderna.', NULL),
(66, 13, '¿Qué parte de la computadora es el Hawa Are?', 'Parece haber un error en la pregunta. Tal vez quisiste decir \"Hardware\", que son los componentes físicos de una computadora.', NULL),
(67, 1, '¿Cuál es el valor de 5 + 3 × 2?', 'Siguiendo la jerarquía de operaciones, primero se multiplica 3 × 2 y luego se suma 5, dando un resultado de 11.', NULL),
(68, 1, 'Si tienes 45 manzanas y las divides entre 9 personas, ¿cuántas manzanas recibe cada persona?', 'Cada persona recibe 5 manzanas (45 ÷ 9 = 5).', NULL),
(69, 1, '¿Cuál es el área de un cuadrado de lado 8 cm?', 'El área de un cuadrado se calcula como lado × lado. En este caso, 8 × 8 = 64 cm².', NULL),
(70, 1, '¿Qué número es el resultado de 9²?', 'El resultado de 9² (9 al cuadrado) es 81.', NULL),
(71, 1, '¿Cuánto es 3/4 de 16?', '3/4 de 16 es 12 (16 × 3 ÷ 4).', NULL),
(72, 1, '¿Cuál es el valor de la raíz cuadrada de 49?', 'La raíz cuadrada de 49 es 7.', NULL),
(73, 1, '¿Cuál es el mínimo común múltiplo de 4 y 6?', 'El mínimo común múltiplo de 4 y 6 es 12.', NULL),
(74, 1, 'Si un triángulo tiene lados de 3 cm, 4 cm y 5 cm, ¿qué tipo de triángulo es?', 'Es un triángulo rectángulo, ya que cumple con el teorema de Pitágoras (3² + 4² = 5²).', NULL),
(75, 1, '¿Cuál es el resultado de 8⁰?', 'Cualquier número elevado a la potencia de 0 es igual a 1.', NULL),
(76, 1, '¿Cuánto es 25% de 200?', 'El 25% de 200 es 50 (200 × 0.25).', NULL),
(77, 1, 'Si un rectángulo tiene una longitud de 12 cm y un ancho de 5 cm, ¿cuál es su perímetro?', 'El perímetro se calcula como 2 × (largo + ancho). En este caso, 2 × (12 + 5) = 34 cm.', NULL),
(78, 1, '¿Cuánto es 15 x 15?', 'El resultado de 15 × 15 es 225.', NULL),
(79, 1, 'Si un círculo tiene un radio de 7 cm, ¿cuál es su diámetro?', 'El diámetro de un círculo es el doble del radio, por lo que es 14 cm.', NULL),
(80, 1, '¿Cuál es el valor de 3³?', 'El resultado de 3³ (3 al cubo) es 27.', NULL),
(81, 1, '¿Cuál es el valor de 15 - (3 + 2 × 2)?', 'Siguiendo la jerarquía de operaciones, primero se multiplica 2 × 2 = 4, luego se suma 3 + 4 = 7, y finalmente se resta 15 - 7 = 8.', NULL),
(82, 1, '¿Cuánto es la raíz cuadrada de 121?', 'La raíz cuadrada de 121 es 11.', NULL),
(83, 1, 'Si un número es divisible por 2 y por 3, ¿por cuál de los siguientes números también es divisible?', 'Si un número es divisible por 2 y por 3, también es divisible por 6.', NULL),
(84, 1, '¿Cuál es la fracción equivalente a 0.75?', 'La fracción equivalente a 0.75 es 3/4.', NULL),
(85, 1, 'Si tienes un préstamo de $2000 y pagas el 10% de interés, ¿cuánto será el interés?', 'El interés sería $200 (2000 × 0.10).', NULL),
(86, 1, '¿Cuánto es 4/5 de 25?', '4/5 de 25 es 20 (25 × 4 ÷ 5).', NULL),
(87, 1, '¿Cuál es el valor de 6 + (4 × 2) - 3?', 'Siguiendo la jerarquía de operaciones, primero se multiplica 4 × 2 = 8, luego se suma 6 + 8 = 14, y finalmente se resta 14 - 3 = 11.', NULL),
(88, 1, '¿Cuál es el resultado de 144 ÷ 12?', 'El resultado de 144 ÷ 12 es 12.', NULL),
(89, 1, '¿Cuánto es el 40% de 250?', 'El 40% de 250 es 100 (250 × 0.40).', NULL),
(90, 1, '¿Cuántos lados tiene un octágono?', 'Un octágono tiene 8 lados.', NULL),
(91, 1, '¿Qué número es el resultado de 5⁴?', NULL, NULL),
(92, 1, '¿Cuánto es la raíz cuadrada de 64?', NULL, NULL),
(93, 1, '¿Cuál es el máximo común divisor de 18 y 24?', NULL, NULL),
(94, 1, '¿Cuál es el valor de π aproximadamente?', NULL, NULL),
(95, 1, '¿Cuánto es 2⁵?', NULL, NULL),
(96, 1, 'Si una camisa cuesta $50 y tiene un descuento del 20%, ¿cuál es el precio final?', NULL, NULL),
(97, 1, '¿Cuál es el perímetro de un triángulo equilátero de lado 9 cm?', NULL, NULL),
(98, 2, '¿Qué tipo de energía utilizan las plantas para realizar la fotosíntesis?', NULL, NULL),
(99, 2, '¿Cuál es el planeta más grande del sistema solar?', NULL, NULL),
(100, 2, '¿Cuál es el principal gas que compone la atmósfera terrestre?', NULL, NULL),
(101, 2, '¿Qué órganos del cuerpo humano se encargan de filtrar la sangre?', NULL, NULL),
(102, 2, '¿Cuál es el metal más abundante en la corteza terrestre?', NULL, NULL),
(103, 2, '¿Qué estudia la ecología?', NULL, NULL),
(104, 2, '¿Cuál es el proceso mediante el cual las células obtienen energía de los nutrientes?', NULL, NULL),
(105, 2, '¿Qué tipo de roca se forma a partir de lava enfriada?', NULL, NULL),
(106, 2, '¿Cuál de los siguientes es un ejemplo de un vertebrado?', NULL, NULL),
(107, 2, '¿Qué científico desarrolló la teoría de la relatividad?', NULL, NULL),
(108, 2, '¿Qué planeta es conocido como el \"Planeta Rojo\"?', NULL, NULL),
(109, 2, '¿Qué partículas subatómicas tienen carga negativa?', NULL, NULL),
(110, 2, '¿Cuál es la unidad básica de la vida?', NULL, NULL),
(111, 2, '¿Qué proceso permite que el agua de los océanos se convierta en vapor y suba a la atmósfera?', NULL, NULL),
(112, 2, '¿Qué capa de la Tierra está compuesta principalmente de hierro y níquel y se encuentra en el centro?', NULL, NULL),
(113, 2, '¿Cuál de estos es un mamífero marino?', NULL, NULL),
(114, 2, '¿Qué nombre reciben los cambios de estado de sólido a gas sin pasar por el estado líquido?', NULL, NULL),
(115, 2, '¿Qué tipo de organismo produce su propio alimento a través de la fotosíntesis?', NULL, NULL),
(116, 2, '¿Cuál es la función principal de los glóbulos rojos?', NULL, NULL),
(117, 2, '¿En qué estado de la materia se encuentra el helio en condiciones normales?', NULL, NULL),
(118, 2, '¿Cuál es la unidad de medida de la fuerza en el Sistema Internacional de Unidades?', NULL, NULL),
(119, 2, '¿Qué gas es esencial para la respiración de la mayoría de los organismos?', NULL, NULL),
(120, 2, '¿Cuál es el metal más ligero?', NULL, NULL),
(121, 2, '¿Cuál es el componente principal de los huesos?', NULL, NULL),
(122, 2, '¿Cómo se llama el proceso de dividir una célula en dos células hijas idénticas?', NULL, NULL),
(123, 2, '¿Qué sustancia es conocida como el \"disolvente universal\"?', NULL, NULL),
(124, 2, '¿Qué estudia la paleontología?', NULL, NULL),
(125, 2, '¿Qué organismo causa la malaria?', NULL, NULL),
(126, 2, '¿Cuál es el órgano más grande del cuerpo humano?', NULL, NULL),
(127, 2, '¿Qué científicos propusieron el modelo de doble hélice del ADN?', NULL, NULL),
(128, 2, '¿Qué parte de la planta se encarga de absorber el agua y los nutrientes del suelo?', NULL, NULL),
(129, 3, '¿En qué deporte se utiliza un balón ovalado?', NULL, NULL),
(130, 3, '¿Cuántos jugadores forman un equipo de baloncesto en la cancha?', NULL, NULL),
(131, 3, '¿Cuál es el evento deportivo que se celebra cada cuatro años y reúne a atletas de todo el mundo?', NULL, NULL),
(132, 3, '¿Cuántos sets debe ganar un jugador para llevarse el partido en un juego de tenis masculino de Grand Slam?', NULL, NULL),
(133, 3, '¿En qué deporte se utiliza un bate?', NULL, NULL),
(134, 3, '¿Quién es conocido como “El Fenómeno” en el mundo del fútbol?', NULL, NULL),
(135, 3, '¿Quién es conocido como “El Androide” en el mundo del fútbol?', NULL, NULL),
(136, 3, '¿En qué deporte se compite en la Fórmula 1?', NULL, NULL),
(137, 3, '¿Cuál es el país de origen del deporte llamado sumo?', NULL, NULL),
(138, 3, '¿En qué país se originaron los Juegos Olímpicos?', NULL, NULL),
(139, 3, '¿Cuántos puntos vale un tiro libre en el baloncesto?', NULL, NULL),
(140, 3, '¿Qué deporte se practica en el Tour de Francia?', NULL, NULL),
(141, 3, '¿En qué deporte se utiliza el término \"trique\"?', NULL, NULL),
(142, 3, '¿Qué jugador de baloncesto es conocido como \"Su Majestad del Aire\"?', NULL, NULL),
(143, 3, '¿Cuántos anillos olímpicos hay en la bandera de los Juegos Olímpicos?', NULL, NULL),
(144, 3, '¿Cuántos jugadores componen un equipo de voleibol en la cancha?', NULL, NULL),
(145, 3, '¿Cuál es la carrera de automovilismo más famosa de Mónaco?', NULL, NULL),
(146, 3, '¿Qué tenista ha ganado el mayor número de títulos de Grand Slam en individuales masculinos (hasta 2023)?', NULL, NULL),
(147, 3, '¿En qué año se celebró la primera Copa Mundial de Fútbol?\r\n', NULL, NULL),
(148, 3, '¿Cuántos jugadores hay en un equipo de rugby en el campo?', NULL, NULL),
(149, 3, '¿En qué deporte se juega con una pelota amarilla y una raqueta?', NULL, NULL),
(150, 3, '¿Qué equipo de la NBA tiene el mayor número de campeonatos hasta la fecha?', NULL, NULL),
(151, 3, '¿Qué deporte acuático incluye la prueba de \"mariposa\"?', NULL, NULL),
(152, 3, '¿Cuál es el nombre del trofeo otorgado al ganador del Super Bowl?', NULL, NULL),
(153, 3, '¿En qué deporte se otorga la \"Chaqueta Verde\"?', NULL, NULL),
(154, 3, '¿Qué país ganó la Copa Mundial de Fútbol en 1998?', NULL, NULL),
(155, 3, '¿Qué país ganó la Copa Mundial de Fútbol en 2006?', NULL, NULL),
(156, 3, '¿Qué deporte es famoso por el uso de un \"punk\"?', NULL, NULL),
(157, 3, '¿Qué tenista femenina ha ganado más títulos de Grand Slam en la historia?', NULL, NULL),
(158, 3, '¿En qué deporte se utiliza una bola llamada \"shuttlecock\"?', NULL, NULL),
(159, 3, '¿En qué deporte sobresalió el atleta Usain Bolt?', NULL, NULL),
(160, 4, '¿Cuál de las siguientes palabras lleva tilde?', NULL, NULL),
(161, 4, '¿Cuál es el antónimo de “pequeño”?', NULL, NULL),
(162, 4, '¿Cuál es el sujeto en la oración “María compra un libro”?', NULL, NULL),
(163, 4, '¿Qué tipo de palabra es “rápidamente”?', NULL, NULL),
(164, 4, '¿Cuál es el tiempo verbal de “yo comía”?', NULL, NULL),
(165, 4, '¿Cuál es el significado de la palabra “cotidiano”?', NULL, NULL),
(166, 4, '¿Cuál de estas palabras es un pronombre personal?', NULL, NULL),
(167, 4, '¿Qué tipo de palabra es “libertad”?', NULL, NULL),
(168, 4, '¿Qué tipo de palabra es “lluvioso”?', NULL, NULL),
(169, 4, '¿Cuál de las siguientes es una oración en futuro?', NULL, NULL),
(170, 4, '¿Qué significa el refrán “a quien madruga, Dios le ayuda”?', NULL, NULL),
(171, 4, '¿Qué tipo de palabra es “rápidamente”?', NULL, NULL),
(172, 4, '¿Cuál es el plural de “lápiz”?', NULL, NULL),
(173, 4, '¿Qué significa el prefijo “pre” en la palabra “predecir”?', NULL, NULL),
(174, 4, '¿Cuál es el sujeto en la oración “El perro corre rápido”?', NULL, NULL),
(175, 4, '¿Cuál de las siguientes palabras es una conjunción?', NULL, NULL),
(176, 4, '¿Cuál es el antónimo de “optimista”?', NULL, NULL),
(177, 4, '¿Qué significa “echar leña al fuego”?', NULL, NULL),
(178, 4, '¿Cuál de los siguientes es un pronombre demostrativo?', NULL, NULL),
(179, 4, '¿Cuál es el sinónimo de la palabra “amistad”?', NULL, NULL),
(180, 4, '¿Cuál es la conjugación correcta del verbo “ir” en primera persona del singular en presente?', NULL, NULL),
(181, 4, '¿Cuál es el antónimo de “delgado”?', NULL, NULL),
(182, 4, '¿Qué tipo de palabra es “paz”?', NULL, NULL),
(183, 4, '¿Cuál de estas opciones es un adjetivo calificativo?', NULL, NULL),
(184, 4, '¿Qué tiempo verbal es “él cantará”?', NULL, NULL),
(185, 4, '¿Cuál es el plural de “raíz”?', NULL, NULL),
(186, 4, '¿Cuál es el sinónimo de “valiente”?', NULL, NULL),
(187, 4, '¿Cuál de las siguientes palabras es una preposición?', NULL, NULL),
(188, 4, '¿Cuál es el sujeto en la oración “Los estudiantes estudian para el examen”?', NULL, NULL),
(189, 4, '¿Qué significa el prefijo “sub” en la palabra “submarino”?', NULL, NULL),
(190, 4, '¿Cuál de las siguientes palabras es un adverbio de tiempo?', NULL, NULL),
(191, 5, '¿Quién fue el primer presidente de Estados Unidos?', NULL, NULL),
(192, 5, '¿En qué año llegó Cristóbal Colón a América?', NULL, NULL),
(193, 5, '¿Cuál fue la primera civilización en desarrollar un sistema de escritura?', NULL, NULL),
(194, 5, '¿Qué imperio construyó el Coliseo en Roma?', NULL, NULL),
(195, 5, '¿Quién fue el líder militar y emperador francés que conquistó gran parte de Europa a principios del siglo XIX?', NULL, NULL),
(196, 5, '¿Qué civilización construyó las pirámides de Giza?', NULL, NULL),
(197, 5, '¿En qué año comenzó la Primera Guerra Mundial?', NULL, NULL),
(198, 5, '¿Quién fue el líder de la independencia de la India a través de la resistencia pacífica?', NULL, NULL),
(199, 5, '¿Cuál fue el nombre de la guerra que enfrentó a los Estados del Norte y del Sur en Estados Unidos?', NULL, NULL),
(200, 5, '¿Qué documento firmó el rey Juan de Inglaterra en 1215 que limitaba su poder?', NULL, NULL),
(201, 5, '¿Quién fue el emperador que dividió el Imperio Romano en dos partes?', NULL, NULL),
(202, 5, '¿En qué año comenzó la Revolución Francesa?', NULL, NULL),
(203, 5, '¿Qué cultura mesoamericana construyó la ciudad de Tenochtitlan?', NULL, NULL),
(204, 5, '¿Qué país fue el primero en enviar un satélite artificial al espacio?', NULL, NULL),
(205, 5, '¿Cuál fue el conflicto bélico que llevó a la creación de la Organización de las Naciones Unidas?', NULL, NULL),
(206, 5, '¿Quién fue el líder de la Revolución Cubana?', NULL, NULL),
(207, 5, '¿En qué año se independizó México de España?', NULL, NULL),
(208, 5, '¿Cuál fue el primer país en utilizar armas nucleares en un conflicto?', NULL, NULL),
(209, 5, '¿Qué evento marca tradicionalmente el fin de la Edad Media?', NULL, NULL),
(210, 5, '¿Quién fue el último emperador del Imperio Romano de Occidente?', NULL, NULL),
(211, 5, '¿Cuál de los siguientes países fue neutral durante la Segunda Guerra Mundial?', NULL, NULL),
(212, 5, '¿Qué faraón mandó construir la Gran Pirámide de Guía?', NULL, NULL),
(213, 5, '¿Cuál fue el motivo principal de la Guerra de los Treinta Años?', NULL, NULL),
(214, 5, '¿Qué país colonizó gran parte de América del Sur en el siglo XVI?', NULL, NULL),
(215, 5, '¿Quién fue conocido como el “Libertador” de América Latina?', NULL, NULL),
(216, 5, '¿Cuál fue el último país de América en abolir la esclavitud?', NULL, NULL),
(217, 5, '¿Qué evento histórico tuvo lugar en 1066?', NULL, NULL),
(218, 5, '¿En qué año se firmó la Declaración de Independencia de los Estados Unidos?', NULL, NULL),
(219, 5, '¿Quién fue el primer emperador de China?', NULL, NULL),
(220, 5, '¿Qué país fue invadido, desencadenando la Segunda Guerra Mundial?', NULL, NULL),
(221, 5, '¿Cuál fue el principal conflicto entre Estados Unidos y la Unión Soviética después de la Segunda Guerra Mundial?', NULL, NULL),
(222, 6, '¿Qué mide la tasa de desempleo?', NULL, NULL),
(223, 6, '¿Qué es la oferta agregada?', NULL, NULL),
(224, 6, '¿Qué es la competencia perfecta?', NULL, NULL),
(225, 6, '¿Qué es la curva de demanda?', NULL, NULL),
(226, 6, '¿Qué es el costo de oportunidad?', NULL, NULL),
(227, 6, '¿Cuál es el propósito de la política fiscal?', NULL, NULL),
(228, 6, '¿Qué es un monopolio?', NULL, NULL),
(229, 6, '¿Qué es el IPC?', NULL, NULL),
(230, 6, '¿Qué es el efecto sustitución?', NULL, NULL),
(231, 6, '¿Qué es el capital humano?', NULL, NULL),
(232, 6, '¿Qué es una externalidad negativa?', NULL, NULL),
(233, 6, '¿Qué es el mercado de factores de producción?', NULL, NULL),
(234, 6, '¿Qué es una recesión económica?', NULL, NULL),
(235, 6, '¿Qué es el mercado de valores?', NULL, NULL),
(236, 6, '¿Qué es el tipo de cambio?', NULL, NULL),
(237, 6, '¿Qué es un producto de lujo?', NULL, NULL),
(238, 6, '¿Qué es la curva de Láser?', NULL, NULL),
(239, 6, '¿Qué es el \"mercado de trabajo\"?', NULL, NULL),
(240, 6, '¿Qué es un \"bien inferior\"?', NULL, NULL),
(241, 6, '¿Qué es una \"devaluación\" de la moneda?', NULL, NULL),
(242, 6, '¿Qué es el \"crecimiento económico\"?', NULL, NULL),
(243, 6, '¿Qué es el \"mercado de bienes y servicios\"?', NULL, NULL),
(244, 6, '¿Qué es una \"economía de mercado\"?', NULL, NULL),
(245, 6, '¿Qué es el \"fonetismo\"?', NULL, NULL),
(246, 6, '¿Qué es una \"empresa oligopólica\"?', NULL, NULL),
(247, 6, '¿Qué es una \"política monetaria expansiva\"?', NULL, NULL),
(248, 6, '¿Qué es el \"déficit fiscal\"?', NULL, NULL),
(249, 6, '¿Qué Un período de deflación prolongadas una \"burbuja económica\"?', NULL, NULL),
(250, 6, '¿Qué es el \"índice de Gini\"?', NULL, NULL),
(251, 6, '¿Qué es una \"política monetaria contractiva\"?', NULL, NULL),
(252, 6, '¿Qué es el \"ajuste estructural\"?', NULL, NULL),
(253, 7, '¿Qué operador se usa para obtener el residuo de una división en Python?', NULL, NULL),
(254, 7, '¿Cuál de las siguientes opciones es un tipo de dato mutable en Python?', NULL, NULL),
(255, 7, '¿Qué palabra clave se usa para crear una condición en Python?', NULL, NULL),
(256, 7, '¿Qué devuelve la función en(\"Hola Mundo\") en Python?', NULL, NULL),
(257, 7, 'En Java, ¿Qué tipo de variable puede contener un número decimal?', NULL, NULL),
(258, 7, '¿Cuál de las siguientes es una biblioteca para crear interfaces gráficas en Python?', NULL, NULL),
(259, 7, '¿Cuál es el resultado de la operación 5 == \'5\' en JavaScript?', NULL, NULL),
(260, 7, '¿Cómo se escribe un comentario de una sola línea en Python?', NULL, NULL),
(261, 7, '¿Qué palabra clave se usa para iniciar un bucle en Python?\r\n\r\n', NULL, NULL),
(262, 7, '¿Qué palabra clave se usa en C++ para declarar una constante?', NULL, NULL),
(263, 7, '¿Qué se usa en SQL para obtener todos los registros de una tabla?', NULL, NULL),
(264, 7, '¿Qué tipo de dato se usa para almacenar una cadena de texto en Python?', NULL, NULL),
(265, 7, '¿Cuál de los siguientes no es un tipo de dato en Python?', NULL, NULL),
(266, 7, '¿Qué tipo de dato es Nueve en Python?', NULL, NULL),
(267, 7, '¿Cuál es el método que se usa para añadir un elemento al final de una lista en Python?', NULL, NULL),
(268, 7, '¿Qué palabra clave se usa para manejar excepciones en Python?', NULL, NULL),
(269, 7, '¿Qué es una excepción en programación?', NULL, NULL),
(270, 7, '¿Qué método se usa para obtener el valor de una clave en un diccionario sin generar un error si la clave no existe?', NULL, NULL),
(271, 7, '¿Cómo se declara una variable global dentro de una función en Python?', NULL, NULL),
(272, 7, '¿Qué hace la función joya() en Python?', NULL, NULL),
(273, 7, '¿Qué palabra clave se usa para definir una clase en Python?\r\n\r\n', NULL, NULL),
(274, 7, '¿Cuál es la extensión de archivo estándar para scripts de Python?', NULL, NULL),
(275, 7, '¿Qué tipo de dato es una tiple en Python?', NULL, NULL),
(276, 7, '¿Cuál de los siguientes es un tipo de ciclo en C++?', NULL, NULL),
(277, 7, '¿Qué operador se usa para la concatenación de cadenas en Java?', NULL, NULL),
(278, 7, '¿Con cuál palabra se elimina una base de datos?', NULL, NULL),
(279, 7, '¿Qué tipo de estructura de datos es un set en Python?', NULL, NULL),
(280, 7, '¿Qué método se usa para convertir todos los caracteres de una cadena a minúsculas en Python?', NULL, NULL),
(281, 7, '¿Cuál es el método que se usa para combinar dos listas en Python?', NULL, NULL),
(282, 7, '¿Qué es el concepto de \"recursión\" en programación?', NULL, NULL),
(283, 7, '¿Cuál es el propósito de la declaración break en un ciclo en C?', NULL, NULL),
(284, 8, '¿Quién fue el autor de la obra filosófica El ser y la nada?', NULL, NULL),
(285, 8, '¿Qué evento histórico dio inicio a la Edad Contemporánea?', NULL, NULL),
(286, 8, '¿Cuál de los siguientes filósofos es considerado el padre del empirismo?', NULL, NULL),
(287, 8, '¿Qué pintor español es conocido por su obra Guernica?', NULL, NULL),
(288, 8, '¿En qué civilización se originó la filosofía y la democracia en Occidente?', NULL, NULL),
(289, 8, '¿Qué autor mexicano escribió Pedro Páramo?', NULL, NULL),
(290, 8, '¿En qué siglo vivió y desarrolló sus ideas filosóficas René Descartes?', NULL, NULL),
(291, 8, '¿Qué filósofo alemán es conocido por su teoría del \"superhombre\"?', NULL, NULL),
(292, 5, '¿Quién es el autor de El contrato social?', NULL, NULL),
(293, 8, '¿Qué escritor estadounidense es famoso por sus novelas sobre el \"Sueño Americano\" y la decadencia social?', NULL, NULL),
(294, 8, '¿En qué año terminó la Primera Guerra Mundial?', NULL, NULL),
(295, 8, '¿Qué movimiento artístico se caracteriza por la simplificación de formas y la búsqueda de la belleza en lo abstracto?', NULL, NULL),
(296, 8, '¿Quién es el autor de El origen de las especies?', NULL, NULL),
(297, 8, '¿Qué autor ruso escribió Crimen y castigo?', NULL, NULL),
(298, 8, '¿Qué pensador es conocido por sus investigaciones sobre el comportamiento humano y la teoría del psicoanálisis?', NULL, NULL),
(299, 8, '¿En qué continente se encuentran las ruinas de Machu Picchu?', NULL, NULL),
(300, 8, '¿Qué tipo de obra es La divina comedia de Dante?', NULL, NULL),
(301, 8, '¿Qué filósofo propuso la famosa máxima Pienso, luego existo?', NULL, NULL),
(302, 8, '¿Qué guerra tuvo lugar entre los años 1939 y 1945?', NULL, NULL),
(303, 8, '¿Quién escribió Las aventuras de Don Juan?', NULL, NULL),
(304, 8, '¿Qué pintor fue uno de los máximos exponentes del surrealismo?', NULL, NULL),
(305, 8, '¿Quién fue el autor de la obra La metamorfosis?', NULL, NULL),
(306, 8, '¿Qué filósofo griego fue maestro de Alejandro Magno?', NULL, NULL),
(307, 8, '¿Qué escritor francés es famoso por sus novelas de aventuras como Los tres mosqueteros?', NULL, NULL),
(308, 8, '¿En qué siglo vivió el escritor William Shakespeare?', NULL, NULL),
(309, 8, '¿Qué filósofo desarrolló la teoría del idealismo absoluto?', NULL, NULL),
(310, 8, '¿En qué país nació el escritor Gabriel García Márquez?', NULL, NULL),
(311, 8, '¿Cuál de estos autores no perteneció al movimiento literario del Boom latinoamericano?', NULL, NULL),
(312, 8, '¿Qué filósofo defendió la teoría de que la moral debe basarse en las leyes naturales y en la razón?', NULL, NULL),
(313, 8, '¿Qué obra de teatro es considerada uno de los máximos exponentes del teatro trágico griego y fue escrita por Sófocles?', NULL, NULL),
(314, 9, '¿Qué océano se encuentra al este de los Estados Unidos? ', NULL, NULL),
(315, 9, '¿Qué país tiene más población en el mundo? ', NULL, NULL),
(316, 9, '¿Cuál es el continente más pequeño en términos de superficie?', NULL, NULL),
(317, 9, '¿En qué país se encuentra el monte Everest?', NULL, NULL),
(318, 9, '¿Qué mar se encuentra entre Europa y África?', NULL, NULL),
(319, 9, '¿Cuál es el país más grande del mundo en términos de superficie?', NULL, NULL),
(320, 9, '¿Qué país está compuesto por más de 17,000 islas? ', NULL, NULL),
(321, 9, '¿Cuál es la capital de Australia? ', NULL, NULL),
(322, 9, '¿Qué océano se encuentra al oeste de Australia? ', NULL, NULL),
(323, 9, '¿Cuál es la capital de Canadá?', NULL, NULL),
(324, 9, '¿Qué país limita con Rusia al oeste y al sur? ', NULL, NULL),
(325, 9, '¿Qué isla es la más grande del mundo?', NULL, NULL),
(326, 9, '¿Qué país tiene una forma de bota?', NULL, NULL),
(327, 9, '¿En qué continente se encuentra el desierto de Atacama? ', NULL, NULL),
(328, 9, '¿Qué océano se encuentra entre América y Europa?', NULL, NULL),
(329, 9, '¿Cuál es el país más pequeño del mundo en términos de superficie?', NULL, NULL),
(330, 9, '¿Cuál es la capital de Brasil?', NULL, NULL),
(331, 9, '¿En qué país se encuentra el volcán Fragata?', NULL, NULL),
(332, 9, '¿Qué país es conocido como \"La Tierra del Sol Naciente\"?', NULL, NULL),
(333, 9, '¿Cuál es el continente más poblado?', NULL, NULL),
(334, 9, '¿En qué continente se encuentra el río Nilo?', NULL, NULL),
(335, 9, '¿Cuál es la montaña más alta de América del Norte?', NULL, NULL),
(336, 9, '¿Qué río atraviesa la ciudad de París?', NULL, NULL),
(337, 9, '¿Cuál es el país más grande de África?', NULL, NULL),
(338, 9, '¿En qué país se encuentran las famosas pirámides de Giza?', NULL, NULL),
(339, 9, '¿Cuál es la capital de Egipto?', NULL, NULL),
(340, 9, '¿Qué cordillera separa a Europa de Asia?', NULL, NULL),
(341, 9, '¿Cuál es el río más largo de Europa?', NULL, NULL),
(342, 9, '¿Qué continente tiene el desierto de Atacama?', NULL, NULL),
(343, 9, '¿En qué océano se encuentra la isla de Hawái?', NULL, NULL),
(344, 9, '¿Qué país tiene el mayor número de islas en el mundo?', NULL, NULL),
(345, 10, '¿Cuál es la presión arterial normal en un adulto?', NULL, NULL),
(346, 10, '¿Qué estructura del oído es responsable del equilibrio?', NULL, NULL),
(347, 10, '¿Cuál es el principal ion en el líquido extracelular?\r\n\r\n', NULL, NULL),
(348, 10, '¿Qué célula sanguínea es responsable de transportar oxígeno?', NULL, NULL),
(349, 10, '¿Qué hormona regula los niveles de calcio en la sangre?\r\n\r\n', NULL, NULL),
(350, 10, '¿Cuál es el pH normal de la sangre humana?', NULL, NULL),
(351, 10, '¿Qué órgano produce la bilis?', NULL, NULL),
(352, 10, '¿Qué glándula produce la hormona del crecimiento?', NULL, NULL),
(353, 10, '¿Cuál es el hueso más largo del cuerpo humano?\r\n\r\n', NULL, NULL),
(354, 10, '¿Qué parte del cerebro controla las funciones vitales como la respiración y la frecuencia cardíaca?', NULL, NULL),
(355, 10, '¿Qué tipo de célula es responsable de la respuesta inmunitaria?', NULL, NULL),
(356, 10, '¿Qué tipo de articulación es la rodilla?', NULL, NULL),
(357, 10, '¿Qué proteína es responsable del transporte de oxígeno en la sangre?', NULL, NULL),
(358, 10, '¿Qué órgano del sistema digestivo es responsable de la absorción de nutrientes?', NULL, NULL),
(359, 10, '¿Cuál es la causa más común de insuficiencia renal crónica?', NULL, NULL),
(360, 10, '¿Qué enfermedad está asociada con una deficiencia de vitamina C?', NULL, NULL),
(361, 10, '¿Qué tipo de célula produce anticuerpos?', NULL, NULL),
(362, 10, '¿Cuál es el valor normal de la glucosa en sangre en ayunas?', NULL, NULL),
(363, 10, '¿Qué glándula produce adrenalina?', NULL, NULL),
(364, 10, '¿Qué tipo de tejido conecta los músculos a los huesos?', NULL, NULL),
(365, 10, '¿Qué estructura del ojo controla la cantidad de luz que entra?', NULL, NULL),
(366, 10, '¿Cuál es el componente principal de la hemoglobina?', NULL, NULL),
(367, 10, '¿Qué sistema del cuerpo humano incluye las glándulas que regulan hormonas?\r\n\r\n', NULL, NULL),
(368, 10, '¿Qué órgano está afectado en la hepatitis?', NULL, NULL),
(369, 10, '¿Qué tipo de leucocito es el más abundante en la sangre?', NULL, NULL),
(370, 10, '¿Qué enfermedad es conocida como hipertensión?', NULL, NULL),
(371, 10, '¿Qué estructura del sistema respiratorio es la responsable de la fonación?\r\n\r\n', NULL, NULL),
(372, 10, '¿Qué enfermedad es causada por la deficiencia de vitamina D en niños?', NULL, NULL),
(373, 10, '¿Cuál es el principal componente del plasma sanguíneo?', NULL, NULL),
(374, 10, '¿Qué tipo de infección es tratada con antibióticos?', NULL, NULL),
(375, 10, '¿Qué músculo es responsable de la respiración?', NULL, NULL),
(376, 11, '¿Cuál es la moneda oficial del Reino Unido?', NULL, NULL),
(377, 11, '¿En qué año se hundió el Titanic?', NULL, NULL),
(378, 11, '¿Qué órgano del cuerpo humano consume más energía?', NULL, NULL),
(379, 11, '¿Cuál es la fórmula química del agua?', NULL, NULL),
(380, 11, '¿En qué año llegó el hombre a la Luna por primera vez?', NULL, NULL),
(381, 11, '¿Cuál es el metal más ligero?', NULL, NULL),
(382, 11, '¿Quién escribió \"Romeo y Julieta\"?', NULL, NULL),
(383, 11, '¿Cuál es el animal terrestre más rápido?', NULL, NULL),
(384, 11, '¿Qué inventó Alexander Graham Bell?', NULL, NULL),
(385, 11, '¿Qué país tiene la torre inclinada de Pisa?', NULL, NULL),
(386, 11, '¿Quién fue el primer hombre en orbitar la Tierra?', NULL, NULL),
(387, 11, '¿Cuál es el idioma oficial de Egipto?', NULL, NULL),
(388, 11, '¿Cuál es el autor de \"La Odisea\"?', NULL, NULL),
(389, 11, '¿Cuál es el segundo planeta más cercano al Sol?', NULL, NULL),
(390, 11, '¿Qué instrumento mide los terremotos?', NULL, NULL),
(391, 11, '¿Cuál es el animal más grande del mundo?\r\n\r\n', NULL, NULL),
(392, 11, '¿Quién es el autor de \"La Divina Comedia\"?', NULL, NULL),
(393, 11, '¿Qué país es famoso por la Torre del Reloj Big Ben?', NULL, NULL),
(394, 11, '¿Quién descubrió la penicilina?', NULL, NULL),
(395, 11, '¿Cuál es la capital de Noruega?', NULL, NULL),
(396, 11, '¿Qué se celebra el 5 de mayo en México?', NULL, NULL),
(397, 11, '¿Quién es el director de la película \"Titanic\"?', NULL, NULL),
(398, 11, '¿Qué país produce más café en el mundo?', NULL, NULL),
(399, 11, '¿En qué ciudad se encuentra la Estatua de la Libertad?', NULL, NULL),
(400, 11, '¿Cuál es el símbolo químico del oro?', NULL, NULL),
(401, 11, '¿Quién fue el autor de \"La Metamorfosis\"?', NULL, NULL),
(402, 11, '¿Qué país es conocido por la samba y el carnaval?', NULL, NULL),
(403, 11, '¿Cuál es el idioma oficial de Irán?', NULL, NULL),
(404, 11, '¿Qué descubrimiento es atribuido a Marie Curie?', NULL, NULL),
(405, 11, '¿Cuál es el metal más abundante en la corteza terrestre?', NULL, NULL),
(406, 11, '¿Cuál es el animal nacional de Australia?', NULL, NULL),
(407, 12, '¿Cuál es la técnica artística que utiliza pequeños puntos para crear una imagen?', NULL, NULL),
(408, 12, '¿Cuál es el famoso museo ubicado en París que alberga la Mona Lisa?', NULL, NULL),
(409, 12, '¿Cuál de estas obras es una pintura de Salvador Dalí?', NULL, NULL),
(410, 12, '¿Cuál es el nombre del escultor del \"David\" en Florencia?', NULL, NULL),
(411, 12, '¿Qué movimiento artístico es conocido por su uso de formas geométricas abstractas?\r\n\r\n', NULL, NULL),
(412, 12, '¿En qué país se originó el teatro No?\r\n\r\n', NULL, NULL),
(413, 12, '¿Qué artista es conocido por sus girasoles y autorretratos?\r\n\r\n', NULL, NULL),
(414, 12, '¿Qué arquitectura es un ejemplo de estilo gótico?', NULL, NULL),
(415, 12, '¿Cuál es el nombre del famoso ballet compuesto por Chaikovski?', NULL, NULL),
(416, 12, '¿Quién es conocido como el padre del Renacimiento?', NULL, NULL),
(417, 12, '¿Qué estilo artístico se caracteriza por su énfasis en la luz y el color, y su rechazo a las reglas académicas tradicionales?', NULL, NULL),
(418, 12, '¿En qué país se encuentra el Museo del Prado?', NULL, NULL),
(419, 12, '¿Qué obra maestra fue creada por Pablo Picasso en 1937?', NULL, NULL),
(420, 12, '¿Cuál es el nombre del famoso autor de la ópera \"La Traviata\"?', NULL, NULL),
(421, 12, '¿Qué técnica utiliza el artista para raspar tinta en una placa de metal y luego imprimir la imagen en papel?', NULL, NULL),
(422, 12, '¿Cuál de los siguientes artistas es conocido por sus esculturas móviles?', NULL, NULL),
(423, 12, '¿Qué movimiento artístico fue fundado por André Breton?', NULL, NULL),
(424, 12, '¿Qué estructura fue diseñada por Antoni Gaudí en Barcelona?', NULL, NULL),
(425, 12, '¿Qué artista es famoso por sus pinturas de bailarinas?', NULL, NULL),
(426, 12, '¿Qué famosa pintura de Leonardo da Vinci muestra a una mujer con una sonrisa enigmática?', NULL, NULL),
(427, 12, '¿Cuál es el estilo arquitectónico de la Basílica de San Pedro en Roma?', NULL, NULL),
(428, 12, '¿Qué compositor es conocido por su obra \"El arte de la fuga\"?', NULL, NULL),
(429, 12, '¿En qué estilo artístico se destaca Henri Matisse?', NULL, NULL),
(430, 12, '¿Qué famoso escultor italiano creó \"La Poeta\"?', NULL, NULL),
(431, 12, '¿Cuál es el principal componente en la técnica de fresco?', NULL, NULL),
(432, 12, '¿Qué dramaturgo escribió \"Hamlet\"?', NULL, NULL),
(433, 12, '¿En qué país se originó el movimiento artístico conocido como \"Impresionismo\"?', NULL, NULL),
(434, 12, '¿Qué obra es un ejemplo del estilo barroco de Caravaggio?', NULL, NULL),
(435, 12, '¿Cuál es el nombre del ballet compuesto por Igor Stravinski?', NULL, NULL),
(436, 12, '¿Qué técnica artística involucra la pintura en cera caliente?', NULL, NULL),
(437, 12, '¿Qué arquitecto diseñó el edificio Fallingwater?', NULL, NULL),
(438, 12, '¿Qué movimiento artístico fue fundado por Wassim Kandinsky?', NULL, NULL),
(439, 13, '¿Qué significa \"IoT\"?', NULL, NULL),
(440, 13, '¿Cuál es el sistema operativo más utilizado en computadoras personales?', NULL, NULL),
(441, 13, '¿Qué es el almacenamiento en la nube?', NULL, NULL),
(442, 13, '¿Qué lenguaje de programación es conocido por su simplicidad y uso en enseñanza?', NULL, NULL),
(443, 13, '¿Qué es un software de código abierto?', NULL, NULL),
(444, 13, '¿Qué tipo de red es una WAN?', NULL, NULL),
(445, 13, '¿Qué dispositivo convierte señales digitales en analógicas para la transmisión de datos?', NULL, NULL),
(446, 13, '¿Cuál es el propósito principal de un antivirus?', NULL, NULL),
(447, 13, '¿Qué es la inteligencia artificial?', NULL, NULL),
(448, 13, '¿Qué componente es el cerebro de una computadora?', NULL, NULL),
(449, 13, '¿Qué significa URL?', NULL, NULL),
(450, 13, '¿Qué es un bit?', NULL, NULL),
(451, 13, '¿Qué significa \"HTML\"?', NULL, NULL),
(452, 13, '¿Qué es un sistema operativo?', NULL, NULL),
(453, 13, '¿Qué es el phishing?', NULL, NULL),
(454, 13, '¿Qué es la realidad aumentada?', NULL, NULL),
(455, 13, '¿Qué es el 5G?', NULL, NULL),
(456, 13, '¿Qué es un algoritmo?', NULL, NULL),
(457, 13, '¿Qué es el blockchain?', NULL, NULL),
(458, 13, '¿Qué significa CPU?', NULL, NULL),
(459, 13, '¿Qué significa la sigla SSD?', NULL, NULL),
(460, 13, '¿Cuál es el navegador más utilizado en el mundo (2024)?', NULL, NULL),
(461, 13, '¿Qué es el machine learning?', NULL, NULL),
(462, 13, '¿Qué es una dirección IP?', NULL, NULL),
(463, 13, '¿Qué función realiza un Twitch en una red?', NULL, NULL),
(464, 13, '¿Qué es un pixel?', NULL, NULL),
(465, 13, '¿Cuál es un ejemplo de una dirección MAC?', NULL, NULL),
(466, 13, '¿Qué es un servidor web?', NULL, NULL),
(467, 13, '¿Qué es un archivo comprimido?', NULL, NULL),
(468, 13, '¿Qué es un bot?', NULL, NULL),
(469, 13, '¿Qué es un dominio en internet?', NULL, NULL),
(470, 13, '¿Qué significa \"backup\"?', NULL, NULL),
(471, 11, '¿Cuál es la ley que describe la relación entre la fuerza, la masa y la aceleración?', NULL, NULL),
(472, 11, 'La energía cinética de un cuerpo es directamente proporcional a:', NULL, NULL),
(473, 11, 'Si un objeto está en equilibrio, ¿qué se puede concluir acerca de las fuerzas que actúan sobre él?', NULL, NULL),
(474, 11, 'La ley de Ohm establece que la corriente es directamente proporcional a:', NULL, NULL),
(475, 11, '¿Qué principio establece que la presión de un fluido es constante en todos los puntos de un recipiente cerrado y está en equilibrio?', NULL, NULL),
(476, 11, '¿Cuál es el número atómico del oxígeno?', NULL, NULL),
(477, 11, '¿Qué tipo de enlace se forma entre dos átomos de hidrógeno?', NULL, NULL),
(478, 11, '¿Qué compuesto es conocido como agua oxigenada?', NULL, NULL),
(479, 11, '¿Qué es un ácido según la teoría de Armenios?', NULL, NULL),
(480, 11, '¿Qué figura sigue en la secuencia: 1, 4, 9, 16, ...?', NULL, NULL),
(481, 11, 'Si un reloj marca las 2:00 PM, ¿qué hora marcaría si se le suman 280 minutos?', NULL, NULL),
(482, 11, '¿Cuál de los siguientes no es un número primo?', NULL, NULL),
(483, 11, 'Si una persona lee 10 páginas por minuto, ¿cuántas páginas leerá en 45 minutos?', NULL, NULL),
(484, 11, 'Si hoy es miércoles, ¿qué día será en 12 días?', NULL, NULL),
(485, 11, 'Si Pedro tiene 3 veces la edad de Juan y juntos suman 48 años, ¿qué edad tiene Pedro?', NULL, NULL),
(486, 11, 'Si un objeto tiene una velocidad constante, ¿qué se puede afirmar sobre la fuerza neta que actúa sobre él?', NULL, NULL),
(487, 11, '¿Qué cantidad física mide un Joule?', NULL, NULL),
(488, 11, '¿Qué gas se utiliza en los globos aerostáticos porque es menos denso que el aire?', NULL, NULL),
(489, 11, '¿Cuál es el componente básico de las proteínas?', NULL, NULL),
(490, 11, '¿Qué molécula transporta el oxígeno en la sangre?', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pregunta_encuesta`
--

CREATE TABLE `pregunta_encuesta` (
  `id_pregunta` int(11) NOT NULL,
  `id_encuesta` int(11) DEFAULT NULL,
  `texto` text DEFAULT NULL,
  `id_estatus_p` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pregunta_encuesta`
--

INSERT INTO `pregunta_encuesta` (`id_pregunta`, `id_encuesta`, `texto`, `id_estatus_p`) VALUES
(2, 1, '¿Cual es tu meta principal al usar esta plataforma?', 1),
(3, 1, '¿Cuanto tiempo podrias dedicar al estudio al dia?', 1),
(4, 1, '¿En que etapa estas actualmente?', 1),
(5, 1, '¿Te gustaria recibir recomendaciones personalizadas?', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pregunta_examen`
--

CREATE TABLE `pregunta_examen` (
  `id_examen` int(11) NOT NULL,
  `id_pregunta` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `respuesta`
--

CREATE TABLE `respuesta` (
  `id_respuesta` int(11) NOT NULL,
  `id_pregunta` int(11) NOT NULL,
  `respuesta` varchar(200) NOT NULL,
  `correcta` tinyint(1) NOT NULL,
  `puntos` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `respuesta`
--

INSERT INTO `respuesta` (`id_respuesta`, `id_pregunta`, `respuesta`, `correcta`, `puntos`) VALUES
(1, 1, '6', 1, 10),
(2, 2, '25 cm²', 1, 10),
(3, 3, 'Venus', 0, 0),
(4, 4, 'Oro', 0, 0),
(5, 5, 'LeBron James', 0, 0),
(6, 6, 'New York Yankees', 1, 10),
(7, 7, 'Enojado', 0, 0),
(8, 8, 'Una crítica', 0, 0),
(9, 9, 'México', 0, 0),
(10, 10, 'Vapor Guadalupeño, Vapor Moctezuma, Vapor 203 ', 0, 0),
(11, 11, 'Son leyes para el comercio internacional', 0, 0),
(12, 12, 'Hacer dinero', 0, 0),
(13, 13, 'Peroración Orientar Objetos', 0, 0),
(14, 14, 'Documentación', 1, 10),
(15, 15, 'Aristóteles', 0, 0),
(16, 16, ' El estudio de los planetas y estrellas', 0, 0),
(17, 17, 'Nilo', 1, 10),
(18, 18, 'América de Norte', 0, 0),
(19, 19, '206', 1, 10),
(20, 20, 'Vitamina C', 0, 0),
(21, 21, 'Español', 0, 0),
(22, 22, '1945', 0, 0),
(23, 23, 'Frida Kahlo ', 0, 0),
(24, 24, 'La Ronda de Noche', 0, 0),
(25, 25, 'Innovación de producto', 0, 0),
(26, 26, 'John Logie Baird', 1, 10),
(27, 27, 'Albert Einstein', 0, 0),
(28, 28, '34 cm', 1, 10),
(29, 29, '48%', 0, 0),
(30, 30, '40 kg', 0, 0),
(31, 31, 'Galileo', 1, 10),
(32, 32, 'Paladio', 0, 0),
(33, 33, '67', 0, 0),
(34, 34, '2 pasos', 0, 0),
(35, 35, 'Alemania', 0, 0),
(36, 36, '8', 0, 0),
(37, 37, 'Bonita', 1, 10),
(38, 38, 'Rápidamente', 0, 0),
(39, 39, 'Narrativo', 0, 0),
(40, 40, '1945', 0, 0),
(41, 41, '1908', 0, 0),
(42, 42, 'Canadá', 0, 0),
(43, 43, 'El aislamiento de los mercados internacionales', 0, 0),
(44, 44, 'El valor total de todos los bienes y servicios producidos en un país durante un año', 1, 10),
(45, 45, 'La reducción del poder adquisitivo de una moneda', 0, 0),
(46, 46, 'De función():', 0, 0),
(47, 47, 'Un bucle que se ejecuta solo una vez', 0, 0),
(48, 48, 'Un tipo de error que ocurre en tiempo de ejecución', 0, 0),
(49, 49, 'Sigmund Freud', 1, 10),
(50, 50, 'Un periodo de revolución industrial', 0, 0),
(51, 51, 'Biología', 0, 0),
(52, 52, 'Jordania', 1, 10),
(53, 53, 'Bruselas', 0, 0),
(54, 54, 'Chisináu', 0, 0),
(55, 55, 'Ankara', 0, 0),
(56, 56, 'Neuronas', 0, 0),
(57, 57, 'Estómago', 0, 0),
(58, 58, 'Bacteria', 1, 10),
(59, 59, 'Sídney', 0, 0),
(60, 60, 'Japón', 1, 10),
(61, 61, '1492', 0, 0),
(62, 62, 'Azul, amarillo,naranja', 0, 0),
(63, 63, 'Verde, morado,azul', 0, 0),
(64, 64, 'México', 0, 0),
(65, 65, 'Alan Turing', 1, 10),
(66, 66, 'Parte física que compone una computadora', 1, 10),
(67, 67, '16', 0, 0),
(68, 68, '9', 1, 10),
(69, 69, '16 cm²', 0, 0),
(70, 70, '18', 0, 0),
(71, 71, '8', 0, 0),
(72, 72, '8', 0, 0),
(73, 73, '12', 1, 10),
(74, 74, 'Equilátero', 0, 0),
(75, 75, '0', 0, 0),
(76, 76, '25', 0, 0),
(77, 77, '34', 0, 0),
(78, 78, '150', 0, 0),
(79, 79, '10.5 cm', 0, 0),
(80, 80, '6', 0, 0),
(81, 81, '9', 0, 0),
(82, 82, '10', 0, 0),
(83, 83, '3', 0, 0),
(84, 84, '1/4', 0, 0),
(85, 85, '$100', 0, 0),
(86, 86, '10', 0, 0),
(87, 87, '11', 1, 10),
(88, 88, '10', 0, 0),
(89, 89, '80', 0, 0),
(90, 90, '12', 0, 0),
(91, 91, '125', 0, 0),
(92, 92, '64', 0, 0),
(93, 93, '3', 0, 0),
(94, 94, '2.1416', 0, 0),
(95, 95, '32', 1, 10),
(96, 96, '$80', 0, 0),
(97, 97, '18 cm', 0, 0),
(98, 98, 'Energía térmica\r\n', 0, 0),
(99, 99, 'Saturno', 0, 0),
(100, 100, 'Oxígeno', 0, 0),
(101, 101, 'Pulmones', 0, 0),
(102, 102, 'Hierro', 0, 0),
(103, 103, 'Los astros y el universo', 0, 0),
(104, 104, 'Fotosíntesis', 0, 0),
(105, 105, 'Sedimentaria', 0, 0),
(106, 106, 'Araña', 0, 0),
(107, 107, 'Isaac Newton\r\n', 0, 0),
(108, 108, 'Marte ', 1, 10),
(109, 109, 'Protones', 0, 0),
(110, 110, 'Átomo', 0, 0),
(111, 111, 'Transpiración', 0, 0),
(112, 112, 'Corteza', 0, 0),
(113, 113, 'Tiburón', 0, 0),
(114, 114, 'Evaporación', 0, 0),
(115, 115, 'Carnívoro', 0, 0),
(116, 116, 'Transportar oxígeno', 1, 10),
(117, 117, 'Sólido', 0, 0),
(118, 118, 'Julio', 0, 0),
(119, 119, 'Nitrógeno', 0, 0),
(120, 120, 'Sodio', 0, 0),
(121, 121, 'Carbono', 0, 0),
(122, 122, 'Mitosis ', 1, 10),
(123, 123, 'Ácido clorhídrico', 0, 0),
(124, 124, 'El clima y el tiempo', 0, 0),
(125, 125, 'Bacteria', 0, 0),
(126, 126, 'Hígado', 0, 0),
(127, 127, 'Newton y Galileo', 0, 0),
(128, 128, 'Tallo', 0, 0),
(129, 129, 'Fútbol', 0, 0),
(130, 130, '7', 0, 0),
(131, 131, 'La Copa Mundial de Fútbol', 0, 0),
(132, 132, '5', 0, 0),
(133, 133, 'Hockey', 0, 0),
(134, 134, 'Ronaldo Nazario', 1, 10),
(135, 135, 'CR7', 0, 0),
(136, 136, 'Motociclismo', 0, 0),
(137, 137, 'Japón', 1, 10),
(138, 138, 'Egipto', 0, 0),
(139, 139, '1', 1, 10),
(140, 140, 'Atletismo', 0, 0),
(141, 141, 'Críquet', 0, 0),
(142, 142, 'Kobe Bryant', 0, 0),
(143, 143, '3', 0, 0),
(144, 144, '4', 0, 0),
(145, 145, 'Las 24 horas de Le Mans', 0, 0),
(146, 146, 'Roger Federer', 0, 0),
(147, 147, '1920', 0, 0),
(148, 148, '10', 0, 0),
(149, 149, 'Tenis ', 1, 10),
(150, 150, 'Chicago Bulls', 0, 0),
(151, 151, 'Buceo', 0, 0),
(152, 152, 'Trofeo Stanley', 0, 0),
(153, 153, 'Esquí', 0, 0),
(154, 154, 'Francia', 1, 10),
(155, 155, 'Eslovaquia', 0, 0),
(156, 156, 'Rugby', 0, 0),
(157, 157, 'Steffi Graf', 0, 0),
(158, 158, 'Polo', 0, 0),
(159, 159, 'Atletismo', 1, 10),
(160, 160, 'Emoción', 0, 0),
(161, 161, 'Largo', 0, 0),
(162, 162, 'María', 1, 10),
(163, 163, 'Sustantivo', 0, 0),
(164, 164, 'Presente', 0, 0),
(165, 165, 'Único', 0, 0),
(166, 166, 'Alto', 0, 0),
(167, 167, 'Verbo', 0, 0),
(168, 168, 'Adverbio', 0, 0),
(169, 169, 'Ayer corrí en el parque', 0, 0),
(170, 170, 'Hay que tener paciencia', 0, 0),
(171, 171, 'Sustantivo', 0, 0),
(172, 172, 'Lápices', 0, 0),
(173, 173, 'Después', 0, 0),
(174, 174, 'Perro', 1, 10),
(175, 175, 'Rápido', 0, 0),
(176, 176, 'Positivo', 0, 0),
(177, 177, 'Aumentar un problema', 1, 10),
(178, 178, 'Perro', 0, 0),
(179, 179, 'Enemistad', 0, 0),
(180, 180, 'Voy', 1, 10),
(181, 181, 'Flaco', 0, 0),
(182, 182, 'Verbo', 0, 0),
(183, 183, 'Feliz', 1, 10),
(184, 184, 'Pretérito', 0, 0),
(185, 185, 'Raíz', 0, 0),
(186, 186, 'Miedoso', 0, 0),
(187, 187, 'Porque', 0, 0),
(188, 188, 'Estudiantes', 1, 10),
(189, 189, 'Sobre', 0, 0),
(190, 190, 'Alegremente', 0, 0),
(191, 191, 'Abraham Lincoln', 0, 0),
(192, 192, '1452', 0, 0),
(193, 193, 'Los egipcios', 0, 0),
(194, 194, 'El Imperio Griego', 0, 0),
(195, 195, 'Napoleón Bonaparte', 1, 10),
(196, 196, 'Los aztecas', 0, 0),
(197, 197, '1905', 0, 0),
(198, 198, 'Jawaharlal Nehru', 0, 0),
(199, 199, 'Guerra de Secesión', 1, 10),
(200, 200, 'La Carta Magna', 1, 10),
(201, 201, 'Julio César', 0, 0),
(202, 202, '1776', 0, 0),
(203, 203, 'Los mayas', 0, 0),
(204, 204, 'Estados Unidos', 0, 0),
(205, 205, 'La Primera Guerra Mundial', 0, 0),
(206, 206, 'Simón Bolívar', 0, 0),
(207, 207, '1810', 0, 0),
(208, 208, 'Rusia', 0, 0),
(209, 209, 'La peste negra', 0, 0),
(210, 210, 'Julio César', 0, 0),
(211, 211, 'Alemania', 0, 0),
(212, 212, 'Tutankamón', 0, 0),
(213, 213, 'El comercio de especias', 0, 0),
(214, 214, 'Inglaterra', 0, 0),
(215, 215, 'Simón Bolívar', 1, 10),
(216, 216, 'México', 0, 0),
(217, 217, 'La invasión de los mongoles', 0, 0),
(218, 218, '1776', 1, 10),
(219, 219, 'Kanji', 0, 0),
(220, 220, 'Francia', 0, 0),
(221, 221, 'La Guerra Civil', 0, 0),
(222, 222, 'Personas sin trabajo buscando empleo', 1, 10),
(223, 223, 'Total de dinero en la economía', 0, 0),
(224, 224, 'Mercado regulado por el gobierno', 0, 0),
(225, 225, 'Precio que los productores vende', 0, 0),
(226, 226, 'Costo de producir un bien', 0, 0),
(227, 227, 'Regular los precios', 0, 0),
(228, 228, 'Mercado con muchos competidores', 0, 0),
(229, 229, 'Mide el crecimiento del PIB', 0, 0),
(230, 230, 'Cambio en el consumo por cambio de ingresos', 0, 0),
(231, 231, 'Infraestructura física', 0, 0),
(232, 232, 'Beneficio para terceros sin costo', 0, 0),
(233, 233, 'Mercado de recursos productivos', 1, 10),
(234, 234, 'Crecimiento sostenido', 0, 0),
(235, 235, 'Mercado de bienes raíces', 0, 0),
(236, 236, 'Valor de la moneda frente a otras', 1, 10),
(237, 237, 'Bien con bajo costo de producción', 0, 0),
(238, 238, 'Relación entre salarios y productividad', 0, 0),
(239, 239, 'Un mercado para la venta de producto', 0, 0),
(240, 240, 'Un bien cuyo consumo disminuye cuando aumenta el ingreso', 1, 10),
(241, 241, 'Aumento del valor de la moneda', 0, 0),
(242, 242, 'Un aumento en la producción y el ingreso de un país', 1, 10),
(243, 243, 'El mercado donde se intercambian divisas', 0, 0),
(244, 244, 'Un sistema donde el gobierno controla toda la producción', 0, 0),
(245, 245, 'Enfoque económico que favorece el libre comercio', 0, 0),
(246, 246, 'Una empresa que no tiene competencia', 0, 0),
(247, 247, 'Aumentar las tasas de interés', 0, 0),
(248, 248, 'La diferencia entre los ingresos y los gastos del gobierno', 1, 10),
(249, 249, 'Un aumento en el empleo', 0, 0),
(250, 250, 'Un indicador de la inflación', 0, 0),
(251, 251, 'Aumentar la oferta de dinero', 0, 0),
(252, 252, 'Cambios en la estructura política de un país', 0, 0),
(253, 253, '**', 0, 0),
(254, 254, 'Dupla', 0, 0),
(255, 255, 'Twitch', 0, 0),
(256, 256, '9', 1, 10),
(257, 257, 'INE', 0, 0),
(258, 258, 'Kivi', 0, 0),
(259, 259, 'true', 0, 0),
(260, 260, '// Este es un comentario', 0, 0),
(261, 261, 'loop', 0, 0),
(262, 262, 'consta', 1, 10),
(263, 263, 'GEN * FROM tabla', 0, 0),
(264, 264, 'INE', 0, 0),
(265, 265, 'set', 0, 0),
(266, 266, 'Booleano', 0, 0),
(267, 267, 'Aprende()', 1, 10),
(268, 268, 'excepción', 0, 0),
(269, 269, 'Un error que ocurre durante la ejecución del programa', 1, 10),
(270, 270, 'Fin()', 0, 0),
(271, 271, 'global', 1, 10),
(272, 272, 'Une dos listas', 0, 0),
(273, 273, 'clase', 1, 10),
(274, 274, '.java', 0, 0),
(275, 275, 'Mutable', 0, 0),
(276, 276, 'Loop()', 0, 0),
(277, 277, '+', 1, 10),
(278, 278, ';', 0, 0),
(279, 279, '', 0, 0),
(280, 280, 'Power()', 1, 10),
(281, 281, 'Combine()', 0, 0),
(282, 282, 'Una técnica para evitar errores de memoria', 0, 0),
(283, 283, 'Salir del ciclo de manera inmediata', 1, 10),
(284, 284, 'Karl Marx', 0, 0),
(285, 285, 'La Caída del Imperio Romano', 0, 0),
(286, 286, 'Immanuel Kant', 0, 0),
(287, 287, 'Salvador Dalí', 0, 0),
(288, 288, 'Grecia', 1, 10),
(289, 289, 'Octavio Paz', 0, 0),
(290, 290, 'Siglo XIV', 0, 0),
(291, 291, 'Karl Marx', 0, 0),
(292, 292, 'Thomas Hobbes', 0, 0),
(293, 293, 'Mark Twain', 0, 0),
(294, 294, '1912', 0, 0),
(295, 295, 'Impresionismo', 0, 0),
(296, 296, 'Albert Einstein', 0, 0),
(297, 297, 'Antón Checho', 0, 0),
(298, 298, 'Sigmund Freud', 1, 10),
(299, 299, 'África', 0, 0),
(300, 300, 'Drama', 0, 0),
(301, 301, 'Jean-Paul Sartre', 0, 0),
(302, 302, 'La guerra de Secesión', 0, 0),
(303, 303, 'Molière', 0, 0),
(304, 304, 'Salvador Dalí', 1, 10),
(305, 305, 'Thomas Mann', 0, 0),
(306, 306, 'Platón', 0, 0),
(307, 307, 'Victor Hugo', 0, 0),
(308, 308, 'Siglo XV', 0, 0),
(309, 309, 'Hegel', 1, 10),
(310, 310, 'México', 0, 0),
(311, 311, 'Julio Cortázar', 0, 0),
(312, 312, 'Jean-Jacques Rousseau', 0, 0),
(313, 313, 'Edipo Rey', 1, 10),
(314, 314, 'Atlántico ', 1, 10),
(315, 315, 'EE. UU.', 0, 0),
(316, 316, 'Europa', 0, 0),
(317, 317, 'Nepal ', 1, 10),
(318, 318, 'Mar Caspio', 0, 0),
(319, 319, 'Canadá', 0, 0),
(320, 320, 'Grecia', 0, 0),
(321, 321, 'Melbourne', 0, 0),
(322, 322, 'Pacífico', 0, 0),
(323, 323, 'Toronto', 0, 0),
(324, 324, 'China', 0, 0),
(325, 325, 'Groenlandia ', 1, 10),
(326, 326, 'Chile', 0, 0),
(327, 327, 'África', 0, 0),
(328, 328, 'Índico', 0, 0),
(329, 329, 'Mónaco', 0, 0),
(330, 330, 'Río de Janeiro', 0, 0),
(331, 331, 'Indonesia ', 1, 10),
(332, 332, 'China', 0, 0),
(333, 333, 'Europa', 0, 0),
(334, 334, 'Asia', 0, 0),
(335, 335, 'Monte Benali', 1, 10),
(336, 336, 'Ródano', 0, 0),
(337, 337, 'Sudáfrica', 0, 0),
(338, 338, 'Grecia', 0, 0),
(339, 339, 'El Cairo', 1, 10),
(340, 340, 'Alpes', 0, 0),
(341, 341, 'Danubio', 0, 0),
(342, 342, 'África', 0, 0),
(343, 343, 'Atlántico', 0, 0),
(344, 344, 'Suecia ', 1, 10),
(345, 345, '80/40 mmHg', 0, 0),
(346, 346, 'Tímpano', 0, 0),
(347, 347, 'Sodio', 1, 10),
(348, 348, 'Leucocitos', 0, 0),
(349, 349, 'Insulina', 0, 0),
(350, 350, '6.8', 0, 0),
(351, 351, 'Estómago', 0, 0),
(352, 352, 'Tiroides', 0, 0),
(353, 353, 'Fémur', 1, 10),
(354, 354, 'Cerebro', 0, 0),
(355, 355, 'Eritrocitos', 0, 0),
(356, 356, 'Fija', 0, 0),
(357, 357, 'Miosina', 0, 0),
(358, 358, 'Esófago', 0, 0),
(359, 359, 'Diabetes mellitus', 1, 10),
(360, 360, 'Beriberi', 0, 0),
(361, 361, 'Macrófagos', 0, 0),
(362, 362, '40-70 mg/dL', 0, 0),
(363, 363, 'Hipófisis', 0, 0),
(364, 364, 'Ligamentos', 0, 0),
(365, 365, 'Retina', 0, 0),
(366, 366, 'Hierro', 1, 10),
(367, 367, 'Sistema digestivo', 0, 0),
(368, 368, 'Riñón', 0, 0),
(369, 369, 'Eosinófilos', 0, 0),
(370, 370, 'Nivel alto de azúcar en la sangre', 0, 0),
(371, 371, 'Tráquea', 0, 0),
(372, 372, 'Anemia', 0, 0),
(373, 373, 'Eritrocitos', 0, 0),
(374, 374, 'Infección viral', 0, 0),
(375, 375, 'Diafragma', 1, 10),
(376, 376, 'Euro', 0, 0),
(377, 377, '1912', 0, 0),
(378, 378, 'Hígado', 0, 0),
(379, 379, 'CO₂', 0, 0),
(380, 380, '1965', 0, 0),
(381, 381, 'Aluminio', 0, 0),
(382, 382, 'William Shakespeare', 1, 10),
(383, 383, 'León', 0, 0),
(384, 384, 'Telégrafo', 0, 0),
(385, 385, 'Francia', 0, 0),
(386, 386, 'Neil Armstrong', 0, 0),
(387, 387, 'Árabe', 1, 10),
(388, 388, 'Platón', 0, 0),
(389, 389, 'Mercurio', 0, 0),
(390, 390, 'Barómetro', 0, 0),
(391, 391, 'Elefante africano', 0, 0),
(392, 392, 'Dante Alighieri', 1, 10),
(393, 393, 'Francia', 0, 0),
(394, 394, 'Marie Curie', 0, 0),
(395, 395, 'Oslo', 1, 10),
(396, 396, 'La Independencia de México', 0, 0),
(397, 397, 'Steven Spielberg', 0, 0),
(398, 398, 'Colombia', 0, 0),
(399, 399, 'Washington D.C.', 0, 0),
(400, 400, 'Aj', 0, 0),
(401, 401, 'Franz Kafka', 1, 10),
(402, 402, 'Argentina', 0, 0),
(403, 403, 'Árabe', 0, 0),
(404, 404, 'La teoría de la relatividad', 0, 0),
(405, 405, 'Aluminio ', 1, 10),
(406, 406, 'Koala', 0, 0),
(407, 407, 'Cubismo', 0, 0),
(408, 408, 'El Prado', 0, 0),
(409, 409, 'La persistencia de la memoria', 1, 10),
(410, 410, 'Donatello', 0, 0),
(411, 411, 'Surrealismo', 0, 0),
(412, 412, 'China', 0, 0),
(413, 413, 'Van Gogh', 1, 10),
(414, 414, 'El Partenón', 0, 0),
(415, 415, 'El lago de los cisnes', 1, 10),
(416, 416, 'Giotto', 0, 0),
(417, 417, 'Barroco', 0, 0),
(418, 418, 'Francia', 0, 0),
(419, 419, 'La creación de Adán', 0, 0),
(420, 420, 'Giacomo Puccini', 0, 0),
(421, 421, 'Acuarela', 0, 0),
(422, 422, 'Henry Moore', 0, 0),
(423, 423, 'Futurismo', 0, 0),
(424, 424, 'La Alhambra', 0, 0),
(425, 425, 'Claude Monet', 0, 0),
(426, 426, 'La Venus de Milo', 0, 0),
(427, 427, 'Barroco', 1, 10),
(428, 428, 'Ludwig van Beethoven', 0, 0),
(429, 429, 'Impresionismo', 0, 0),
(430, 430, 'Donatello', 0, 0),
(431, 431, 'Óleo', 0, 0),
(432, 432, 'Christopher Marlowe', 0, 0),
(433, 433, 'Italia', 0, 0),
(434, 434, 'La creación de Adán', 0, 0),
(435, 435, 'El cascanueces', 0, 0),
(436, 436, 'Acuarela', 0, 0),
(437, 437, 'Le Corbusier', 0, 0),
(438, 438, 'Impresionismo', 0, 0),
(439, 439, 'Internet of Technology', 0, 0),
(440, 440, 'Linux', 0, 0),
(441, 441, 'Un tipo de disco duro', 0, 0),
(442, 442, 'C++', 0, 0),
(443, 443, 'Software cuyo código fuente está disponible para modificar y compartir', 1, 10),
(444, 444, 'Una red local', 0, 0),
(445, 445, 'Router', 0, 0),
(446, 446, 'Optimizar el rendimiento del equipo', 0, 0),
(447, 447, 'Robots que funcionan automáticamente', 0, 0),
(448, 448, 'Disco duro', 0, 0),
(449, 449, 'Uniforme Resorte Locutor', 1, 10),
(450, 450, 'Una unidad de almacenamiento', 0, 0),
(451, 451, 'Hyper Tool Management Language', 0, 0),
(452, 452, 'Un hardware que ejecuta programas', 0, 0),
(453, 453, 'Un tipo de malware', 0, 0),
(454, 454, 'La simulación de entornos virtuales completos', 0, 0),
(455, 455, 'La quinta generación de redes móviles', 1, 10),
(456, 456, 'Una red social para desarrolladores', 0, 0),
(457, 457, 'Una red de computadoras conectadas', 0, 0),
(458, 458, 'Central Processing Unit', 1, 10),
(459, 459, 'Super Storage Drive', 0, 0),
(460, 460, 'Mozilla Firefox', 0, 0),
(461, 461, 'Sistemas que aprenden y mejoran con datos', 1, 10),
(462, 462, 'Un identificador único para dispositivos en una red', 1, 10),
(463, 463, 'Divide la red en subredes', 0, 0),
(464, 464, 'Una unidad de almacenamiento', 0, 0),
(465, 465, '192.168.1.1', 0, 0),
(466, 466, 'Un tipo de red local', 0, 0),
(467, 467, 'Un archivo con protección de contraseña', 0, 0),
(468, 468, 'Un tipo de virus informático', 0, 0),
(469, 469, 'Un conjunto de direcciones IP', 0, 0),
(470, 470, 'Restauración de un sistema operativo', 0, 0),
(471, 471, 'Ley de la gravitación universal', 0, 0),
(472, 472, 'Su velocidad', 0, 0),
(473, 473, 'La fuerza neta es cero', 1, 10),
(474, 474, 'La resistencia', 0, 0),
(475, 475, 'Principio de Pascal', 1, 10),
(476, 476, '6', 0, 0),
(477, 477, 'Iónico', 0, 0),
(478, 478, 'H₂O', 0, 0),
(479, 479, 'Una sustancia que acepta protones', 0, 0),
(480, 480, '20', 1, 10),
(481, 481, '4:20 PM', 0, 0),
(482, 482, '5', 0, 0),
(483, 483, '450', 1, 10),
(484, 484, 'Domingo ', 1, 10),
(485, 485, '24 años ', 0, 0),
(486, 486, 'Es máxima', 0, 0),
(487, 487, 'Trabajo o energía', 1, 10),
(488, 488, 'Oxígeno', 0, 0),
(489, 489, 'Ácidos grasos', 0, 0),
(490, 490, 'ADN', 0, 0),
(512, 1, '4', 0, 0),
(513, 2, '15 cm²', 0, 0),
(514, 3, 'Tierra', 0, 0),
(515, 4, 'Oxígeno', 1, 10),
(516, 5, 'Larry Bird', 0, 0),
(517, 6, 'Los Angeles Dogger', 0, 0),
(518, 7, 'Alegre', 1, 10),
(519, 8, 'Un análisis', 0, 0),
(520, 9, 'Estados Mexicanos', 0, 0),
(521, 10, 'La niña, La pinta y La Santa María', 1, 10),
(522, 11, 'Son factores que determinan el precio de un bien o un producto', 1, 10),
(523, 12, 'Guardar y Recibir depósitos ', 1, 10),
(524, 13, 'Progresión Oriéntame los Objetos', 0, 0),
(525, 14, 'Frontex', 0, 0),
(526, 15, 'Isaac Newton', 0, 0),
(527, 16, 'El estudio de la lengua y la gramática.', 0, 0),
(528, 17, 'Amazonas', 0, 0),
(529, 18, 'América de Sur', 1, 10),
(530, 19, '200', 0, 0),
(531, 20, 'Vitamina Z', 0, 0),
(532, 21, 'Portugués', 0, 0),
(533, 22, '1776', 1, 10),
(534, 23, 'Picasso', 0, 0),
(535, 24, 'La Mona Lisa', 0, 0),
(536, 25, 'Innovación de proceso', 0, 0),
(537, 26, 'William A. McLuhan', 0, 0),
(538, 27, 'Thomas Edison', 1, 10),
(539, 28, '30 m', 0, 0),
(540, 29, '41%', 0, 0),
(541, 30, '32.5 kg', 1, 10),
(542, 31, 'Newton', 0, 0),
(543, 32, 'Plata', 1, 10),
(544, 33, '12', 0, 0),
(545, 34, '4 pasos', 0, 0),
(546, 35, 'Brasil', 1, 10),
(547, 36, '5', 0, 0),
(548, 37, 'Nunca', 0, 0),
(549, 38, 'Comida', 0, 0),
(550, 39, 'Argumentativo', 0, 0),
(551, 40, '1942', 0, 0),
(552, 41, '1939', 0, 0),
(553, 42, 'EE. UU.', 1, 10),
(554, 43, 'El proceso de nacionalización de las empresas privadas', 1, 10),
(555, 44, 'El ingreso total de los hogares', 0, 0),
(556, 45, 'El aumento de las exportaciones de un país', 0, 0),
(557, 46, 'De función():', 1, 10),
(558, 47, 'Un bucle que se detiene cuando se cumple una condición', 0, 0),
(559, 48, 'Un valor constante que no cambia', 0, 0),
(560, 49, 'René Descartes', 0, 0),
(561, 50, 'Una serie de guerras que involucraron a Europa', 0, 0),
(562, 51, 'Matemáticas', 0, 0),
(563, 52, 'Egipto', 0, 0),
(564, 53, 'Budapest', 1, 10),
(565, 54, 'Luxemburgo', 1, 10),
(566, 55, 'Amador', 0, 0),
(567, 56, 'Eritrocitos', 0, 0),
(568, 57, 'Páncreas', 1, 10),
(569, 58, 'Hongo', 0, 0),
(570, 59, 'Canberra', 1, 10),
(571, 60, 'EE. UU.', 0, 0),
(572, 61, '1776', 1, 10),
(573, 62, 'Azul, amarillo,verde', 0, 0),
(574, 63, 'Verde, morado,negro', 0, 0),
(575, 64, 'España', 1, 10),
(576, 65, 'Bill Gates', 0, 0),
(577, 66, 'Gabinete de la computadora', 0, 0),
(578, 67, '15', 0, 0),
(579, 68, '4', 0, 0),
(580, 69, '32 cm²', 0, 0),
(581, 70, '81', 1, 10),
(582, 71, '10', 0, 0),
(583, 72, '7', 1, 10),
(584, 73, '18', 0, 0),
(585, 74, 'Escaleno', 0, 0),
(586, 75, '8', 0, 0),
(587, 76, '50', 1, 10),
(588, 77, '24', 0, 0),
(589, 78, '275', 0, 0),
(590, 79, '7 cm', 0, 0),
(591, 80, '9', 0, 0),
(592, 81, '7', 0, 0),
(593, 82, '9', 0, 0),
(594, 83, '6', 1, 10),
(595, 84, '2/4', 0, 0),
(596, 85, '$200', 1, 10),
(597, 86, '20', 1, 10),
(598, 87, '12', 0, 0),
(599, 88, '11', 0, 0),
(600, 89, '90', 0, 0),
(601, 90, '10', 0, 0),
(602, 91, '200', 0, 0),
(603, 92, '18', 0, 0),
(604, 93, '6', 1, 10),
(605, 94, '3.1614', 0, 0),
(606, 95, '16', 0, 0),
(607, 96, '$40', 1, 10),
(608, 97, '36 cm', 0, 0),
(609, 98, 'Energía nuclear\r\n', 0, 0),
(610, 99, 'Neptuno', 0, 0),
(611, 100, 'Dióxido de carbono\r\n', 0, 0),
(612, 101, 'Hígado', 0, 0),
(613, 102, 'Aluminio ', 1, 10),
(614, 103, 'Las reacciones químicas', 0, 0),
(615, 104, 'Fermentación', 0, 0),
(616, 105, 'Ígnea ', 1, 10),
(617, 106, 'Hormiga', 0, 0),
(618, 107, 'Albert Einstein', 1, 10),
(619, 108, 'Mercurio', 0, 0),
(620, 109, 'Neutrones', 0, 0),
(621, 110, 'Célula ', 1, 10),
(622, 111, 'Condensación', 1, 10),
(623, 112, 'Manto', 0, 0),
(624, 113, 'Delfín ', 1, 10),
(625, 114, 'Sublimación ', 1, 10),
(626, 115, 'Herbívoro', 0, 0),
(627, 116, 'Defender el cuerpo de infecciones', 0, 0),
(628, 117, 'Líquido', 0, 0),
(629, 118, 'Newton ', 1, 10),
(630, 119, 'Dióxido de carbono', 0, 0),
(631, 120, 'Litio ', 1, 10),
(632, 121, 'Sodio', 0, 0),
(633, 122, 'Fotosíntesis', 0, 0),
(634, 123, 'Alcohol', 0, 0),
(635, 124, 'Los fósiles', 1, 10),
(636, 125, 'Hongo', 0, 0),
(637, 126, 'Pulmones', 0, 0),
(638, 127, 'Watson y Crick', 1, 10),
(639, 128, 'Hoja', 0, 0),
(640, 129, 'Rugby ', 1, 10),
(641, 130, '6', 0, 0),
(642, 131, 'La Fórmula 1', 0, 0),
(643, 132, '1', 0, 0),
(644, 133, 'Rugby', 0, 0),
(645, 134, 'Luis Suárez', 0, 0),
(646, 135, 'Messi', 0, 0),
(647, 136, 'Automovilismo ', 1, 10),
(648, 137, 'China ', 0, 0),
(649, 138, 'Roma', 0, 0),
(650, 139, '2', 0, 0),
(651, 140, 'Automovilismo', 0, 0),
(652, 141, 'Béisbol ', 1, 10),
(653, 142, 'LeBron James', 0, 0),
(654, 143, '4', 0, 0),
(655, 144, '5', 0, 0),
(656, 145, 'La Fórmula E', 0, 0),
(657, 146, 'Novak Djokovic', 1, 10),
(658, 147, '1930', 1, 10),
(659, 148, '14', 0, 0),
(660, 149, 'Squash', 0, 0),
(661, 150, 'Los Angeles Lakers', 0, 0),
(662, 151, 'Natación ', 1, 10),
(663, 152, 'Copa América', 0, 0),
(664, 153, 'Golf ', 1, 10),
(665, 154, 'Brasil', 0, 0),
(666, 155, 'España', 0, 0),
(667, 156, 'Fútbol americano', 0, 0),
(668, 157, 'Margaret Court ', 1, 10),
(669, 158, 'Squash', 0, 0),
(670, 159, 'Fútbol', 0, 0),
(671, 160, 'Camión', 0, 0),
(672, 161, 'Grande', 1, 10),
(673, 162, 'Compra', 0, 0),
(674, 163, 'Adjetivo', 0, 0),
(675, 164, 'Pasado perfecto', 0, 0),
(676, 165, 'Semanal', 0, 0),
(677, 166, 'Ellos', 1, 10),
(678, 167, 'Adjetivo', 0, 0),
(679, 168, 'Sustantivo', 0, 0),
(680, 169, 'Correré mañana en el parque', 1, 10),
(681, 170, 'La comida es importante', 0, 0),
(682, 171, 'Adjetivo', 0, 0),
(683, 172, 'Lápiz', 0, 0),
(684, 173, 'Durante', 0, 0),
(685, 174, 'Él', 0, 0),
(686, 175, 'Alto', 0, 0),
(687, 176, 'Negativo', 1, 10),
(688, 177, 'Disminuir la tensión', 0, 0),
(689, 178, 'Rápido', 0, 0),
(690, 179, 'Compañerismo', 1, 10),
(691, 180, 'Vas', 0, 0),
(692, 181, 'Fino', 0, 0),
(693, 182, 'Adjetivo', 0, 0),
(694, 183, 'Yo', 0, 0),
(695, 184, 'Futuro', 1, 10),
(696, 185, 'Raíces', 0, 0),
(697, 186, 'Audaz', 1, 10),
(698, 187, 'Encima', 1, 10),
(699, 188, 'Estudian', 0, 0),
(700, 189, 'Cerca', 0, 0),
(701, 190, 'Silenciosamente', 0, 0),
(702, 191, 'Thomas Jefferson', 0, 0),
(703, 192, '1512', 0, 0),
(704, 193, ' Los sumerios', 1, 10),
(705, 194, 'El Imperio Egipcio', 0, 0),
(706, 195, 'Luis XIV', 0, 0),
(707, 196, 'Los egipcios', 1, 10),
(708, 197, '1920', 0, 0),
(709, 198, 'Indira Gandhi', 0, 0),
(710, 199, 'Guerra de Independencia', 0, 0),
(711, 200, 'La Constitución', 0, 0),
(712, 201, 'Constantino', 0, 0),
(713, 202, '1789', 1, 10),
(714, 203, 'Los olmecas', 0, 0),
(715, 204, 'Japón', 0, 0),
(716, 205, 'La Guerra Fría', 0, 0),
(717, 206, 'Fidel Castro', 1, 10),
(718, 207, '1821\r\n', 1, 10),
(719, 208, 'Alemania', 0, 0),
(720, 209, 'La guerra de los Cien Años', 0, 0),
(721, 210, 'Constantino', 0, 0),
(722, 211, 'España', 1, 10),
(723, 212, 'Ramsés II', 0, 0),
(724, 213, 'La religión', 1, 10),
(725, 214, 'Portugal', 0, 0),
(726, 215, 'Emiliano Zapata', 0, 0),
(727, 216, 'Cuba', 0, 0),
(728, 217, 'La caída de Roma', 0, 0),
(729, 218, '1789', 0, 0),
(730, 219, 'Sin Si Huang', 1, 10),
(731, 220, 'Austria', 0, 0),
(732, 221, ' La Guerra Fría', 1, 10),
(733, 222, ' Personas jubiladas', 0, 0),
(734, 223, 'Bienes y servicios producidos a diferentes precios', 1, 10),
(735, 224, 'Mercado con monopolio', 0, 0),
(736, 225, 'Cantidad comprada a diferentes precios', 1, 10),
(737, 226, 'Lo que se pierde al elegir una opción', 1, 10),
(738, 227, 'Aumentar el empleo', 0, 0),
(739, 228, 'Mercado sin precios', 0, 0),
(740, 229, 'Mide los precios de una canasta de bienes', 1, 10),
(741, 230, 'Reducción en la demanda por escasez', 0, 0),
(742, 231, 'Maquinaria usada en la producción.', 0, 0),
(743, 232, 'Costo para terceros sin compensación', 1, 10),
(744, 233, 'Mercado de productos terminados', 0, 0),
(745, 234, 'Disminución de la producción económica', 1, 10),
(746, 235, 'Mercado de divisas', 0, 0),
(747, 236, 'Tasa de interés en los bancos', 0, 0),
(748, 237, 'Bien que solo los ricos consumen', 0, 0),
(749, 238, 'Relación entre precios y demanda.', 0, 0),
(750, 239, 'Un mercado donde las empresas compran trabajo', 1, 10),
(751, 240, 'Un bien que no tiene demanda', 0, 0),
(752, 241, 'Reducción del valor de la moneda frente a otras', 1, 10),
(753, 242, 'Un aumento en el valor de la moneda', 0, 0),
(754, 243, 'El mercado donde los consumidores compran bienes y servicios', 1, 10),
(755, 244, 'Un sistema donde no hay comercio', 0, 0),
(756, 245, 'Sistema que limita la intervención estatal en la economía', 0, 0),
(757, 246, 'Un mercado con muchas empresas competidoras', 0, 0),
(758, 247, 'Disminuir el gasto público', 0, 0),
(759, 248, 'El gasto público inferior a los ingresos', 0, 0),
(760, 249, 'Un período de crecimiento económico constante', 0, 0),
(761, 250, 'Una medida de la producción industrial', 0, 0),
(762, 251, 'Reducir el gasto público', 0, 0),
(763, 252, 'Modificaciones a las políticas económicas para mejorar el crecimiento', 1, 10),
(764, 253, '/', 0, 0),
(765, 254, 'Sting', 0, 0),
(766, 255, 'y', 1, 10),
(767, 256, '10', 0, 0),
(768, 257, 'doble', 0, 0),
(769, 258, 'Tinte', 1, 10),
(770, 259, 'false', 1, 10),
(771, 260, '/* Este es un comentario */', 0, 0),
(772, 261, 'chile', 0, 0),
(773, 262, 'final', 0, 0),
(774, 263, 'KETCH * FROM tabla', 0, 0),
(775, 264, 'flota', 0, 0),
(776, 265, 'arras', 1, 10),
(777, 266, 'Entero', 0, 0),
(778, 267, 'ADN()', 0, 0),
(779, 268, 'Händel', 0, 0),
(780, 269, 'Un tipo de variable', 0, 0),
(781, 270, 'Serch()', 0, 0),
(782, 271, 'bar', 0, 0),
(783, 272, 'Divide una cadena en una lista', 0, 0),
(784, 273, 'de', 0, 0),
(785, 274, '.js', 0, 0),
(786, 275, 'Inmutable', 1, 10),
(787, 276, 'Receta()', 0, 0),
(788, 277, '&', 0, 0),
(789, 278, 'deleite', 0, 0),
(790, 279, 'Un conjunto no ordenado de elementos únicos', 1, 10),
(791, 280, 'Down()', 0, 0),
(792, 281, 'Emerge()', 0, 0),
(793, 282, 'Un ciclo infinito', 0, 0),
(794, 283, 'Continuar con la siguiente iteración del ciclo', 0, 0),
(795, 284, 'Friedrich Nietzsche', 0, 0),
(796, 285, 'La Revolución Francesa', 1, 10),
(797, 286, 'René Descartes', 0, 0),
(798, 287, 'Francisco Goya', 0, 0),
(799, 288, 'Roma', 0, 0),
(800, 289, 'Juan Rulfo', 1, 10),
(801, 290, 'Siglo XV', 0, 0),
(802, 291, 'Friedrich Nietzsche', 1, 10),
(803, 292, 'Karl Marx', 0, 0),
(804, 293, 'F. Scott Fitzgerald', 1, 10),
(805, 294, '1914', 0, 0),
(806, 295, 'Realismo', 0, 0),
(807, 296, 'Isaac Newton', 0, 0),
(808, 297, 'León Tolstói', 0, 0),
(809, 298, 'Carl Jung', 0, 0),
(810, 299, 'Asia', 0, 0),
(811, 300, 'Poema épico', 1, 10),
(812, 301, 'Karl Marx', 0, 0),
(813, 302, 'La Primera Guerra Mundial', 0, 0),
(814, 303, 'Tirso de Molina', 1, 10),
(815, 304, 'Frida Kahlo', 0, 0),
(816, 305, 'Albert Camus', 0, 0),
(817, 306, 'Sócrates', 0, 0),
(818, 307, 'Émile Zola', 0, 0),
(819, 308, 'Siglo XVI', 1, 10),
(820, 309, 'Kant', 0, 0),
(821, 310, 'Colombia', 1, 10),
(822, 311, 'Mario Vargas Llosa', 0, 0),
(823, 312, 'John Locke', 0, 0),
(824, 313, 'Medea', 0, 0),
(825, 314, 'Pacífico', 0, 0),
(826, 315, 'India', 0, 0),
(827, 316, 'África', 0, 0),
(828, 317, 'China', 0, 0),
(829, 318, 'Mar Mediterráneo', 1, 10),
(830, 319, 'China', 0, 0),
(831, 320, 'Indonesia ', 1, 10),
(832, 321, 'Sídney', 0, 0),
(833, 322, 'Ártico', 0, 0),
(834, 323, 'Montreal', 0, 0),
(835, 324, 'Kazajistán ', 1, 10),
(836, 325, 'Madagascar', 0, 0),
(837, 326, 'Italia ', 1, 10),
(838, 327, 'Asia', 0, 0),
(839, 328, 'Ártico', 0, 0),
(840, 329, 'San Marino', 0, 0),
(841, 330, 'São Paulo', 0, 0),
(842, 331, 'Filipinas', 0, 0),
(843, 332, 'Japón ', 1, 10),
(844, 333, 'África', 0, 0),
(845, 334, 'África ', 1, 10),
(846, 335, 'Monte Everest', 0, 0),
(847, 336, 'Sena ', 1, 10),
(848, 337, 'Argelia ', 0, 0),
(849, 338, 'México', 0, 0),
(850, 339, 'Alejandría', 0, 0),
(851, 340, 'Pirineos', 0, 0),
(852, 341, 'Volga', 1, 10),
(853, 342, 'América del Sur', 1, 10),
(854, 343, 'Pacífico ', 1, 10),
(855, 344, 'Finlandia', 0, 0),
(856, 345, '120/80 mmHg', 1, 10),
(857, 346, 'Cóclea', 0, 0),
(858, 347, 'Potasio', 0, 0),
(859, 348, 'Plaquetas', 0, 0),
(860, 349, 'Glucagón', 1, 10),
(861, 350, '7.4', 1, 10),
(862, 351, 'Riñón', 0, 0),
(863, 352, 'Glándula pineal\r\n\r\n', 0, 0),
(864, 353, 'Húmero', 0, 0),
(865, 354, 'Bulbo raquídeo', 1, 10),
(866, 355, 'Plaquetas', 0, 0),
(867, 356, 'Cartilaginosa', 0, 0),
(868, 357, 'Actina', 0, 0),
(869, 358, 'Intestino delgado', 1, 10),
(870, 359, 'Hipertensión', 0, 0),
(871, 360, 'Raquitismo', 0, 0),
(872, 361, 'Células T', 0, 0),
(873, 362, '70-100 mg/dL', 1, 10),
(874, 363, 'Tiroides', 0, 0),
(875, 364, 'Tendones', 1, 10),
(876, 365, 'Cristalino', 0, 0),
(877, 366, 'Glucosa', 0, 0),
(878, 367, 'Sistema endocrino', 1, 10),
(879, 368, 'Corazón', 0, 0),
(880, 369, 'Neutrófilos', 1, 10),
(881, 370, 'Presión arterial alta', 1, 10),
(882, 371, 'Bronquios', 0, 0),
(883, 372, 'Beriberi', 0, 0),
(884, 373, 'Agua', 1, 10),
(885, 374, 'Infección bacteriana', 1, 10),
(886, 375, 'Bíceps', 0, 0),
(887, 376, 'Dólar', 0, 0),
(888, 377, '1905', 0, 0),
(889, 378, 'Cerebro', 1, 10),
(890, 379, 'NaCl', 0, 0),
(891, 380, '1969', 1, 10),
(892, 381, 'Hierro', 0, 0),
(893, 382, 'Charles Dickens', 0, 0),
(894, 383, 'Guepardo', 1, 10),
(895, 384, 'Teléfono', 1, 10),
(896, 385, 'España', 0, 0),
(897, 386, 'John Glenn', 0, 0),
(898, 387, 'Inglés', 0, 0),
(899, 388, 'Aristóteles', 0, 0),
(900, 389, 'Venus', 1, 10),
(901, 390, 'Termómetro', 0, 0),
(902, 391, 'Tiburón blanco', 0, 0),
(903, 392, 'Giovanni Boccaccio', 0, 0),
(904, 393, 'Alemania', 0, 0),
(905, 394, 'Isaac Newton', 0, 0),
(906, 395, 'Estocolmo', 0, 0),
(907, 396, 'La Batalla de Puebla', 1, 10),
(908, 397, 'James Cameron', 1, 10),
(909, 398, 'Vietnam', 0, 0),
(910, 399, 'Boston', 0, 0),
(911, 400, 'Ha', 0, 0),
(912, 401, 'Fiódor Dostoyevski', 0, 0),
(913, 402, 'Brasil', 1, 10),
(914, 403, 'Urdu', 0, 0),
(915, 404, 'El descubrimiento de la penicilina', 0, 0),
(916, 405, 'Hierro', 0, 0),
(917, 406, 'Canguro', 1, 10),
(918, 407, 'Impresionismo', 0, 0),
(919, 408, 'El Louvre', 1, 10),
(920, 409, 'La noche estrellada', 0, 0),
(921, 410, 'Bernini', 0, 0),
(922, 411, 'Renacimiento', 0, 0),
(923, 412, 'Japón', 1, 10),
(924, 413, 'Monet', 0, 0),
(925, 414, 'La Torre Eiffel', 0, 0),
(926, 415, 'Carmen', 0, 0),
(927, 416, 'Brunelleschi', 0, 0),
(928, 417, 'Rococó', 0, 0),
(929, 418, 'España', 1, 10),
(930, 419, 'La noche estrellada', 0, 0),
(931, 420, 'Wolfgang Amadeus Mozart', 0, 0),
(932, 421, 'Grabado', 1, 10),
(933, 422, 'Alexander Calder', 1, 10),
(934, 423, 'Dadaísmo', 0, 0),
(935, 424, 'La Sagrada Familia', 1, 10),
(936, 425, 'Pierre-Auguste Renoir', 0, 0),
(937, 426, 'La maja desnuda', 0, 0),
(938, 427, 'Gótico', 0, 0),
(939, 428, 'Wolfgang Amadeus Mozart', 0, 0),
(940, 429, 'Cubismo', 0, 0),
(941, 430, 'Bernini', 0, 0),
(942, 431, 'Tinta', 0, 0),
(943, 432, 'Oscar Wilde', 0, 0),
(944, 433, 'España', 0, 0),
(945, 434, 'La conversión de San Pablo', 1, 10),
(946, 435, 'El pájaro de fuego', 1, 10),
(947, 436, 'Témpera', 0, 0),
(948, 437, 'Frank Lloyd Wright', 1, 10),
(949, 438, 'Expresionismo', 1, 10),
(950, 439, 'Internet of Things', 1, 10),
(951, 440, 'macOS', 0, 0),
(952, 441, 'Un sistema de backup local', 0, 0),
(953, 442, 'Java', 0, 0),
(954, 443, 'Software que requiere pago para usarse', 0, 0),
(955, 444, 'Una red inalámbrica', 0, 0),
(956, 445, 'Twitch', 0, 0),
(957, 446, 'Proteger contra malware y amenazas', 1, 10),
(958, 447, 'Sistemas que imitan la inteligencia humana', 1, 10),
(959, 448, 'Memoria RAM', 0, 0),
(960, 449, 'Universal Resorte Link', 0, 0),
(961, 450, 'Un sistema operativo', 0, 0),
(962, 451, 'Hyper Text Markup Language', 1, 10),
(963, 452, 'Un lenguaje de programación', 0, 0),
(964, 453, 'Un intento de robar información personal a través de engaños', 1, 10),
(965, 454, 'La interacción de robots con humanos', 0, 0),
(966, 455, 'Una tecnología de almacenamiento', 0, 0),
(967, 456, 'Una secuencia de instrucciones para resolver un problema', 1, 10),
(968, 457, 'Un tipo de hardware de red', 0, 0),
(969, 458, 'Central Power Unit', 0, 0),
(970, 459, 'Solid State Drive', 1, 10),
(971, 460, 'Microsoft Edge', 0, 0),
(972, 461, 'Un software de diseño de máquinas', 0, 0),
(973, 462, 'Un protocolo de transferencia de archivos', 0, 0),
(974, 463, 'Conecta dispositivos y dirige datos a su destino', 1, 10),
(975, 464, 'Un punto en una imagen digital', 1, 10),
(976, 465, 'https://www.example.com', 0, 0),
(977, 466, 'Un dispositivo para almacenar datos', 0, 0),
(978, 467, 'Un archivo que ocupa menos espacio al ser empaquetado', 1, 10),
(979, 468, 'Una herramienta de desarrollo web', 0, 0),
(980, 469, 'Un nombre único que identifica un sitio web', 1, 10),
(981, 470, 'Copia de seguridad de datos', 1, 10),
(982, 471, 'Ley de Coulomb', 0, 0),
(983, 472, 'El cuadrado de su velocidad ', 1, 10),
(984, 473, 'La fuerza neta es máxima', 0, 0),
(985, 474, 'La carga', 0, 0),
(986, 475, 'Principio de Arquímedes', 0, 0),
(987, 476, '8', 1, 10),
(988, 477, 'Metálico', 0, 0),
(989, 478, 'HOY', 1, 10),
(990, 479, 'Una sustancia que forma sales', 0, 0),
(991, 480, '25', 0, 0),
(992, 481, '5:40 PM', 0, 0),
(993, 482, '11', 0, 0),
(994, 483, '400', 0, 0),
(995, 484, 'Lunes', 0, 0),
(996, 485, '18 años ', 0, 0),
(997, 486, 'Es igual a cero', 1, 10),
(998, 487, 'Fuerza', 0, 0),
(999, 488, 'Dióxido de carbono', 0, 0),
(1000, 489, 'Monosacáridos', 0, 0),
(1001, 490, 'Glucosa', 0, 0),
(1023, 1, '8', 0, 0),
(1024, 2, '25 cm', 0, 0),
(1025, 3, 'Plutón', 0, 0),
(1026, 4, 'Osmio', 0, 0),
(1027, 5, 'Michael Jordan', 1, 10),
(1028, 6, 'Chicago White Sox', 0, 0),
(1029, 7, 'Triste', 0, 0),
(1030, 8, 'Una exposición', 0, 0),
(1031, 9, 'Estados Unidos Mexicanos', 1, 10),
(1032, 10, 'Ahuyentan, Sultana, DIERA', 0, 0),
(1033, 11, 'Son términos utilizados solo en economía avanzada', 0, 0),
(1034, 12, 'Vender acciones a sus clientes', 0, 0),
(1035, 13, 'Programación Orientada Objetos', 1, 10),
(1036, 14, 'Baquead', 0, 0),
(1037, 15, 'Tales', 0, 0),
(1038, 16, 'El estudio del ser humano y sus culturas', 1, 10),
(1039, 17, 'Mangase', 0, 0),
(1040, 18, 'América de Este', 0, 0),
(1041, 19, '207', 0, 0),
(1042, 20, 'Vitamina U', 0, 0),
(1043, 21, 'Chino Mandarín', 1, 10),
(1044, 22, '1790', 0, 0),
(1045, 23, 'Leonardo da Vinci', 0, 0),
(1046, 24, 'Guernica', 1, 10),
(1047, 25, 'Ambas ', 1, 10),
(1048, 26, 'Philo Farnsworth', 0, 0),
(1049, 27, 'Thomas Müller', 0, 0),
(1050, 28, '30 cm', 0, 0),
(1051, 29, '60%', 1, 10),
(1052, 30, '325 kg', 0, 0),
(1053, 31, 'Galilea', 0, 0),
(1054, 32, 'Agua', 0, 0),
(1055, 33, '118', 0, 0),
(1056, 34, '3 pasos', 1, 10),
(1057, 35, 'Francia', 0, 0),
(1058, 36, '7', 0, 0),
(1059, 37, 'Hablamos', 0, 0),
(1060, 38, 'Correr', 0, 0),
(1061, 39, 'Instructivo', 1, 10),
(1062, 40, '1939', 1, 10),
(1063, 41, '1945', 1, 10),
(1064, 42, 'España', 0, 0),
(1065, 43, 'La integración creciente de los mercados y economías a nivel mundial', 0, 0),
(1066, 44, 'El valor de las exportaciones de un país', 0, 0),
(1067, 45, 'El aumento generalizado y sostenido de los precios de los bienes y servicios', 1, 10),
(1068, 46, 'De función();', 0, 0),
(1069, 47, 'Un bucle que se ejecuta repetidamente sin fin, debido a que la condición nunca se cumple', 1, 10),
(1070, 48, 'Una función que realiza una tarea específica', 0, 0),
(1071, 49, 'Albert Einstein', 0, 0),
(1072, 50, 'Un movimiento cultural que marcó el fin de la Edad Media y el inicio de la Edad Moderna', 0, 0),
(1073, 51, 'Astronomía', 0, 0),
(1074, 52, 'Grecia', 0, 0),
(1075, 53, 'Bien', 0, 0),
(1076, 54, 'La valieron', 0, 0),
(1077, 55, 'Router', 0, 0),
(1078, 56, 'Linfocitos B', 1, 10),
(1079, 57, 'Hígado', 0, 0),
(1080, 58, 'Virus', 0, 0),
(1081, 59, 'Bribale', 0, 0),
(1082, 60, 'China', 0, 0),
(1083, 61, '1812', 0, 0),
(1084, 62, 'Azul, amarillo,rojo', 1, 10),
(1085, 63, 'Verde, morado,blanco', 0, 0),
(1086, 64, 'Italia', 0, 0),
(1087, 65, 'Steve Jobs', 0, 0),
(1088, 66, 'Parte visual de una computadora', 0, 0),
(1089, 67, '13', 0, 0),
(1090, 68, '5', 0, 0),
(1091, 69, '64 cm² ', 1, 10),
(1092, 70, '27', 0, 0),
(1093, 71, '12', 1, 10),
(1094, 72, '6', 0, 0),
(1095, 73, '8', 0, 0),
(1096, 74, 'Isósceles', 0, 0),
(1097, 75, '1', 1, 10),
(1098, 76, '75', 0, 0),
(1099, 77, '24 cm', 0, 0),
(1100, 78, '225', 1, 10),
(1101, 79, '14 cm ', 1, 10),
(1102, 80, '18', 0, 0),
(1103, 81, '8', 1, 10),
(1104, 82, '12', 0, 0),
(1105, 83, '9', 0, 0),
(1106, 84, '3/4', 1, 10),
(1107, 85, '$350', 0, 0),
(1108, 86, '15', 0, 0),
(1109, 87, '13', 0, 0),
(1110, 88, '12', 1, 10),
(1111, 89, '1000', 0, 0),
(1112, 90, '6', 0, 0),
(1113, 91, '625', 1, 10),
(1114, 92, '8', 1, 10),
(1115, 93, '12', 0, 0),
(1116, 94, '3,1416', 0, 0),
(1117, 95, '24', 0, 0),
(1118, 96, '$120', 0, 0),
(1119, 97, '45 cm', 0, 0),
(1120, 98, 'Energía química', 0, 0),
(1121, 99, 'Júpiter', 1, 10),
(1122, 100, 'Nitrógeno ', 1, 10),
(1123, 101, 'Estómago', 0, 0),
(1124, 102, 'Cobre', 0, 0),
(1125, 103, 'La interacción entre los seres vivos y su entorno', 1, 10),
(1126, 104, 'Digestión', 0, 0),
(1127, 105, 'Metamórfica', 0, 0),
(1128, 106, 'Rana ', 1, 10),
(1129, 107, 'Galileo Galilea', 0, 0),
(1130, 108, 'Júpiter', 0, 0),
(1131, 109, 'Electrones ', 1, 10),
(1132, 110, 'Tejido', 0, 0),
(1133, 111, 'Evaporación ', 0, 0),
(1134, 112, 'Núcleo ', 1, 10),
(1135, 113, 'Pulpo', 0, 0),
(1136, 114, 'Condensación', 0, 0),
(1137, 115, 'Descomponedor', 0, 0),
(1138, 116, 'Ayudar en la coagulación de la sangre', 0, 0),
(1139, 117, 'Gaseoso ', 1, 10),
(1140, 118, 'Pascal', 0, 0),
(1141, 119, 'Oxígeno ', 1, 10),
(1142, 120, 'Magnesio', 0, 0),
(1143, 121, 'Fosfato de calcio ', 1, 10),
(1144, 122, 'Respiración celular', 0, 0),
(1145, 123, 'Agua ', 1, 10),
(1146, 124, 'La formación de rocas', 0, 0),
(1147, 125, 'Parásito ', 1, 10),
(1148, 126, 'Corazón', 0, 0),
(1149, 127, 'Curie y Fermi', 0, 0),
(1150, 128, 'Flor', 0, 0),
(1151, 129, 'Balonmano', 0, 0),
(1152, 130, '5', 1, 10),
(1153, 131, 'Los Juegos Olímpicos', 1, 10),
(1154, 132, '2', 0, 0),
(1155, 133, 'Cricket ', 1, 10),
(1156, 134, 'Ferran Torres', 0, 0),
(1157, 135, 'Hablan', 1, 10),
(1158, 136, 'Navegación', 0, 0),
(1159, 137, 'Corea del Sur', 0, 0),
(1160, 138, 'Grecia ', 1, 10),
(1161, 139, '3', 0, 0),
(1162, 140, 'Triatlón', 0, 0),
(1163, 141, 'Tenis', 0, 0),
(1164, 142, 'Michael Jordan ', 1, 10),
(1165, 143, '7', 0, 0),
(1166, 144, '6', 1, 10),
(1167, 145, 'Rally Dakar', 0, 0),
(1168, 146, ' Rafael Nadal', 0, 0),
(1169, 147, '1934', 0, 0),
(1170, 148, '13', 0, 0),
(1171, 149, 'Bádminton', 0, 0),
(1172, 150, 'Boston Celtics', 1, 10),
(1173, 151, 'Surf', 0, 0),
(1174, 152, 'Copa Libertadores', 0, 0),
(1175, 153, 'Automovilismo', 0, 0),
(1176, 154, 'Marruecos', 0, 0),
(1177, 155, 'Italia', 1, 10),
(1178, 156, 'Hockey sobre hielo', 1, 10),
(1179, 157, 'Serena Williams', 0, 0),
(1180, 158, 'Bádminton ', 1, 10),
(1181, 159, 'Natación', 0, 0),
(1182, 160, 'Avión', 0, 0),
(1183, 161, 'Mediano', 0, 0),
(1184, 162, 'Un', 0, 0),
(1185, 163, 'Verbo', 0, 0),
(1186, 164, 'Pretérito', 0, 0),
(1187, 165, 'Diario', 1, 10),
(1188, 166, 'Casa', 0, 0),
(1189, 167, 'Sustantivo', 1, 10),
(1190, 168, 'Verbo', 0, 0),
(1191, 169, 'Hoy corro en el parque', 0, 0),
(1192, 170, 'El esfuerzo temprano tiene recompensa', 1, 10),
(1193, 171, 'Verbo', 0, 0),
(1194, 172, 'Lápices', 0, 0),
(1195, 173, 'Antes', 1, 10),
(1196, 174, 'Rápido', 0, 0),
(1197, 175, 'Pero', 1, 10),
(1198, 176, 'Feliz', 0, 0),
(1199, 177, 'Cocinar al fuego', 0, 0),
(1200, 178, 'Alto', 0, 0),
(1201, 179, 'Enojo', 0, 0),
(1202, 180, 'Va', 0, 0),
(1203, 181, 'Gordo', 1, 10),
(1204, 182, 'Sustantivo', 1, 10),
(1205, 183, 'Rapidez', 0, 0),
(1206, 184, 'Copretérito', 0, 0),
(1207, 185, 'Raíces', 0, 0),
(1208, 186, 'Temeroso', 0, 0),
(1209, 187, 'Azul', 0, 0),
(1210, 188, 'Para', 0, 0),
(1211, 189, 'Bajo', 1, 10),
(1212, 190, 'Aquí', 0, 0),
(1213, 191, 'George Washington', 1, 10),
(1214, 192, '1542', 0, 0),
(1215, 193, 'Los mayas', 0, 0),
(1216, 194, 'El Imperio Romano', 1, 10),
(1217, 195, 'Carlos Magno', 0, 0),
(1218, 196, 'Los mayas', 0, 0),
(1219, 197, '1914', 1, 10),
(1220, 198, 'Baja Singh', 0, 0),
(1221, 199, 'Guerra de los Cien Años', 0, 0),
(1222, 200, 'La Declaración de Derechos', 0, 0),
(1223, 201, 'Diocleciano', 1, 10),
(1224, 202, '1799', 0, 0),
(1225, 203, 'Los aztecas', 1, 10),
(1226, 204, 'China', 0, 0),
(1227, 205, 'La Segunda Guerra Mundial', 1, 10),
(1228, 206, 'Hugo Chávez', 0, 0),
(1229, 207, '1835', 0, 0),
(1230, 208, 'Estados Unidos', 1, 10),
(1231, 209, 'La creación del Imperio Romano', 0, 0),
(1232, 210, 'Rómulo Augusto', 1, 10),
(1233, 211, 'Francia', 0, 0),
(1234, 212, 'Keops', 1, 10),
(1235, 213, 'La expansión colonial', 0, 0),
(1236, 214, 'Francia', 0, 0),
(1237, 215, 'Miguel Hidalgo', 0, 0),
(1238, 216, 'Argentina', 0, 0),
(1239, 217, 'La batalla de Castings', 1, 10),
(1240, 218, '1812', 0, 0),
(1241, 219, 'Single', 0, 0),
(1242, 220, 'Checoslovaquia', 0, 0),
(1243, 221, 'La guerra de Vietnam', 0, 0),
(1244, 222, 'Empresas que cierran', 0, 0),
(1245, 223, 'Precios de productos en el mercado', 0, 0),
(1246, 224, 'Mercado sin intervención externa', 1, 10),
(1247, 225, 'Precio más bajo de un bien', 0, 0),
(1248, 226, 'Costo de las importaciones', 0, 0),
(1249, 227, 'Influir en la economía con impuestos y gasto', 1, 10),
(1250, 228, 'Mercado con un solo producto', 1, 10),
(1251, 229, 'Mide el ahorro de los consumidores', 0, 0),
(1252, 230, 'Aumento de la oferta por innovación', 0, 0),
(1253, 231, 'Recursos naturales', 0, 0),
(1254, 232, 'Beneficio dentro de la empresa', 0, 0),
(1255, 233, 'Mercado de divisas extranjeras', 0, 0),
(1256, 234, 'Aumento de las exportaciones', 0, 0),
(1257, 235, 'Mercado de productos agrícolas', 0, 0),
(1258, 236, 'Valor de las exportaciones', 0, 0),
(1259, 237, 'Bien cuyo consumo crece con el ingreso', 1, 10),
(1260, 238, 'Relación entre impuestos y recaudación', 1, 10),
(1261, 239, 'Un mercado donde se venden acciones', 0, 0),
(1262, 240, 'Un bien cuyo precio es muy alto', 0, 0),
(1263, 241, 'Estabilidad del valor de la moneda', 0, 0),
(1264, 242, 'Un aumento en los precios', 0, 0),
(1265, 243, 'El mercado de los factores de producción.', 0, 0),
(1266, 244, 'Un sistema donde no existen intercambios internacionales', 0, 0),
(1267, 245, 'Política económica que se basa en el control de la oferta monetaria', 1, 10),
(1268, 246, 'Un mercado con pocas empresas que dominan la oferta', 1, 10),
(1269, 247, 'Reducir la oferta de dinero', 0, 0),
(1270, 248, 'El ahorro del gobierno', 0, 0),
(1271, 249, 'Una subida excesiva y no sostenible de los precios de un activo', 1, 10),
(1272, 250, 'Un índice de crecimiento económico', 0, 0),
(1273, 251, 'Disminuir la oferta de dinero para frenar la inflación', 1, 10),
(1274, 252, 'Ajustes en la producción de bienes básicos', 0, 0),
(1275, 253, '//', 0, 0),
(1276, 254, 'Lista', 1, 10),
(1277, 255, 'case', 0, 0),
(1278, 256, '8', 0, 0),
(1279, 257, 'Sting', 0, 0),
(1280, 258, 'Matplotlib', 0, 0),
(1281, 259, 'Han', 0, 0),
(1282, 260, '# Este es un comentario', 1, 10),
(1283, 261, 'fuer', 1, 10),
(1284, 262, 'estática', 0, 0),
(1285, 263, 'SELECT ALL FROM tabla', 0, 0),
(1286, 264, 'Sting', 1, 10),
(1287, 265, 'lista', 0, 0),
(1288, 266, 'Tipo especial que representa la ausencia de valor', 1, 10),
(1289, 267, 'Inserta()', 0, 0),
(1290, 268, 'catch', 0, 0),
(1291, 269, 'Un método para manejar archivos', 0, 0),
(1292, 270, 'Look()', 0, 0),
(1293, 271, 'globalizar', 0, 0),
(1294, 272, 'Reemplaza un valor en una lista', 0, 0),
(1295, 273, 'función', 0, 0),
(1296, 274, '.py', 1, 10),
(1297, 275, 'Una cadena de caracteres', 0, 0),
(1298, 276, 'whileEach()', 0, 0),
(1299, 277, 'Cuenca()', 0, 0),
(1300, 278, 'elimina', 0, 0),
(1301, 279, 'Un diccionario', 0, 0),
(1302, 280, 'Smail()', 0, 0),
(1303, 281, 'ADN()', 0, 0),
(1304, 282, 'La creación de nuevos hilos de ejecución', 0, 0),
(1305, 283, 'Terminar la ejecución del programa', 0, 0),
(1306, 284, 'Jean-Paul Sartre', 1, 10),
(1307, 285, 'El Renacimiento', 0, 0),
(1308, 286, 'Friedrich Hegel', 0, 0),
(1309, 287, 'Pablo Picasso', 1, 10),
(1310, 288, 'Egipto', 0, 0),
(1311, 289, 'Carlos Fuentes', 0, 0),
(1312, 290, 'Siglo XVII', 1, 10),
(1313, 291, 'Georg Wilhelm Friedrich Hegel', 0, 0),
(1314, 292, 'John Locke', 0, 0),
(1315, 293, 'Ernest Hemingway', 0, 0),
(1316, 294, '1918', 1, 10),
(1317, 295, 'Surrealismo', 0, 0),
(1318, 296, 'Charles Darwin', 1, 10),
(1319, 297, 'Fiódor Dostoyevski', 1, 10),
(1320, 298, 'B. F. Skinner', 0, 0),
(1321, 299, 'Europa', 0, 0),
(1322, 300, 'Ensayo', 0, 0),
(1323, 301, 'Søren Kierkegaard', 0, 0),
(1324, 302, 'La Segunda Guerra Mundial', 1, 10),
(1325, 303, 'William Shakespeare', 0, 0),
(1326, 304, 'Jackson Pollock', 0, 0),
(1327, 305, 'Franz Kafka', 1, 10),
(1328, 306, 'Epicuro', 0, 0),
(1329, 307, 'Alexandre Dumas', 1, 10),
(1330, 308, 'Siglo XVII', 0, 0),
(1331, 309, 'Locke', 0, 0),
(1332, 310, 'Argentina', 0, 0),
(1333, 311, 'Gabriel García Márquez', 0, 0),
(1334, 312, 'Immanuel Kant', 1, 10),
(1335, 313, 'Antígona', 0, 0),
(1336, 314, 'Índico', 0, 0),
(1337, 315, 'China ', 1, 10),
(1338, 316, 'América', 0, 0),
(1339, 317, 'India', 0, 0),
(1340, 318, 'Mar de Hering', 0, 0),
(1341, 319, 'Rusia ', 1, 10),
(1342, 320, 'Filipinas', 0, 0),
(1343, 321, 'Canberra ', 1, 10),
(1344, 322, 'Atlántico', 0, 0),
(1345, 323, 'Ottawa ', 1, 10),
(1346, 324, 'Ucrania', 0, 0),
(1347, 325, 'Borneo', 0, 0),
(1348, 326, 'México', 0, 0),
(1349, 327, 'América del Sur', 1, 10),
(1350, 328, 'Pacífico', 0, 0),
(1351, 329, 'Ciudad del Vaticano', 1, 10),
(1352, 330, 'Brasilia', 1, 10),
(1353, 331, 'Japón', 0, 0),
(1354, 332, 'Corea del Sur', 0, 0),
(1355, 333, 'Asia ', 1, 10),
(1356, 334, 'Europa', 0, 0),
(1357, 335, 'Monte Fuji', 0, 0),
(1358, 336, 'Danubio', 0, 0),
(1359, 337, 'Nigeria', 1, 10),
(1360, 338, 'Italia', 0, 0),
(1361, 339, 'Luxar', 0, 0),
(1362, 340, 'Urales ', 1, 10),
(1363, 341, 'Rin', 0, 0),
(1364, 342, 'Oceanía', 0, 0),
(1365, 343, 'Índico', 0, 0),
(1366, 344, 'Japón', 0, 0),
(1367, 345, '140/90 mmHg', 0, 0),
(1368, 346, 'Martillo', 0, 0),
(1369, 347, 'Calcio', 0, 0),
(1370, 348, 'Eritrocitos', 1, 10),
(1371, 349, 'Parathormona', 0, 0),
(1372, 350, '7.0', 0, 0),
(1373, 351, 'Hígado', 1, 10),
(1374, 352, 'Hipófisis', 1, 10),
(1375, 353, 'Tibia', 0, 0),
(1376, 354, 'Cerebelo', 0, 0),
(1377, 355, 'Neuronas', 0, 0),
(1378, 356, 'Sinovial', 1, 10),
(1379, 357, 'Fibrina', 0, 0),
(1380, 358, 'Estómago', 0, 0),
(1381, 359, 'Glomerulonefritis', 0, 0),
(1382, 360, 'Escorbuto', 1, 10),
(1383, 361, 'Células B', 1, 10),
(1384, 362, '100-140 mg/dL', 0, 0),
(1385, 363, 'Glándula pineal', 0, 0),
(1386, 364, 'Cartílago', 0, 0),
(1387, 365, 'Pupila', 1, 10),
(1388, 366, 'Calcio', 0, 0),
(1389, 367, 'Sistema respiratorio', 0, 0),
(1390, 368, 'Hígado', 1, 10),
(1391, 369, 'Basófilos', 0, 0),
(1392, 370, 'Baja actividad tiroidea', 0, 0),
(1393, 371, 'Laringe', 1, 10),
(1394, 372, 'Escorbuto', 0, 0),
(1395, 373, 'Glucosa', 0, 0),
(1396, 374, 'Infección fúngica', 0, 0),
(1397, 375, 'Cuádriceps', 0, 0),
(1398, 376, 'Libra esterlina', 1, 10),
(1399, 377, '1918', 0, 0),
(1400, 378, 'Corazón', 0, 0),
(1401, 379, 'H₂O', 1, 10),
(1402, 380, '1972', 0, 0),
(1403, 381, 'Plomo', 0, 0),
(1404, 382, 'Jane Austen', 0, 0),
(1405, 383, 'Antílope', 0, 0),
(1406, 384, 'Televisor', 0, 0),
(1407, 385, 'Italia', 1, 10),
(1408, 386, 'Yuri Gagarin', 1, 10),
(1409, 387, 'Francés', 0, 0),
(1410, 388, 'Sócrates', 0, 0),
(1411, 389, 'Tierra', 0, 0),
(1412, 390, 'Sismógrafo', 1, 10),
(1413, 391, 'Jirafa', 0, 0),
(1414, 392, 'Francesco Petrarca', 0, 0),
(1415, 393, 'Reino Unido', 1, 10),
(1416, 394, 'Albert Einstein', 0, 0),
(1417, 395, 'Copenhague', 0, 0),
(1418, 396, 'El Día de los Muertos', 0, 0),
(1419, 397, 'Martin Scorsese', 0, 0),
(1420, 398, 'Etiopía', 0, 0),
(1421, 399, 'Nueva York', 1, 10),
(1422, 400, 'Fe', 0, 0),
(1423, 401, 'Gabriel García Márquez', 0, 0),
(1424, 402, 'México', 0, 0),
(1425, 403, 'Persa', 1, 10),
(1426, 404, 'La radioactividad', 1, 10),
(1427, 405, 'Cobre', 0, 0),
(1428, 406, 'Emú', 0, 0),
(1429, 407, 'Puntillismo', 1, 10),
(1430, 408, 'El Me', 0, 0),
(1431, 409, 'Guernica', 0, 0),
(1432, 410, 'Rodin', 0, 0),
(1433, 411, 'Cubismo', 1, 10),
(1434, 412, 'Corea', 0, 0),
(1435, 413, 'Degas', 0, 0),
(1436, 414, 'La catedral de Notre-Dame', 1, 10),
(1437, 415, 'La Bohema', 0, 0),
(1438, 416, 'Miguel Ángel', 0, 0),
(1439, 417, 'Impresionismo', 1, 10),
(1440, 418, 'Italia', 0, 0),
(1441, 419, 'Guernica', 1, 10),
(1442, 420, 'Giuseppe Verdi', 1, 10),
(1443, 421, 'Carboncillo', 0, 0),
(1444, 422, 'Auguste Rodin', 0, 0),
(1445, 423, 'Impresionismo', 0, 0),
(1446, 424, 'El Escorial', 0, 0),
(1447, 425, 'Paul Gauguin', 0, 0),
(1448, 426, 'La joven de la perla', 0, 0),
(1449, 427, 'Renacentista', 0, 0),
(1450, 428, 'Johann Sebastian Bach', 1, 10),
(1451, 429, 'Fauvismo', 1, 10),
(1452, 430, 'Miguel Ángel', 1, 10),
(1453, 431, 'Yeso húmedo', 1, 10),
(1454, 432, 'George Bernard Shaw', 0, 0),
(1455, 433, 'Alemania', 0, 0),
(1456, 434, 'La escuela de Atenas', 0, 0),
(1457, 435, 'Carmen', 0, 0),
(1458, 436, 'Encáustica', 1, 10),
(1459, 437, 'Ludwig Mies van der Rohe', 0, 0),
(1460, 438, 'Surrealismo', 0, 0),
(1461, 439, 'Information on Technology', 0, 0),
(1462, 440, 'Windows ', 1, 10),
(1463, 441, 'Almacenamiento accesible desde internet', 1, 10),
(1464, 442, 'HTML', 0, 0),
(1465, 443, 'Software solo para desarrolladores', 0, 0),
(1466, 444, 'Una red amplia', 1, 10),
(1467, 445, 'Repetidor', 0, 0),
(1468, 446, 'Guardar contraseñas', 0, 0),
(1469, 447, 'Computadoras con sensores', 0, 0),
(1470, 448, 'CPU', 1, 10),
(1471, 449, 'Universal Router Language', 0, 0),
(1472, 450, 'Una herramienta de programación', 0, 0),
(1473, 451, 'High-Tech Machine Learning', 0, 0),
(1474, 452, 'Un lenguaje de programación', 0, 0),
(1475, 453, 'Un software de diseño gráfico', 0, 0),
(1476, 454, 'La superposición de objetos virtuales en el mundo real', 1, 10),
(1477, 455, 'Una versión de procesadores', 0, 0),
(1478, 456, 'Un programa de computadora', 0, 0),
(1479, 457, 'Una forma de optimizar la memoria', 0, 0),
(1480, 458, 'Control Processing Unit', 0, 0),
(1481, 459, 'Secure Software Disk', 0, 0),
(1482, 460, 'Safari', 0, 0),
(1483, 461, 'Hardware avanzado de aprendizaje', 0, 0),
(1484, 462, 'Un software para navegar en internet', 0, 0),
(1485, 463, 'Transforma señales analógicas en digitales', 0, 0),
(1486, 464, 'Una herramienta de edición de video', 0, 0),
(1487, 465, '00:1A:2B:3 C:4D:5E', 1, 10),
(1488, 466, 'Un programa que entrega páginas web a los usuarios', 1, 10),
(1489, 467, 'Un archivo cifrado para mayor seguridad', 0, 0),
(1490, 468, 'Una base de datos virtual', 0, 0),
(1491, 469, 'Un tipo de navegador web', 0, 0),
(1492, 470, 'Configuración de un servidor', 0, 0),
(1493, 471, 'Ley de Newton de la gravitación', 0, 0),
(1494, 472, 'Su masa', 0, 0),
(1495, 473, 'La aceleración es cero', 0, 0),
(1496, 474, 'La diferencia de potencial', 1, 10),
(1497, 475, 'Ley de Boyle', 0, 0),
(1498, 476, '12', 0, 0),
(1499, 477, 'Covalente ', 1, 10),
(1500, 478, 'O2', 0, 0),
(1501, 479, 'Una sustancia que libera iones 𝑂𝐻−en agua', 0, 0),
(1502, 480, '30', 0, 0),
(1503, 481, '5:20 PM', 1, 10),
(1504, 482, '9', 1, 10),
(1505, 483, '4500', 0, 0),
(1506, 484, 'Miércoles', 0, 0),
(1507, 485, '6 años ', 0, 0),
(1508, 486, 'Es constante', 0, 0),
(1509, 487, 'Masa', 0, 0),
(1510, 488, 'Helio ', 1, 10),
(1511, 489, 'Nucleótidos', 0, 0),
(1512, 490, 'Hemoglobina ', 1, 10),
(1534, 1, '5', 0, 0),
(1535, 2, '15 cm', 0, 0),
(1536, 3, 'Mercurio', 1, 10),
(1537, 4, 'Oxalato', 0, 0),
(1538, 5, 'Wilt Chamberlain', 0, 0),
(1539, 6, 'Padres de San Diego', 0, 0),
(1540, 7, 'Aburrido', 0, 0),
(1541, 8, 'Un argumento', 1, 10),
(1542, 9, 'Aguascalientes', 0, 0),
(1543, 10, 'Nina, Pinta, Merlín', 0, 0),
(1544, 11, 'Son las ofertas en un BUEN FIN', 0, 0),
(1545, 12, 'Prestar dinero y los créditos', 0, 0),
(1546, 13, 'Programación Ahorita Objetos', 0, 0),
(1547, 14, 'Infraestructura', 0, 0),
(1548, 15, 'Sócrates', 1, 10),
(1549, 16, 'El estudio de la semántica y la semiótica', 0, 0),
(1550, 17, 'Canjes', 0, 0),
(1551, 18, 'América de Oeste', 0, 0),
(1552, 19, '205', 0, 0),
(1553, 20, 'Vitamina K', 1, 10),
(1554, 21, 'Inglés', 0, 0),
(1555, 22, '1678', 0, 0),
(1556, 23, 'Vincent van Gogh', 1, 10),
(1557, 24, ' El Grito', 0, 0),
(1558, 25, 'Ninguna', 0, 0),
(1559, 26, 'Albert Einstein', 0, 0),
(1560, 27, 'Johan Cruyff', 0, 0);
INSERT INTO `respuesta` (`id_respuesta`, `id_pregunta`, `respuesta`, `correcta`, `puntos`) VALUES
(1561, 28, '34 m', 0, 0),
(1562, 29, '46%', 0, 0),
(1563, 30, '32.5 g', 0, 0),
(1564, 31, 'Aristóteles', 0, 0),
(1565, 32, 'Oro', 0, 0),
(1566, 33, '85', 1, 10),
(1567, 34, '5 pasos', 0, 0),
(1568, 35, 'Inglaterra', 0, 0),
(1569, 36, '9', 1, 10),
(1570, 37, 'Gael', 0, 0),
(1571, 38, 'Bello', 1, 10),
(1572, 39, 'Descriptivo', 0, 0),
(1573, 40, '1940', 0, 0),
(1574, 41, '1950', 0, 0),
(1575, 42, 'Francia', 0, 0),
(1576, 43, 'La política que limita el comercio internacional', 0, 0),
(1577, 44, ' La cantidad de dinero en circulación en una economía', 0, 0),
(1578, 45, 'La disminución de los tipos de interés en una economía', 0, 0),
(1579, 46, 'De función();', 0, 0),
(1580, 47, 'Un bucle que se ejecuta solo si hay un error en el código', 0, 0),
(1581, 48, 'Un espacio en memoria donde se almacena un dato que puede cambiar', 1, 10),
(1582, 49, 'Karl Marx', 0, 0),
(1583, 50, ' Un sistema filosófico que rechazaba el pensamiento científico', 1, 10),
(1584, 51, 'Historia', 1, 10),
(1585, 52, 'Turquía', 0, 0),
(1586, 53, 'Bakú', 0, 0),
(1587, 54, 'Praga', 0, 0),
(1588, 55, 'Zúrich', 1, 10),
(1589, 56, 'Plaquetas', 0, 0),
(1590, 57, 'Riñón', 0, 0),
(1591, 58, 'Parásito', 0, 0),
(1592, 59, 'Melbourne', 0, 0),
(1593, 60, 'India', 0, 0),
(1594, 61, '1865', 0, 0),
(1595, 62, 'Azul, amarillo,morado', 0, 0),
(1596, 63, 'Verde, morado,naranja', 1, 10),
(1597, 64, 'Francia', 0, 0),
(1598, 65, 'Mark Zuckerberg', 0, 0),
(1599, 66, 'Pantalla de la computadora', 0, 0),
(1600, 67, '11', 1, 10),
(1601, 68, '8', 0, 0),
(1602, 69, '128 cm² ', 0, 0),
(1603, 70, '78', 0, 0),
(1604, 71, '15', 0, 0),
(1605, 72, '5', 0, 0),
(1606, 73, '24', 0, 0),
(1607, 74, 'Rectángulo ', 1, 10),
(1608, 75, 'Ninguno', 0, 0),
(1609, 76, '100', 0, 0),
(1610, 77, '34 cm', 1, 10),
(1611, 78, '300', 0, 0),
(1612, 79, '21 cm', 0, 0),
(1613, 80, '27', 1, 10),
(1614, 81, '6', 0, 0),
(1615, 82, '11', 1, 10),
(1616, 83, '12', 0, 0),
(1617, 84, '1', 0, 0),
(1618, 85, '$150', 0, 0),
(1619, 86, '25', 0, 0),
(1620, 87, '10', 0, 0),
(1621, 88, '15', 0, 0),
(1622, 89, '100', 1, 10),
(1623, 90, '8', 1, 10),
(1624, 91, '700', 0, 0),
(1625, 92, '15', 0, 0),
(1626, 93, '18', 0, 0),
(1627, 94, '3.1416', 1, 10),
(1628, 95, '48', 0, 0),
(1629, 96, '$180', 0, 0),
(1630, 97, '27 cm', 1, 10),
(1631, 98, 'Energía lumínica', 1, 10),
(1632, 99, 'Urano', 0, 0),
(1633, 100, 'Hidrógeno', 0, 0),
(1634, 101, 'Riñones ', 1, 10),
(1635, 102, 'Plata', 0, 0),
(1636, 103, 'La estructura de las células', 0, 0),
(1637, 104, 'Respiración celular', 1, 10),
(1638, 105, 'Volcánica', 0, 0),
(1639, 106, 'Caracol', 0, 0),
(1640, 107, 'Nikola Tesla', 0, 0),
(1641, 108, 'Venus', 0, 0),
(1642, 109, 'Isótopos', 0, 0),
(1643, 110, 'Molécula', 0, 0),
(1644, 111, 'Filtración', 0, 0),
(1645, 112, 'Litosfera', 0, 0),
(1646, 113, 'Calamar', 0, 0),
(1647, 114, 'Solidificación', 0, 0),
(1648, 115, 'Productor ', 1, 10),
(1649, 116, 'Producir hormonas', 0, 0),
(1650, 117, 'Plasma', 0, 0),
(1651, 118, 'Vatio', 0, 0),
(1652, 119, 'Helio', 0, 0),
(1653, 120, 'Aluminio', 0, 0),
(1654, 121, 'Hierro', 0, 0),
(1655, 122, 'Fermentación', 0, 0),
(1656, 123, 'Benceno', 0, 0),
(1657, 124, 'La evolución de las plantas', 0, 0),
(1658, 125, 'Virus', 0, 0),
(1659, 126, 'Piel ', 1, 10),
(1660, 127, 'Einstein y Hawking', 0, 0),
(1661, 128, 'Raíz ', 1, 10),
(1662, 129, 'Voleibol', 0, 0),
(1663, 130, '4', 0, 0),
(1664, 131, 'La Copa América', 0, 0),
(1665, 132, '3', 1, 10),
(1666, 133, 'Voleibol', 0, 0),
(1667, 134, 'Cruci', 0, 0),
(1668, 135, 'Mbappé', 0, 0),
(1669, 136, 'Ciclismo', 0, 0),
(1670, 137, 'Corea del Norte', 0, 0),
(1671, 138, 'China', 0, 0),
(1672, 139, '4', 0, 0),
(1673, 140, 'Ciclismo ', 1, 10),
(1674, 141, 'Hockey', 0, 0),
(1675, 142, 'Shaquille O\'Neal', 0, 0),
(1676, 143, '5', 1, 10),
(1677, 144, '7', 0, 0),
(1678, 145, 'El Gran Premio de Mónaco', 1, 10),
(1679, 146, 'Pete Sampras', 0, 0),
(1680, 147, '1939', 0, 0),
(1681, 148, '15', 1, 10),
(1682, 149, 'Ping-pong', 0, 0),
(1683, 150, 'Golden State Warriors', 0, 0),
(1684, 151, 'Waterpolo', 0, 0),
(1685, 152, 'Trofeo Lombardi', 1, 10),
(1686, 153, 'Ciclismo', 0, 0),
(1687, 154, 'Inglaterra', 0, 0),
(1688, 155, 'Portugal', 0, 0),
(1689, 156, 'Cricket', 0, 0),
(1690, 157, 'Martina Navratilova', 0, 0),
(1691, 158, 'Tenis', 0, 0),
(1692, 159, 'Boxeo', 0, 0),
(1693, 160, 'Canción', 1, 10),
(1694, 161, 'Bajo', 0, 0),
(1695, 162, 'Libro', 0, 0),
(1696, 163, 'Adverbio', 1, 10),
(1697, 164, 'Copretérito', 1, 10),
(1698, 165, 'Extraño', 0, 0),
(1699, 166, 'Rápido', 0, 0),
(1700, 167, 'Pronombre', 0, 0),
(1701, 168, 'Adjetivo', 1, 10),
(1702, 169, 'Estoy corriendo en el parque', 0, 0),
(1703, 170, 'No sirve de nada madrugar', 0, 0),
(1704, 171, 'Adverbio', 1, 10),
(1705, 172, 'Lápices', 1, 10),
(1706, 173, 'Más allá', 0, 0),
(1707, 174, 'Corre', 0, 0),
(1708, 175, 'Ellos', 0, 0),
(1709, 176, 'Alegre', 0, 0),
(1710, 177, 'Calentar el ambiente', 0, 0),
(1711, 178, 'Este', 1, 10),
(1712, 179, 'Lucha', 0, 0),
(1713, 180, 'Vemos', 0, 0),
(1714, 181, 'Ancho', 0, 0),
(1715, 182, 'Pronombre', 0, 0),
(1716, 183, 'Con', 0, 0),
(1717, 184, 'Presente', 0, 0),
(1718, 185, 'Raíces', 1, 10),
(1719, 186, 'Débil', 0, 0),
(1720, 187, 'Claro', 0, 0),
(1721, 188, 'Examen', 0, 0),
(1722, 189, 'Rápido', 0, 0),
(1723, 190, 'Mañana', 1, 10),
(1724, 191, 'John Adams', 0, 0),
(1725, 192, '1492', 1, 10),
(1726, 193, 'Los griegos', 0, 0),
(1727, 194, 'El Imperio Bizantino', 0, 0),
(1728, 195, 'Julio César', 0, 0),
(1729, 196, 'Los chinos', 0, 0),
(1730, 197, '1939', 0, 0),
(1731, 198, 'Mahatma Gandhi', 1, 10),
(1732, 199, 'Guerra de Crimea', 0, 0),
(1733, 200, 'El Tratado de Versalles', 0, 0),
(1734, 201, 'Nerón', 0, 0),
(1735, 202, '1804', 0, 0),
(1736, 203, 'Los toltecas', 0, 0),
(1737, 204, 'Unión Soviética', 1, 10),
(1738, 205, 'La guerra de Corea', 0, 0),
(1739, 206, 'Che Guevara', 0, 0),
(1740, 207, '1848', 0, 0),
(1741, 208, 'Japón', 0, 0),
(1742, 209, 'La caída del Imperio Bizantino', 1, 10),
(1743, 210, 'Nerón', 0, 0),
(1744, 211, 'Italia', 0, 0),
(1745, 212, 'Cleopatra', 0, 0),
(1746, 213, 'El control de rutas comerciales', 0, 0),
(1747, 214, 'España', 1, 10),
(1748, 215, 'José de San Martín', 0, 0),
(1749, 216, 'Brasil', 1, 10),
(1750, 217, 'El comienzo de la guerra de los Cien Años', 0, 0),
(1751, 218, '1492', 0, 0),
(1752, 219, 'Wu Metían', 0, 0),
(1753, 220, 'Polonia', 1, 10),
(1754, 221, 'La Guerra de Crimea', 0, 0),
(1755, 222, 'Personas con empleo', 0, 0),
(1756, 223, 'Ingresos de las empresas', 0, 0),
(1757, 224, 'Mercado con pocos productores', 0, 0),
(1758, 225, 'Cantidad ofrecida a diferentes precios', 0, 0),
(1759, 226, 'Costo de la inversión pública', 0, 0),
(1760, 227, 'Fomentar las exportaciones', 0, 0),
(1761, 228, 'Mercado regulado por el gobierno', 0, 0),
(1762, 229, 'Mide el nivel de inversión', 0, 0),
(1763, 230, 'Cambio en el consumo por cambio de precio', 1, 10),
(1764, 231, 'Habilidades y conocimientos de los trabajadores', 1, 10),
(1765, 232, 'Costo dentro de la empresa', 0, 0),
(1766, 233, 'Mercado de empresas públicas', 0, 0),
(1767, 234, 'Aumento del empleo', 0, 0),
(1768, 235, 'Mercado de acciones y bonos', 1, 10),
(1769, 236, 'Nivel de inflación', 0, 0),
(1770, 237, 'Bien con demanda estable', 0, 0),
(1771, 238, 'Relación entre oferta y demanda', 0, 0),
(1772, 239, 'Un mercado para el trueque de bienes', 0, 0),
(1773, 240, 'Un bien que siempre tiene una demanda estable', 0, 0),
(1774, 241, 'Crecimiento de las reservas internacionales', 0, 0),
(1775, 242, 'Una caída en el desempleo', 0, 0),
(1776, 243, 'El mercado donde se venden bonos y acciones', 0, 0),
(1777, 244, 'Un sistema donde las decisiones de producción son tomadas por empresas privadas', 1, 10),
(1778, 245, 'Teoría que promueve la regulación de los salarios', 0, 0),
(1779, 246, 'Un mercado en el que el gobierno controla la producción', 0, 0),
(1780, 247, 'Aumentar la oferta de dinero para estimular la economía', 1, 10),
(1781, 248, 'El nivel de deuda externa', 0, 0),
(1782, 249, '', 0, 0),
(1783, 250, 'Una medida de la desigualdad en el ingreso', 1, 10),
(1784, 251, 'Aumentar los impuestos', 0, 0),
(1785, 252, 'Reestructuración de las instituciones bancarias', 0, 0),
(1786, 253, '%', 1, 10),
(1787, 254, 'Entero', 0, 0),
(1788, 255, 'Chen', 0, 0),
(1789, 256, '7', 0, 0),
(1790, 257, 'flota', 1, 10),
(1791, 258, 'NumPy', 0, 0),
(1792, 259, 'Error', 0, 0),
(1793, 260, '¡<!-- Este es un comentario -->', 0, 0),
(1794, 261, 'itérate', 0, 0),
(1795, 262, 'constante', 0, 0),
(1796, 263, 'SELECTO * FROM tabla', 1, 10),
(1797, 264, 'booleana', 0, 0),
(1798, 265, 'dice', 0, 0),
(1799, 266, 'Cadena vacía', 0, 0),
(1800, 267, 'Extendé()', 0, 0),
(1801, 268, 'ti', 1, 10),
(1802, 269, 'Una clase de objetos', 0, 0),
(1803, 270, 'Jet()', 1, 10),
(1804, 271, 'define', 0, 0),
(1805, 272, 'Concatena los elementos de una lista en una cadena', 1, 10),
(1806, 273, 'las', 0, 0),
(1807, 274, '.html', 0, 0),
(1808, 275, 'Un tipo de lista', 0, 0),
(1809, 276, 'fuer', 1, 10),
(1810, 277, '.', 0, 0),
(1811, 278, 'drop', 1, 10),
(1812, 279, 'Una cadena', 0, 0),
(1813, 280, 'Tini()', 0, 0),
(1814, 281, 'Extendé()', 1, 10),
(1815, 282, 'Una función que se llama a sí misma', 1, 10),
(1816, 283, 'Establecer el valor de la variable', 0, 0),
(1817, 284, 'Albert Camus', 0, 0),
(1818, 285, 'El Descubrimiento de América', 0, 0),
(1819, 286, 'John Locke', 1, 10),
(1820, 287, 'Diego Rivera', 0, 0),
(1821, 288, 'Mesopotamia', 0, 0),
(1822, 289, 'Rosario Castellanos', 0, 0),
(1823, 290, 'Siglo XVIII', 0, 0),
(1824, 291, 'Martin Heidegger', 0, 0),
(1825, 292, 'Jean-Jacques Rousseau', 1, 10),
(1826, 293, 'William Faulkner', 0, 0),
(1827, 294, '1922', 0, 0),
(1828, 295, 'Cubismo ', 1, 10),
(1829, 296, 'Galilea', 0, 0),
(1830, 297, 'Iván Burgueses', 0, 0),
(1831, 298, 'Abraham Maslow', 0, 0),
(1832, 299, 'América del Sur', 1, 10),
(1833, 300, 'Comedia musical', 0, 0),
(1834, 301, 'René Descartes', 1, 10),
(1835, 302, 'La Guerra Fría\r\n', 0, 0),
(1836, 303, 'Federico García Lorca', 0, 0),
(1837, 304, 'Marc Chagall', 0, 0),
(1838, 305, 'Jean-Paul Sartre', 0, 0),
(1839, 306, 'Aristóteles', 1, 10),
(1840, 307, 'Marcel Proust', 0, 0),
(1841, 308, 'Siglo XVIII', 0, 0),
(1842, 309, 'Descartes', 0, 0),
(1843, 310, 'Perú', 0, 0),
(1844, 311, 'Juan Rulfo', 1, 10),
(1845, 312, 'Thomas Hobbes', 0, 0),
(1846, 313, 'Prestada', 0, 0),
(1847, 314, 'Ártico', 0, 0),
(1848, 315, 'Rusia', 0, 0),
(1849, 316, 'Oceanía ', 1, 10),
(1850, 317, 'Pakistán', 0, 0),
(1851, 318, ' Mar Rojo', 0, 0),
(1852, 319, 'Estados Unidos', 0, 0),
(1853, 320, 'Japón', 0, 0),
(1854, 321, 'Adelaida', 0, 0),
(1855, 322, 'Índico ', 1, 10),
(1856, 323, 'Vancouver', 0, 0),
(1857, 324, 'Finlandia', 0, 0),
(1858, 325, 'Australia', 0, 0),
(1859, 326, 'Perú', 0, 0),
(1860, 327, 'Australia', 0, 0),
(1861, 328, 'Atlántico ', 1, 10),
(1862, 329, 'Liechtenstein', 0, 0),
(1863, 330, 'Salvador', 0, 0),
(1864, 331, 'Costa Rica', 0, 0),
(1865, 332, 'Tailandia', 0, 0),
(1866, 333, 'América', 0, 0),
(1867, 334, 'Oceanía', 0, 0),
(1868, 335, 'Monte Kilimanjaro', 0, 0),
(1869, 336, 'Elba', 0, 0),
(1870, 337, 'Egipto', 0, 0),
(1871, 338, 'Egipto ', 1, 10),
(1872, 339, 'Túnez', 0, 0),
(1873, 340, 'Andes', 0, 0),
(1874, 341, 'Dniéper', 0, 0),
(1875, 342, 'Asia', 0, 0),
(1876, 343, 'Ártico', 0, 0),
(1877, 344, 'Indonesia', 0, 0),
(1878, 345, '160/100 mmHg', 0, 0),
(1879, 346, 'Vestíbulo', 1, 10),
(1880, 347, 'Magnesio', 0, 0),
(1881, 348, 'Linfocitos', 0, 0),
(1882, 349, 'Tiroxina', 0, 0),
(1883, 350, '8.0', 0, 0),
(1884, 351, 'Páncreas', 0, 0),
(1885, 352, 'Suprarrenales', 0, 0),
(1886, 353, 'Radio', 0, 0),
(1887, 354, 'Hipocampo', 0, 0),
(1888, 355, 'Leucocitos', 1, 10),
(1889, 356, 'Fibrosa', 0, 0),
(1890, 357, 'Hemoglobina', 1, 10),
(1891, 358, 'Intestino grueso', 0, 0),
(1892, 359, 'Lupus', 0, 0),
(1893, 360, 'Pelagra', 0, 0),
(1894, 361, 'Plaquetas', 0, 0),
(1895, 362, '140-180 mg/dL', 0, 0),
(1896, 363, 'Glándulas suprarrenales', 1, 10),
(1897, 364, 'Tejido adiposo', 0, 0),
(1898, 365, 'Nervio óptico', 0, 0),
(1899, 366, 'Fosfato', 0, 0),
(1900, 367, 'Sistema circulatorio', 0, 0),
(1901, 368, 'Estómago', 0, 0),
(1902, 369, 'Linfocitos', 0, 0),
(1903, 370, 'Insuficiencia renal', 0, 0),
(1904, 371, 'Pulmones', 0, 0),
(1905, 372, 'Raquitismo', 1, 10),
(1906, 373, 'Proteínas', 0, 0),
(1907, 374, 'Infección parasitaria', 0, 0),
(1908, 375, 'Deltoides', 0, 0),
(1909, 376, 'Yen', 0, 0),
(1910, 377, '1921', 1, 10),
(1911, 378, 'Riñones', 0, 0),
(1912, 379, 'CH4', 0, 0),
(1913, 380, '1975', 0, 0),
(1914, 381, 'Litio', 1, 10),
(1915, 382, 'Oscar Wilde', 0, 0),
(1916, 383, 'Tigre', 0, 0),
(1917, 384, 'Radio', 0, 0),
(1918, 385, 'Grecia', 0, 0),
(1919, 386, 'Buzz Aldrin', 0, 0),
(1920, 387, 'Griego', 0, 0),
(1921, 388, 'Homero', 1, 10),
(1922, 389, 'Marte', 0, 0),
(1923, 390, 'Anemómetro', 0, 0),
(1924, 391, 'Ballena azul', 1, 10),
(1925, 392, 'Nicolás Maquiavelo', 0, 0),
(1926, 393, 'Italia', 0, 0),
(1927, 394, 'Alexander Fleming', 1, 10),
(1928, 395, 'Helsinki', 0, 0),
(1929, 396, 'El Día de la Revolución Mexicana', 0, 0),
(1930, 397, 'Quentin Tarantino', 0, 0),
(1931, 398, 'Brasil', 1, 10),
(1932, 399, 'Los Ángeles', 0, 0),
(1933, 400, 'A', 1, 10),
(1934, 401, 'Jorge Luis Borges', 0, 0),
(1935, 402, 'Cuba', 0, 0),
(1936, 403, 'Turco', 0, 0),
(1937, 404, 'La ley de la gravedad', 0, 0),
(1938, 405, 'Oro', 0, 0),
(1939, 406, 'Ornitorrinco', 0, 0),
(1940, 407, 'Expresionismo', 0, 0),
(1941, 408, 'La Galería Uffizi', 0, 0),
(1942, 409, 'Las Meninas', 0, 0),
(1943, 410, 'Miguel Ángel', 1, 10),
(1944, 411, 'Barroco', 0, 0),
(1945, 412, 'Vietnam', 0, 0),
(1946, 413, 'Cézanne', 0, 0),
(1947, 414, 'El Coliseo', 0, 0),
(1948, 415, 'El Cascanueces', 0, 0),
(1949, 416, 'Leonardo da Vinci', 1, 10),
(1950, 417, 'Neoclasicismo', 0, 0),
(1951, 418, 'Alemania', 0, 0),
(1952, 419, 'El grito', 0, 0),
(1953, 420, 'Richard Wagner', 0, 0),
(1954, 421, 'Acrílico', 0, 0),
(1955, 422, 'Louise Bourgeois', 0, 0),
(1956, 423, 'Surrealismo', 1, 10),
(1957, 424, 'El Alcázar de Segovia', 0, 0),
(1958, 425, 'Edgar Degas', 1, 10),
(1959, 426, 'La Gioconda', 1, 10),
(1960, 427, 'Neoclásico', 0, 0),
(1961, 428, 'Antonio Vivaldi', 0, 0),
(1962, 429, 'Surrealismo', 0, 0),
(1963, 430, 'Canoa', 0, 0),
(1964, 431, 'Carboncillo', 0, 0),
(1965, 432, 'William Shakespeare', 1, 10),
(1966, 433, 'Francia', 1, 10),
(1967, 434, 'Las Meninas', 0, 0),
(1968, 435, 'Giselle', 0, 0),
(1969, 436, 'Óleo', 0, 0),
(1970, 437, 'Antoni Gaudí', 0, 0),
(1971, 438, 'Cubismo', 0, 0),
(1972, 439, 'Integrated Operational Tools', 0, 0),
(1973, 440, 'Android', 0, 0),
(1974, 441, 'Una base de datos local', 0, 0),
(1975, 442, 'Python ', 1, 10),
(1976, 443, 'Software con licencia restringida', 0, 0),
(1977, 444, 'Una red de área personal', 0, 0),
(1978, 445, 'Modem ', 1, 10),
(1979, 446, 'Acelerar la conexión a internet', 0, 0),
(1980, 447, 'Programas sin intervención humana', 0, 0),
(1981, 448, 'Tarjeta de video', 0, 0),
(1982, 449, 'Unificó Routing Lógica', 0, 0),
(1983, 450, 'La unidad básica de información digital', 1, 10),
(1984, 451, 'High-Tech Machine Learning', 0, 0),
(1985, 452, 'Un programa que administra recursos de hardware y software', 1, 10),
(1986, 453, 'Una técnica de programación', 0, 0),
(1987, 454, 'La interacción de robots con humanos', 0, 0),
(1988, 455, 'Un lenguaje de programación', 0, 0),
(1989, 456, 'Un lenguaje de programación', 0, 0),
(1990, 457, 'Una base de datos distribuida y segura ', 1, 10),
(1991, 458, 'Core Programming Unit', 0, 0),
(1992, 459, 'Simple Storage Device', 0, 0),
(1993, 460, 'Google Chrome', 1, 10),
(1994, 461, 'Sistemas que ejecutan instrucciones predefinidas', 0, 0),
(1995, 462, 'Un tipo de almacenamiento', 0, 0),
(1996, 463, 'Proporciona direcciones IP', 0, 0),
(1997, 464, 'Un componente del procesador', 0, 0),
(1998, 465, '255.255.255.0', 0, 0),
(1999, 466, 'Un lenguaje de programación', 0, 0),
(2000, 467, 'Un archivo creado solo para imágenes', 0, 0),
(2001, 468, 'Un programa automatizado que realiza tareas', 1, 10),
(2002, 469, 'Un servidor de red', 0, 0),
(2003, 470, 'Actualización de software\r\n\r\n', 0, 0),
(2004, 471, 'Segunda ley de Newton', 1, 10),
(2005, 472, 'Su aceleración', 0, 0),
(2006, 473, 'La velocidad es máxima', 0, 0),
(2007, 474, 'La potencia', 0, 0),
(2008, 475, 'Ley de Charles', 0, 0),
(2009, 476, '16', 0, 0),
(2010, 477, 'Van der Alas', 0, 0),
(2011, 478, 'O3', 0, 0),
(2012, 479, 'Una sustancia que libera iones 𝐻+en agua', 1, 10),
(2013, 480, '18', 0, 0),
(2014, 481, '6:40 PM', 0, 0),
(2015, 482, '7', 0, 0),
(2016, 483, '4005', 0, 0),
(2017, 484, 'Viernes', 0, 0),
(2018, 485, '36 años ', 1, 10),
(2019, 486, 'Es negativa', 0, 0),
(2020, 487, 'Potencia', 0, 0),
(2021, 488, 'Nitrógeno', 0, 0),
(2022, 489, 'Aminoácidos ', 1, 10),
(2023, 490, 'Colágeno', 0, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `respuesta_encuesta`
--

CREATE TABLE `respuesta_encuesta` (
  `id_pregunta` int(11) NOT NULL,
  `id_opcion` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `respuesta_encuesta`
--

INSERT INTO `respuesta_encuesta` (`id_pregunta`, `id_opcion`) VALUES
(2, 5),
(3, 10),
(4, 12),
(5, 14),
(2, 6),
(3, 9),
(4, 12),
(5, 15),
(2, 6),
(3, 9),
(4, 12),
(5, 14);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `status`
--

CREATE TABLE `status` (
  `ID_STATUS` int(11) NOT NULL,
  `DESCRIPCION` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `status`
--

INSERT INTO `status` (`ID_STATUS`, `DESCRIPCION`) VALUES
(1, 'ACTIVO'),
(2, 'INACTIVO'),
(3, 'SUSPENDIDO'),
(4, 'PENDIENTE'),
(5, 'BAJA');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipo_usuario`
--

CREATE TABLE `tipo_usuario` (
  `id_tp_usuario` int(11) NOT NULL,
  `descripcion` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `tipo_usuario`
--

INSERT INTO `tipo_usuario` (`id_tp_usuario`, `descripcion`) VALUES
(1, 'USUARIO'),
(2, 'EDITOR'),
(3, 'ADMINISTRADOR');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `username` varchar(45) NOT NULL,
  `email` varchar(45) NOT NULL,
  `password` varchar(225) NOT NULL,
  `verificado` tinyint(1) DEFAULT 0,
  `token` varchar(255) DEFAULT NULL,
  `actualizacion` int(11) DEFAULT NULL,
  `token_expira` datetime DEFAULT NULL,
  `puntos` int(11) DEFAULT 0,
  `id_tp_usuario` int(11) NOT NULL,
  `id_status` int(11) NOT NULL,
  `token_reseteo` datetime DEFAULT NULL,
  `token_reseteo_expira` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `username`, `email`, `password`, `verificado`, `token`, `actualizacion`, `token_expira`, `puntos`, `id_tp_usuario`, `id_status`, `token_reseteo`, `token_reseteo_expira`) VALUES
(38, 'Daniel', 'danielviramontes562@gmail.com', '$2b$10$d1hj5RO7GIBbSdLjNLq2QuMVukUQe4ORySBIJJ4mlK223ARbZgw.u', 1, NULL, NULL, NULL, 0, 3, 1, NULL, NULL),
(39, 'juanito14', 'juanjose.chavez.15153@gmail.com', '$2b$10$pbg4j7.mldd547o6OyIjSe8oH3Um1/JvswGLOnAnvXdnvPuqWnIpu', 1, NULL, NULL, NULL, 0, 3, 1, NULL, NULL),
(40, 'Nievedeposole12', 'pedrozamiguel0123@gmail.com', '$2b$10$OYweYO11IUbWFmwRywa33eL/iTG0bcsK/v7hQXdQWRatpMsNZGU/W', 1, NULL, NULL, NULL, 0, 3, 1, NULL, NULL),
(45, 'Eduardo García', 'eduardogarcia080806@gmail.com', '$2b$12$7ANoCz8irhoWI1/xfJgame05jYw6HH8ZQTF0AA4pwaTTUN1mBcN86', 1, NULL, NULL, NULL, 0, 3, 1, NULL, NULL),
(49, 'snejen', 'diegoleonardoportillarangel@gmail.com', '$2b$10$eo.bd/ZJ6OfBYYH4nYh84OBrE1IcgFrVbpZ5nGYIA0m0AIpuAKW6C', 1, NULL, NULL, NULL, 0, 3, 1, NULL, NULL),
(51, 'kjdsndfnjnf', 'seniorsoldadorazosonicko@gmail.com', '$2b$10$g30xIr/ilg/Wsrd9IyeffeaXLpGAaXYYUP5OaQjZM9y9BiFZWZiLu', 1, NULL, NULL, NULL, 0, 3, 1, NULL, NULL),
(53, 'DIEGO LEONARDO PORTILLA RANGEL', '23301061550112@cetis155.edu.mx', '', 1, NULL, NULL, NULL, 0, 3, 1, NULL, NULL),
(54, 'pedrito', '23301061550096@cetis155.edu.mx', '$2b$10$TzF8TXwXHOw4TUOf/zUJ3.y7rUixsqXJCCLMgXWswbnHVQ3niloMm', 1, NULL, NULL, NULL, 0, 3, 1, NULL, NULL),
(64, 'Daniel', 'danielviramontes762@gmail.com', '$2b$10$esSX6qM6QfXeJfiZloenVuntJ.UM8M.Dtr.CfitKpUVeiKNs6iSGm', 1, NULL, NULL, NULL, 0, 1, 1, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_carrera`
--

CREATE TABLE `usuario_carrera` (
  `id_usuario` int(11) NOT NULL,
  `id_carrera` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_examen`
--

CREATE TABLE `usuario_examen` (
  `id_usuario` int(11) NOT NULL,
  `id_examen` int(11) NOT NULL,
  `maximo` int(11) NOT NULL,
  `obtenido` int(11) NOT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_termino` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `carrera`
--
ALTER TABLE `carrera`
  ADD PRIMARY KEY (`id_carrera`);

--
-- Indices de la tabla `dificultad`
--
ALTER TABLE `dificultad`
  ADD PRIMARY KEY (`id_dificultad`);

--
-- Indices de la tabla `encuesta`
--
ALTER TABLE `encuesta`
  ADD PRIMARY KEY (`id_encuesta`);

--
-- Indices de la tabla `estatus_pregunta`
--
ALTER TABLE `estatus_pregunta`
  ADD PRIMARY KEY (`id_estatus_p`);

--
-- Indices de la tabla `examen`
--
ALTER TABLE `examen`
  ADD PRIMARY KEY (`id_examen`),
  ADD KEY `id_dificultad` (`id_dificultad`);

--
-- Indices de la tabla `examenes_grupo`
--
ALTER TABLE `examenes_grupo`
  ADD PRIMARY KEY (`id_examen_grupo`);

--
-- Indices de la tabla `grupos`
--
ALTER TABLE `grupos`
  ADD PRIMARY KEY (`id_grupo`);

--
-- Indices de la tabla `grupo_examenes`
--
ALTER TABLE `grupo_examenes`
  ADD PRIMARY KEY (`id_grupo`,`id_examen_grupo`),
  ADD KEY `id_examen_grupo` (`id_examen_grupo`);

--
-- Indices de la tabla `grupo_usuarios`
--
ALTER TABLE `grupo_usuarios`
  ADD PRIMARY KEY (`id_grupo`,`id_usuario`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `historial`
--
ALTER TABLE `historial`
  ADD KEY `id_examen` (`id_examen`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_pregunta` (`id_pregunta`),
  ADD KEY `id_respuesta` (`id_respuesta`);

--
-- Indices de la tabla `materias`
--
ALTER TABLE `materias`
  ADD PRIMARY KEY (`id_materia`);

--
-- Indices de la tabla `opcion_pregunta`
--
ALTER TABLE `opcion_pregunta`
  ADD PRIMARY KEY (`id_opcion`),
  ADD KEY `fk_opcion_pregunta_pregunta` (`id_pregunta`);

--
-- Indices de la tabla `pregunta`
--
ALTER TABLE `pregunta`
  ADD PRIMARY KEY (`id_pregunta`),
  ADD KEY `id_materia` (`id_materia`);

--
-- Indices de la tabla `pregunta_encuesta`
--
ALTER TABLE `pregunta_encuesta`
  ADD PRIMARY KEY (`id_pregunta`),
  ADD KEY `fk_pregunta_encuesta_encuesta` (`id_encuesta`),
  ADD KEY `fk_estatus_p` (`id_estatus_p`);

--
-- Indices de la tabla `pregunta_examen`
--
ALTER TABLE `pregunta_examen`
  ADD PRIMARY KEY (`id_examen`,`id_pregunta`),
  ADD KEY `id_pregunta` (`id_pregunta`);

--
-- Indices de la tabla `respuesta`
--
ALTER TABLE `respuesta`
  ADD PRIMARY KEY (`id_respuesta`),
  ADD KEY `id_pregunta` (`id_pregunta`);

--
-- Indices de la tabla `respuesta_encuesta`
--
ALTER TABLE `respuesta_encuesta`
  ADD KEY `fk_respuesta_pregunta` (`id_pregunta`),
  ADD KEY `fk_respuesta_opcion` (`id_opcion`);

--
-- Indices de la tabla `status`
--
ALTER TABLE `status`
  ADD PRIMARY KEY (`ID_STATUS`);

--
-- Indices de la tabla `tipo_usuario`
--
ALTER TABLE `tipo_usuario`
  ADD PRIMARY KEY (`id_tp_usuario`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_tp_usuario_usuario` (`id_tp_usuario`),
  ADD KEY `FK_status_usuario` (`id_status`);

--
-- Indices de la tabla `usuario_carrera`
--
ALTER TABLE `usuario_carrera`
  ADD PRIMARY KEY (`id_usuario`,`id_carrera`),
  ADD KEY `id_carrera` (`id_carrera`);

--
-- Indices de la tabla `usuario_examen`
--
ALTER TABLE `usuario_examen`
  ADD PRIMARY KEY (`id_usuario`,`id_examen`),
  ADD KEY `id_examen` (`id_examen`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `carrera`
--
ALTER TABLE `carrera`
  MODIFY `id_carrera` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `dificultad`
--
ALTER TABLE `dificultad`
  MODIFY `id_dificultad` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `encuesta`
--
ALTER TABLE `encuesta`
  MODIFY `id_encuesta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `estatus_pregunta`
--
ALTER TABLE `estatus_pregunta`
  MODIFY `id_estatus_p` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `examen`
--
ALTER TABLE `examen`
  MODIFY `id_examen` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `examenes_grupo`
--
ALTER TABLE `examenes_grupo`
  MODIFY `id_examen_grupo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `grupos`
--
ALTER TABLE `grupos`
  MODIFY `id_grupo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `materias`
--
ALTER TABLE `materias`
  MODIFY `id_materia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `opcion_pregunta`
--
ALTER TABLE `opcion_pregunta`
  MODIFY `id_opcion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `pregunta`
--
ALTER TABLE `pregunta`
  MODIFY `id_pregunta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=492;

--
-- AUTO_INCREMENT de la tabla `pregunta_encuesta`
--
ALTER TABLE `pregunta_encuesta`
  MODIFY `id_pregunta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `respuesta`
--
ALTER TABLE `respuesta`
  MODIFY `id_respuesta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2045;

--
-- AUTO_INCREMENT de la tabla `status`
--
ALTER TABLE `status`
  MODIFY `ID_STATUS` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `tipo_usuario`
--
ALTER TABLE `tipo_usuario`
  MODIFY `id_tp_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `examen`
--
ALTER TABLE `examen`
  ADD CONSTRAINT `examen_ibfk_1` FOREIGN KEY (`id_dificultad`) REFERENCES `dificultad` (`id_dificultad`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `grupo_examenes`
--
ALTER TABLE `grupo_examenes`
  ADD CONSTRAINT `grupo_examenes_ibfk_1` FOREIGN KEY (`id_grupo`) REFERENCES `grupos` (`id_grupo`),
  ADD CONSTRAINT `grupo_examenes_ibfk_2` FOREIGN KEY (`id_examen_grupo`) REFERENCES `examenes_grupo` (`id_examen_grupo`);

--
-- Filtros para la tabla `grupo_usuarios`
--
ALTER TABLE `grupo_usuarios`
  ADD CONSTRAINT `grupo_usuarios_ibfk_1` FOREIGN KEY (`id_grupo`) REFERENCES `grupos` (`id_grupo`),
  ADD CONSTRAINT `grupo_usuarios_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`);

--
-- Filtros para la tabla `historial`
--
ALTER TABLE `historial`
  ADD CONSTRAINT `historial_ibfk_1` FOREIGN KEY (`id_examen`) REFERENCES `examen` (`id_examen`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `historial_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `historial_ibfk_3` FOREIGN KEY (`id_pregunta`) REFERENCES `pregunta` (`id_pregunta`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `historial_ibfk_4` FOREIGN KEY (`id_respuesta`) REFERENCES `respuesta` (`id_respuesta`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `opcion_pregunta`
--
ALTER TABLE `opcion_pregunta`
  ADD CONSTRAINT `fk_opcion_pregunta_pregunta` FOREIGN KEY (`id_pregunta`) REFERENCES `pregunta_encuesta` (`id_pregunta`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pregunta`
--
ALTER TABLE `pregunta`
  ADD CONSTRAINT `pregunta_ibfk_1` FOREIGN KEY (`id_materia`) REFERENCES `materias` (`id_materia`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `pregunta_encuesta`
--
ALTER TABLE `pregunta_encuesta`
  ADD CONSTRAINT `fk_estatus_p` FOREIGN KEY (`id_estatus_p`) REFERENCES `estatus_pregunta` (`id_estatus_p`),
  ADD CONSTRAINT `fk_pregunta_encuesta_encuesta` FOREIGN KEY (`id_encuesta`) REFERENCES `encuesta` (`id_encuesta`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pregunta_examen`
--
ALTER TABLE `pregunta_examen`
  ADD CONSTRAINT `pregunta_examen_ibfk_1` FOREIGN KEY (`id_examen`) REFERENCES `examen` (`id_examen`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `pregunta_examen_ibfk_2` FOREIGN KEY (`id_pregunta`) REFERENCES `pregunta` (`id_pregunta`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `respuesta`
--
ALTER TABLE `respuesta`
  ADD CONSTRAINT `respuesta_ibfk_1` FOREIGN KEY (`id_pregunta`) REFERENCES `pregunta` (`id_pregunta`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `respuesta_encuesta`
--
ALTER TABLE `respuesta_encuesta`
  ADD CONSTRAINT `fk_respuesta_opcion` FOREIGN KEY (`id_opcion`) REFERENCES `opcion_pregunta` (`id_opcion`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_respuesta_pregunta` FOREIGN KEY (`id_pregunta`) REFERENCES `pregunta_encuesta` (`id_pregunta`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `FK_status_usuario` FOREIGN KEY (`id_status`) REFERENCES `status` (`ID_STATUS`),
  ADD CONSTRAINT `fk_tp_usuario_usuario` FOREIGN KEY (`id_tp_usuario`) REFERENCES `tipo_usuario` (`id_tp_usuario`);

--
-- Filtros para la tabla `usuario_carrera`
--
ALTER TABLE `usuario_carrera`
  ADD CONSTRAINT `usuario_carrera_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `usuario_carrera_ibfk_2` FOREIGN KEY (`id_carrera`) REFERENCES `carrera` (`id_carrera`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuario_examen`
--
ALTER TABLE `usuario_examen`
  ADD CONSTRAINT `usuario_examen_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `usuario_examen_ibfk_2` FOREIGN KEY (`id_examen`) REFERENCES `examen` (`id_examen`) ON DELETE NO ACTION ON UPDATE NO ACTION;
--
-- Base de datos: `sis_doc`
--
CREATE DATABASE IF NOT EXISTS `sis_doc` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `sis_doc`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `academia`
--

CREATE TABLE `academia` (
  `id_academia` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `nombre_corto` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `centro_trabajo`
--

CREATE TABLE `centro_trabajo` (
  `id_cct` int(11) NOT NULL,
  `CCT` varchar(10) NOT NULL,
  `Nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `centro_trabajo`
--

INSERT INTO `centro_trabajo` (`id_cct`, `CCT`, `Nombre`) VALUES
(1, '01DCT0004C', 'CETIS 155');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `docente`
--

CREATE TABLE `docente` (
  `id_docente` int(11) NOT NULL,
  `RFC` varchar(13) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Apellido_pat` varchar(100) NOT NULL,
  `Apellido_mat` varchar(100) DEFAULT NULL,
  `Perfil` text DEFAULT NULL,
  `correo_e` varchar(100) DEFAULT NULL,
  `Telefono` varchar(100) DEFAULT NULL,
  `id_turno` int(11) NOT NULL,
  `id_cct` int(11) NOT NULL,
  `id_status` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `docente`
--

INSERT INTO `docente` (`id_docente`, `RFC`, `Nombre`, `Apellido_pat`, `Apellido_mat`, `Perfil`, `correo_e`, `Telefono`, `id_turno`, `id_cct`, `id_status`) VALUES
(1, 'AAMP600211E43', 'PEDRO', 'ALCALA', 'MARTINEZ', 'M', 'alcalapedro@hotmail.com', '4491514748', 1, 1, 1),
(2, 'AEDL710625ST0', 'LUZ AURORA', 'ALENCASTRO', 'DURON', 'I', 'e_dusa@hotmail.com', '4491099168', 3, 1, 1),
(3, 'BAMC7409035Q3', 'CARMEN ROSALBA', 'BARBA', 'MACIAS', 'I', 'rosalba.barba@hotmail.com', '4491141784', 3, 1, 1),
(4, 'COMA5812092Z5', 'ARTURO', 'CORONA', 'MONTES', 'M', 'anlope85@hotmail.com', '4492321141', 1, 1, 1),
(5, 'DIVG880109DG9', 'GERARDO JESUS', 'DIAZ', 'VELA', 'V', 'gerardo.diaz.vela@gmail.com', '4492094476', 2, 1, 1),
(6, 'DILM771216LS9', 'MARCELA ESTHELA', 'DIAZ', 'LIMON', 'M', 'markiela3012@hotmail.com', '', 1, 1, 1),
(7, 'DOLP721020I52', 'PEDRO', 'DOMINGUEZ', 'LOPEZ', 'M', 'yopedro72@live.com.mx', '', 1, 1, 1),
(8, 'DUME680417TW0', 'ELBA ELIZABETH', 'DURON', 'MACIAS', 'I', 'eliz_duron@yahoo.com.mx', '', 3, 1, 1),
(9, 'LOOF691212ECA', 'FABIOLA GUADALUPE', 'LOPEZ', 'OCHOA', 'M', 'fabilupis@yahoo.com.mx', '4491094794', 1, 1, 1),
(10, 'BACM8210133S9', 'MARTHA ELIZABETH', 'BRAMBILA', 'CASTILLO', 'M', 'vicky23222008@hotmail.com', '', 1, 1, 1),
(11, 'MEGG690303RM4', 'MA. GUADALUPE', 'MENDOZA', 'GONZALEZ', 'V', 'mendozgl@gmail.com', '', 2, 1, 1),
(12, 'MOAL6303017G8', 'MA. LETICIA', 'MORALES', 'ACOSTA', 'I', 'mariel_shell@hotmail.com', '4491787136', 3, 1, 1),
(13, 'MOEU640726VB1', 'URIEL', 'MORALES', 'ELIAS', 'M', 'urimoraeli@hotmail.com', '4491378997', 1, 1, 1),
(15, 'JAPA8009252M9', 'AMIRA', 'J UREGUI', 'P REZ', 'V', 'eriosparra@yahoo.com.mx', '', 2, 1, 1),
(16, 'ROSP820128EC7', 'PAMELA VIRIDIANA', 'ROBLEDO', 'SAMANO', 'M', 'pamikitty@hotmail.com', '', 1, 1, 1),
(17, 'CAMJ840102S86', 'JANETTE DEL ROSARIO', 'CAMPOS', 'M RQUEZ', 'M', 'cecilia_1309@hotmail.com', '4492310718', 1, 1, 1),
(18, 'TITA670625G21', 'ANABEL', 'TRINIDAD', 'TRINIDAD', 'M', 'aniytt@yahoo.com.mx', '4493000488', 1, 1, 1),
(19, 'CAOM630224RI5', 'MARICELA', 'CAMACHO', 'OVALLE', 'I', 'urzana660@yahoo.com.mx', '', 3, 1, 1),
(20, 'LUGJ921118NZA', 'JUAN MANUEL', 'LUEVANO', 'GOMEZ', 'I', 'vhas58@hotmail.com', '', 3, 1, 1),
(21, 'CACJ670802F64', 'J. ANGEL', 'CARRANZA', 'CARLIN', 'M', 'carranzacarlinl.angel@yahoo.com', '', 1, 1, 1),
(23, 'COAJ810226E94', 'JOSEFINA', 'CONTRERAS', 'ARRIAGA', 'M', 'yulery@hotmail.com', '4491827174', 1, 1, 1),
(24, 'CORM6410047G9', 'MARTIN', 'CONTRERAS', 'ROMO', 'V', 'conromo64@hotmail.com', '4491062147', 2, 1, 1),
(25, 'TOSJ641125R23', 'JAIME', 'DE LA TORRE', 'SIFUENTES', 'I', 'jaimerutilio@msn.com', '4491981786', 3, 1, 1),
(26, '', ' ALBERTO', 'QUEZADA', ' VAZQUEZ', 'I', 'maester56@hotmail.com', '4491027162', 3, 1, 1),
(27, 'HEMA631216DV8', 'MARIA ALICIA', 'HERNANDEZ', 'MORAN', 'V', 'aliferic@yahoo.com.mx', '', 2, 1, 1),
(28, 'MOOA840616DAA', 'ANA LAURA', 'MONTES', 'ORTEGA', 'M', 'anylu38@hotmail.com', '', 1, 1, 1),
(29, '', 'ARY ISRAEL', 'HERNANDEZ', 'LAZCANO', 'I', 'marcolino.nava@gmail.com', '4491556989', 3, 1, 1),
(30, '', 'SERGIO LUIS', 'PALACIO', 'IBARROLA', 'V', '', '', 2, 1, 1),
(32, 'ROTB620901N91', 'BERNARDO', 'RODRIGUEZ', 'TAPIA', 'V', 'joseph-pozos@hotmail.com', '4491735905', 2, 1, 1),
(33, 'ROGH7601068V4', 'HILDA LUCIA', 'RODRIGUEZ', 'GOMEZ', 'V', 'hildardz76@hotmail.com', '', 2, 1, 1),
(34, 'ROES620528EKA', 'SERGIO ENRIQUE', 'ROMERO', 'ESCOBOSA', 'I', 'serenrique62@gmail.com', '4491107054', 3, 1, 1),
(35, 'QUGK801111UA3', 'KARLA ALEJANDRA', 'QUEZADA', 'GALVAN', 'V', '', '', 2, 1, 1),
(36, 'VARL7107197Z8', 'LAURA', 'VARGAS', 'RIVERA', 'V', '', '4492128801', 2, 1, 1),
(37, 'LODG7107077T2', 'GUILLERMO', 'LOPEZ', 'DIEGO', 'M', 'guillermo_l_d@hotmail.com', '', 1, 1, 1),
(38, '', 'JANELY ANAYENZI', 'GARCIA', 'QUIROZ', 'I', '', '', 3, 1, 1),
(39, 'AASP9308261U8', 'PRISCILA GABRIELA', 'ANDRADE', 'SANCHEZ', 'V', '', '', 2, 1, 1),
(40, '', 'ERNESTO ROMEO', 'GARIBAY', 'MARTINEZ', 'V', '', '', 2, 1, 1),
(41, '', 'VICTOR HUGO', 'MARIN', 'RAMIREZ', 'I', '', '', 3, 1, 1),
(42, '', 'FABIOLA GUADALUPE', 'ARELLANO', 'RANGEL', 'V', '', '', 2, 1, 1),
(43, '', 'MARIA GUADALUPE', 'MANCILLA', 'ROMO', 'V', '', '', 2, 1, 1),
(44, '', 'CARLOS ALBERTO', 'ACEVEDO', 'SANCHEZ', 'M', '', '', 1, 1, 1),
(45, '', 'VERONICA DEL ROCIO', 'FLORES', 'REYES', 'M', '', '', 1, 1, 1),
(46, '', 'LETICIA ANGELICA', 'LEDESMA', 'ESPINOZA', 'M', '', '', 1, 1, 1),
(47, '', 'ERIKA LILIANA', 'PADILLA', 'CONTRERAS', 'V', '', '', 2, 1, 1),
(48, '', 'MANUEL', 'TRINIDAD', 'RODRIGUEZ', 'V', '', '', 2, 1, 1),
(49, '', 'MAYRA', 'GUERRERO', 'ARROYO', '', '', '', 1, 1, 1),
(53, '', 'TERESA', 'MORALES', 'ESPARZA', 'M', '', '', 1, 1, 1),
(54, '', 'JOSE FERNANDO', 'MONTANTES', 'CASTA EDA', 'V', '', '', 2, 1, 1),
(55, 'MOSR8707093VA', 'ROSA ARCELIA', 'MONTOYA', 'SANTOYO', 'V', '', '', 2, 1, 1),
(56, '', 'OSCAR EDUARDO', 'ORNELAS', 'URZ A', 'M', '', '', 1, 1, 1),
(59, '', 'DAVID', 'ACOSTA', 'MARQUEZ', 'V', '', '', 2, 1, 1),
(64, '', 'LUIS MANUEL', 'RAMOS', 'SANDOVAL', '', '', '', 1, 1, 1),
(70, '', 'JANELY ANAYENZI', 'GARCIA', 'QUIROZ', '', '', '', 1, 1, 1),
(71, '', 'URIEL', 'MORALES', 'ELIAS', 'V', '', '', 2, 1, 1),
(72, '', 'KARLA CECILIA', 'ACEVEDO', 'MORENO', 'V', '', '', 2, 1, 1),
(75, '', 'FERNANDO MISAEL', 'PEREZ', 'HERNANDEZ', 'V', '', '', 2, 1, 1),
(89, '', 'FATIMA ENEDINA', 'SABAD', 'ROSALES', 'I', '', '', 3, 1, 1),
(90, '', ' OMAR GUADALUPE', 'CLAUDIO', 'GOMEZ', 'I', '', '', 3, 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `materia`
--

CREATE TABLE `materia` (
  `id_materia` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `nombre_corto` varchar(20) NOT NULL,
  `semestre` int(11) NOT NULL,
  `especialidad` varchar(20) NOT NULL,
  `horas` int(11) NOT NULL,
  `tipo_semestre` varchar(1) DEFAULT NULL,
  `id_academia` int(11) DEFAULT NULL,
  `id_status` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `materia`
--

INSERT INTO `materia` (`id_materia`, `nombre`, `nombre_corto`, `semestre`, `especialidad`, `horas`, `tipo_semestre`, `id_academia`, `id_status`) VALUES
(1, 'GEOMETRIA Y TRIGONOMETRIA', 'GEO Y TRIGO', 2, 'B', 4, 'P', NULL, 0),
(2, 'INGLES II', 'INGLES II', 2, 'B', 3, 'P', NULL, 0),
(3, 'CONSERVACION DE LA ENERGIA Y SUS INTERACCIONES CON LA MATERIA', 'CONS ENE IM', 2, 'B', 4, 'P', NULL, 0),
(4, 'LECTURA, EXPRESION ORAL Y ESCRITA II', 'LEOYE II', 2, 'B', 4, 'P', NULL, 0),
(5, 'DESARROLLA SOFTWARE UTILIZANDO PROGRAMACION ESTRUCTURADA', 'PROG. ESTRUC.', 2, 'P', 10, 'P', NULL, 0),
(6, 'DISE¥A Y ADMINISTRA BDD SIMPLES', 'D. BASE DATOS', 2, 'P', 7, 'P', NULL, 0),
(7, 'ENSAMBLA E INSTALA CONTROLADORES Y DISPOSITIVOS PERIFERICOS', 'ENS. INST. CONT', 2, 'S', 10, 'P', NULL, 0),
(8, 'INSTALA Y CONFIGURA SOFTWARE', 'INS. CONF. SOFTW', 2, 'S', 7, 'P', NULL, 0),
(9, 'INSTALA Y CONFIGURA SOFTWARE DE ACUERDO A LAS ESPECIFICACIONES Y REQUERIMIENTOS DEL USUARIO', 'INS. SOFT.', 2, 'S', 5, 'P', NULL, 0),
(10, 'DISTINGUE LOS DIFERENTES TIPOS DE EMPRESAS, DOCUMENTOS, ADMINISTRACIONN Y RECURSOS', 'DIS.TIP.EMP.', 2, 'H', 10, 'P', NULL, 0),
(11, 'ELABORA ESTRARTEGIAS PARA REALIZAR ACTIVIDADES EN SU AREA', 'ELAB. ESTRATEGIAS', 2, 'H', 7, 'P', NULL, 0),
(12, 'MANTIENE EL SISTEMA ELECTRICO DEL AUTOMOVIL CON BASE EN EL MANUAL DEL FABRICANTE', 'M.S. ELECT.', 2, 'M', 6, 'P', NULL, 0),
(13, 'MANTIENE EL SISTEMA ELECTRONICO DEL AUTOMOVIL', 'M. SIS. EL. AUT', 2, 'M', 11, 'P', NULL, 0),
(14, 'CALCULO DIFERENCIAL', 'CALCULO DIF', 4, 'B', 4, 'P', NULL, 0),
(15, 'INGLES IV', 'INGLES IV', 4, 'B', 3, 'P', NULL, 0),
(16, 'FISICA I', 'FISICA', 4, 'B', 4, 'P', NULL, 0),
(17, 'ECOLOGIA', 'ECOLOGIA', 4, 'B', 4, 'P', NULL, 0),
(18, 'DESARROLLA APLICACIONES M?VILES PARA ANDROID', 'DES. AP. ANDROID', 6, 'P', 6, 'P', NULL, 0),
(19, 'DESARROLLA APLICACIONES MOVILES PARA IOS', 'DES. AP. IOS', 6, 'P', 6, 'P', NULL, 0),
(20, 'BRINDA SOPORTE TECNICO DE MANERA PRESENCIAL', 'SOP.TEC.PRE.', 4, 'S', 6, 'P', NULL, 0),
(21, 'BRINDA SOPORTE TECNICO A DISTANCIA', 'SOP.TEC.DIS.', 4, 'S', 11, 'P', NULL, 0),
(22, 'ASISTE EN LAS ACTIVIDADES DE CAPACITACION PARA EL DESARROLLO DEL CAPITAL HUMANO', 'ASIS.CAP. C.H', 4, 'H', 7, 'P', NULL, 0),
(23, 'EVALUA EL DESEMPE¥O DE LA ORGANIZACION UTILIZANDO HERRAMIENTAS DE CALIDAD', 'EV.DES.ORG.H.C', 4, 'H', 10, 'P', NULL, 0),
(24, 'CORRIGE FALLAS DE LOS SISTEMAS DE INYECCION ELECTRONICA DE LOS MOTORES DE GASOLINA Y DIESEL', 'CORR.INY.ELECT.', 4, 'M', 7, 'P', NULL, 0),
(25, 'MANTIENE LAS EMISIONES CONTAMINANTES DENTRO DE LAS ESPECIFICACIONES DEL FABRICANTE', 'MAN.EM.CON.E.F', 4, 'M', 4, 'P', NULL, 0),
(26, 'DIAGNOSTICA EL FUNCIONAMIENTO DE LOS SISTEMAS DE ENCENDIDO ELECTRONICO Y COMPUTARIZADO DEL MOTOR', 'DIAG.F.S.E.CONT.', 4, 'M', 6, 'P', NULL, 0),
(27, 'GESTIONA LOS PROCESOS DE CAPACITACI?N PARA EL DESARROLLO DEL TALENTO HUMANO', 'GES P CAP DTH', 4, 'H', 10, 'P', NULL, 0),
(28, 'PROMUEVE CONDICIONES DE TRABAJO SALUDABLES EN LA ORGANIZACI?N', 'PCT SALUD ORG', 4, 'H', 7, 'P', NULL, 0),
(29, 'PROBABILIDAD Y ESTADISTICA', 'PROB. Y EST.', 6, 'B', 5, 'P', NULL, 0),
(30, 'TEMAS DE FILOSOFIA', 'T. DE FILOSOFIA', 6, 'B', 5, 'P', NULL, 0),
(31, 'ADMINISTRA Y CONFIGURA PLATAFORMAS DE E-LEARNING', 'A Y C P.ELEARNING', 6, 'P', 6, 'P', NULL, 0),
(32, 'TEMAS SELECTOS DE MATEM?TICAS I', 'T.SEL MATE I', 4, 'B', 4, 'P', NULL, 0),
(33, 'INSTALA UNA RED LAN', 'INST. RED LAN', 6, 'S', 6, 'P', NULL, 0),
(34, 'OPERA UNA RED LAN', 'OPERA RED LAN', 6, 'S', 6, 'P', NULL, 0),
(35, 'DETERMINA LA NOMINA DEL PERSONAL DE LA ORGANIZACION TOMANDO EN CUENTA LA NORMATIVIDAD LABORAL', 'DET.NOM.NORM.', 6, 'H', 8, 'P', NULL, 0),
(36, 'DETERMINA REMUNERACIONES DEL PERSONAL EN SITUACIONES EXTRAORDINARIAS', 'DET.REM.P.S.EXT.', 6, 'H', 4, 'P', NULL, 0),
(37, 'MANTIENE LOS SISTEMAS DE SUSPENSION Y DIRECCION DEL AUTOMOVIL', 'MAN.SIS.SUSP Y DIR', 6, 'M', 5, 'P', NULL, 0),
(38, 'MANTIENE LOS SISTEMAS DE FRENOS EN CONDICIONES DE OPERACION', 'MAN. SIST. FRENOS', 6, 'M', 7, 'P', NULL, 0),
(39, 'IMPLEMENTA BASE DE DATOS NO RELACIONALES EN UN SISTEMA DE INFORMACI?N', 'IMPLE BD NO REL SI', 4, 'P', 8, 'P', NULL, 0),
(40, 'REACCIONES QU?MICAS: CONSERVACI?N DE LA MATERIA EN LA FORMACI?N DE NUEVAS SUSTANCIAS', 'REACC QUIMICAS', 4, 'B', 4, 'P', NULL, 0),
(41, 'TEMAS DE ADMINISTRACION', 'ADMINISTRACION', 6, 'O', 5, 'P', NULL, 0),
(42, 'INTRODUCCION A LA ECONOMIA', 'ECONOMIA', 6, 'O', 5, 'P', NULL, 0),
(43, 'TEMAS DE FISICA', 'TEM. FISICA', 6, 'O', 5, 'P', NULL, 0),
(44, 'IMPLEMENTA BASE DE DATOS RELACIONALES EN UN SISTEMA DE INFORMACI?N', 'IMPLE BD REL SI', 4, 'P', 9, 'P', NULL, 0),
(45, 'MATEMATICAS APLICADAS', 'MAT. APL.', 6, 'O', 5, 'P', NULL, 0),
(46, 'BIOLOGIA CONTEMPORANEA', 'BIOLOGIA C.', 6, 'O', 5, 'P', NULL, 0),
(47, 'CIENCIAS SOCIALES II', 'CIEN SOC  II', 2, 'B', 2, 'P', NULL, 0),
(48, 'CIENCIAS SOCIALES III', 'CIEN SOC  III', 4, 'B', 2, 'P', NULL, 0),
(49, 'CONCIENCIA HIST?RICA I. PERSPECTIVAS DEL MXICO ANTIGUO EN LOS CONTEXTOS GLOBALES', 'CONC HIST I', 4, 'B', 3, 'P', NULL, 0),
(50, 'CULTURA DIGITAL II', 'CULT DIGITAL II', 2, 'B', 2, 'P', NULL, 0),
(51, 'DISE¥A SOFTWARE DE SISTEMAS INFORM?TICOS', 'DISE¥A SOFT SI', 2, 'P', 5, 'P', NULL, 0),
(52, 'CODIFICA SOFTWARE DE SISTEMAS INFORM?TICOS', 'CODIFICA SOFT SI', 2, 'P', 7, 'P', NULL, 0),
(53, 'IMPLEMENTA SOFTWARE DE SISTEMAS INFORM?TICOS', 'IMPLEMENTA SOFT SI', 2, 'P', 5, 'P', NULL, 0),
(54, 'PENSAMIENTO MATEM?TICO II', 'PENS. MATE. II', 2, 'B', 4, 'P', NULL, 0),
(55, 'MANTIENE EL SISTEMA DE INYECCI?N ELECTR?NICA DE LOS MOTORES DE GASOLINA Y DISEL', 'MSIEMGD', 4, 'M', 7, 'P', NULL, 0),
(56, 'MANTIENE EL SISTEMA DE EMISIONES CONTAMINANTES DEL AUTOM?VIL', 'MSECA', 4, 'M', 4, 'P', NULL, 0),
(57, 'MANTIENE EL SISTEMA DE ENCENDIDO ELECTR?NICO Y COMPUTARIZADO DEL AUTOM?VIL', 'MSEECA', 4, 'M', 6, 'P', NULL, 0),
(58, 'EJECUTA PROCEDIMIENTOS ADMINISTRATIVOS DEL ?REA DE RECURSOS HUMANOS', 'EJECUTA PAARH', 2, 'H', 10, 'P', NULL, 0),
(59, 'GESTIONA DOCUMENTACI?N DEL ?REA DE RECURSOS HUMANOS', 'GEST DOC ARH', 2, 'H', 7, 'P', NULL, 0),
(60, 'LENGUA Y COMUNICACI?N', 'LENG Y COMUN II', 2, 'B', 3, 'P', NULL, 0),
(61, 'TUTOR?A', 'TUTOR?A', 0, 'T', 1, 'P', NULL, 0),
(62, 'ESCOLTA', 'ESCOLTA', 0, '', 1, 'P', NULL, 0),
(63, 'ACT. INTEGRAL BANDA DE GUERRA', 'BANDA DE GUERRA', 0, '', 1, 'P', NULL, 0),
(64, 'ACT. INTEGRAL GUITARRA', 'GUITARRA', 0, '', 1, 'P', NULL, 0),
(65, 'ACT. INTEGRAL DIBUJO, PINTURA O COMICS (EAC)', 'EAC', 0, '', 1, 'P', NULL, 0),
(66, 'ACT. INTEGRAL MEDIOAMBIENTAL', 'MEDIOAMBIENTAL', 0, '', 1, 'P', NULL, 0),
(67, 'DEPORTES', 'DEPORTES', 0, 'T', 1, 'P', NULL, 0),
(68, 'ACT. PORRA T.M.', 'PORRA', 0, 'H', 1, 'P', NULL, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `status`
--

CREATE TABLE `status` (
  `id_status` int(20) NOT NULL,
  `descripcion` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `status`
--

INSERT INTO `status` (`id_status`, `descripcion`) VALUES
(1, 'Activo'),
(2, 'Inactivo'),
(3, 'Suspendido'),
(4, 'Pendiente'),
(5, 'Baja');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipo_usuario`
--

CREATE TABLE `tipo_usuario` (
  `id_tipo_usuario` int(20) NOT NULL,
  `descripcion` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `tipo_usuario`
--

INSERT INTO `tipo_usuario` (`id_tipo_usuario`, `descripcion`) VALUES
(1, 'Super Administrador'),
(2, 'Administrador'),
(3, 'Captura'),
(4, 'Docente');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `turno`
--

CREATE TABLE `turno` (
  `id_turno` int(11) NOT NULL,
  `Descripcion` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `turno`
--

INSERT INTO `turno` (`id_turno`, `Descripcion`) VALUES
(1, 'Matutino'),
(2, 'Vespertino'),
(3, 'Mixto');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(20) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `correo_electronico` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `tipo_usuario` int(20) NOT NULL,
  `status` int(20) NOT NULL,
  `telefono` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nombre`, `correo_electronico`, `password`, `tipo_usuario`, `status`, `telefono`) VALUES
(1, 'Super Administrador', 'superAdm@gmail.com', '$2b$12$aXt.urKj5OgRLGnATTloj.siVIgmasf7uCVdWndWHyK/raktqif3a', 1, 4, '449 429 6282'),
(2, 'Martin', 'martin@gmail.com', '$2b$12$1SGgp4REQ8oF178B55IgfeEzFvx4gD2L1wAH6lQTW5dANqBN8X8SK', 2, 4, '449 223 9955'),
(3, 'Bernado', 'bernardo@gmail.com', '$2b$12$cZp3DQIUwFj8rKttO3lxC.CdFzpCvQeSE7TsMgup6iYb2osX/GMZ.', 3, 4, '449 107 7654'),
(4, 'luis', 'luis@gmail.com', '$2b$12$x12.RpNjleTnslNzHs7S3eKPGbzjuVxnyj72rWrrXR12T5zTEzCIK', 4, 4, '449 568 6105'),
(5, 'Regina', 'ReginaOdette@gmail.com', '$2b$12$AYcZPArJZHlyAXpvOltE8.0kdEEz4jZwYSK9d/us4EnWHDZWyxMtu', 4, 4, '351 304 6049'),
(6, 'Mar', 'marlne@gmail.com', '$2b$12$7Fff2WKw7GEtESTEPVkvh.kmIgyCynpqYFoz7ciVWhhW0tUXuWcFC', 4, 4, '449 539 6287'),
(7, 'Ian', 'ianYeshua@gmail.com', '$2b$12$mNtF3BfNJpMah78Dyw93i.CQYrF/tD6h7jscGgBuxtb/R4mImlqpy', 4, 4, '444 444 4444'),
(8, 'daniel', 'Danielviramontes762@gmail.com', '$2b$12$RtM4klA8heTWDu1iyLM85udRCiGjGi1mPRSdhU5MNll9np/.9Hzrq', 3, 1, '444 444 4443');

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_docente`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_docente` (
`id_docente` int(11)
,`RFC` varchar(13)
,`Nombre` varchar(100)
,`Apellido_pat` varchar(100)
,`Apellido_mat` varchar(100)
,`Perfil` text
,`correo_e` varchar(100)
,`Telefono` varchar(100)
,`id_turno` int(11)
,`id_cct` int(11)
,`turno` varchar(100)
,`centro_trabajo` varchar(100)
,`id_status` int(11)
,`status` varchar(100)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_docente`
--
DROP TABLE IF EXISTS `vista_docente`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_docente`  AS SELECT `do`.`id_docente` AS `id_docente`, `do`.`RFC` AS `RFC`, `do`.`Nombre` AS `Nombre`, `do`.`Apellido_pat` AS `Apellido_pat`, `do`.`Apellido_mat` AS `Apellido_mat`, `do`.`Perfil` AS `Perfil`, `do`.`correo_e` AS `correo_e`, `do`.`Telefono` AS `Telefono`, `do`.`id_turno` AS `id_turno`, `do`.`id_cct` AS `id_cct`, `tu`.`Descripcion` AS `turno`, `ct`.`Nombre` AS `centro_trabajo`, `do`.`id_status` AS `id_status`, `st`.`descripcion` AS `status` FROM (((`docente` `do` left join `turno` `tu` on(`do`.`id_turno` = `tu`.`id_turno`)) left join `centro_trabajo` `ct` on(`do`.`id_cct` = `ct`.`id_cct`)) left join `status` `st` on(`do`.`id_status` = `st`.`id_status`)) ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `academia`
--
ALTER TABLE `academia`
  ADD PRIMARY KEY (`id_academia`);

--
-- Indices de la tabla `centro_trabajo`
--
ALTER TABLE `centro_trabajo`
  ADD PRIMARY KEY (`id_cct`);

--
-- Indices de la tabla `docente`
--
ALTER TABLE `docente`
  ADD PRIMARY KEY (`id_docente`),
  ADD KEY `fk_docente_turnp` (`id_turno`),
  ADD KEY `fk_docente_cct` (`id_cct`),
  ADD KEY `fk_docente_status` (`id_status`);

--
-- Indices de la tabla `materia`
--
ALTER TABLE `materia`
  ADD PRIMARY KEY (`id_materia`);

--
-- Indices de la tabla `status`
--
ALTER TABLE `status`
  ADD PRIMARY KEY (`id_status`);

--
-- Indices de la tabla `tipo_usuario`
--
ALTER TABLE `tipo_usuario`
  ADD PRIMARY KEY (`id_tipo_usuario`);

--
-- Indices de la tabla `turno`
--
ALTER TABLE `turno`
  ADD PRIMARY KEY (`id_turno`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD KEY `FK_usuarios_tipo` (`tipo_usuario`),
  ADD KEY `FK_usuarios_status` (`status`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `academia`
--
ALTER TABLE `academia`
  MODIFY `id_academia` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `centro_trabajo`
--
ALTER TABLE `centro_trabajo`
  MODIFY `id_cct` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `docente`
--
ALTER TABLE `docente`
  MODIFY `id_docente` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=91;

--
-- AUTO_INCREMENT de la tabla `materia`
--
ALTER TABLE `materia`
  MODIFY `id_materia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT de la tabla `status`
--
ALTER TABLE `status`
  MODIFY `id_status` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `tipo_usuario`
--
ALTER TABLE `tipo_usuario`
  MODIFY `id_tipo_usuario` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `turno`
--
ALTER TABLE `turno`
  MODIFY `id_turno` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `docente`
--
ALTER TABLE `docente`
  ADD CONSTRAINT `fk_docente_cct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  ADD CONSTRAINT `fk_docente_status` FOREIGN KEY (`id_status`) REFERENCES `status` (`id_status`),
  ADD CONSTRAINT `fk_docente_turnp` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`);

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `FK_usuarios_status` FOREIGN KEY (`status`) REFERENCES `status` (`id_status`),
  ADD CONSTRAINT `FK_usuarios_tipo` FOREIGN KEY (`tipo_usuario`) REFERENCES `tipo_usuario` (`id_tipo_usuario`);
--
-- Base de datos: `test`
--
CREATE DATABASE IF NOT EXISTS `test` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `test`;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
