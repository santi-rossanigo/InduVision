
const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());


// ========================================
// RUTA PRINCIPAL
// ========================================

app.get('/', (req, res) => {
    res.send('InduVision funcionando');
});


// ========================================
// COMPROBAR CONEXION A POSTGRESQL
// ========================================

app.get('/prueba-db', async (req, res) => {

    try {

        const resultado = await pool.query(
            'SELECT current_database() AS base_actual'
        );

        res.json(resultado.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error al conectar con PostgreSQL'
        });

    }

});


/* ==========================================
   DRILL DOWN - NIVEL 1: PLANTAS
========================================== */

app.get('/api/plantas', async (req, res) => {

    try {

        const resultado = await pool.query(`

            SELECT
                p.id_planta,
                p.nombre,
                p.ciudad,
                p.provincia,

                COUNT(DISTINCT s.id_sector)::INTEGER
                    AS total_sectores,

                COUNT(m.id_maquina)::INTEGER
                    AS total_maquinas

            FROM planta p

            LEFT JOIN sector s
                ON s.id_planta = p.id_planta

            LEFT JOIN maquina m
                ON m.id_sector = s.id_sector

            GROUP BY
                p.id_planta,
                p.nombre,
                p.ciudad,
                p.provincia

            ORDER BY p.id_planta;

        `);

        res.json(resultado.rows);

    } catch (error) {

        console.error('Error al obtener plantas:', error);

        res.status(500).json({
            error: 'Error al obtener las plantas'
        });

    }

});


/* ==========================================
   DRILL DOWN - NIVEL 2: SECTORES
========================================== */

app.get('/api/plantas/:id/sectores', async (req, res) => {

    try {

        const idPlanta = Number(req.params.id);

        // Validamos el identificador recibido

        if (
            !Number.isSafeInteger(idPlanta) ||
            idPlanta <= 0
        ) {
            return res.status(400).json({
                error: 'Identificador de planta inválido'
            });
        }

        // Primero verificamos que exista la planta

        const plantaResultado = await pool.query(`

            SELECT
                id_planta,
                nombre,
                ciudad,
                provincia

            FROM planta

            WHERE id_planta = $1;

        `, [idPlanta]);

        if (plantaResultado.rows.length === 0) {

            return res.status(404).json({
                error: 'La planta no existe'
            });

        }

        // Obtenemos sus sectores y calculamos
        // la semaforización de cada máquina

        const sectoresResultado = await pool.query(`

            WITH ultimo_mantenimiento AS (

                SELECT DISTINCT ON (id_maquina)

                    id_maquina,
                    proxima_fecha

                FROM mantenimiento

                ORDER BY
                    id_maquina,
                    fecha DESC,
                    id_mantenimiento DESC

            ),

            estado_maquinas AS (

                SELECT

                    m.id_maquina,
                    m.id_sector,

                    CASE

                        -- PRIORIDAD 1: ROJO

                        WHEN
                            m.estado = 'Fuera de servicio'

                            OR um.proxima_fecha < CURRENT_DATE

                            OR EXISTS (

                                SELECT 1

                                FROM falla f

                                WHERE f.id_maquina = m.id_maquina

                                  AND f.criticidad = 'Alta'

                                  AND f.estado = 'Activa'

                            )

                        THEN 'ROJO'

                        -- PRIORIDAD 2: AMARILLO

                        WHEN
                            m.estado = 'Advertencia'

                            OR um.proxima_fecha BETWEEN
                                CURRENT_DATE
                                AND CURRENT_DATE + 30

                        THEN 'AMARILLO'

                        ELSE 'VERDE'

                    END AS semaforo

                FROM maquina m

                LEFT JOIN ultimo_mantenimiento um
                    ON um.id_maquina = m.id_maquina

                INNER JOIN sector s
                    ON s.id_sector = m.id_sector

                WHERE s.id_planta = $1

            )

            SELECT

                s.id_sector,
                s.nombre AS sector,

                COUNT(e.id_maquina)::INTEGER
                    AS total_maquinas,

                COUNT(e.id_maquina) FILTER (
                    WHERE e.semaforo = 'VERDE'
                )::INTEGER AS verdes,

                COUNT(e.id_maquina) FILTER (
                    WHERE e.semaforo = 'AMARILLO'
                )::INTEGER AS amarillas,

                COUNT(e.id_maquina) FILTER (
                    WHERE e.semaforo = 'ROJO'
                )::INTEGER AS rojas

            FROM sector s

            LEFT JOIN estado_maquinas e
                ON e.id_sector = s.id_sector

            WHERE s.id_planta = $1

            GROUP BY
                s.id_sector,
                s.nombre

            ORDER BY s.id_sector;

        `, [idPlanta]);

        res.json({

            planta: plantaResultado.rows[0],

            sectores: sectoresResultado.rows

        });

    } catch (error) {

        console.error('Error al obtener sectores:', error);

        res.status(500).json({
            error: 'Error al obtener los sectores'
        });

    }

});


/* ==========================================
   DRILL DOWN - DETALLE DE UNA MAQUINA
========================================== */

app.get('/api/maquinas/:id/detalle', async (req, res) => {

    try {

        const idMaquina = Number(req.params.id);

        if (!Number.isSafeInteger(idMaquina) || idMaquina <= 0) {
            return res.status(400).json({
                error: 'Identificador de máquina inválido'
            });
        }

        // 1. Datos generales y semaforo

        const maquinaResultado = await pool.query(`

            WITH ultimo_mantenimiento AS (

                SELECT DISTINCT ON (id_maquina)
                    id_maquina,
                    proxima_fecha

                FROM mantenimiento

                ORDER BY
                    id_maquina,
                    fecha DESC,
                    id_mantenimiento DESC

            )

            SELECT
                m.id_maquina,
                m.nombre AS maquina,
                m.modelo,
                m.fecha_instalacion,
                m.horas_uso,
                m.estado AS estado_maquina,

                s.id_sector,
                s.nombre AS sector,

                p.id_planta,
                p.nombre AS planta,

                um.proxima_fecha,

                um.proxima_fecha - CURRENT_DATE
                    AS dias_restantes,

                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM falla f
                        WHERE f.id_maquina = m.id_maquina
                          AND f.criticidad = 'Alta'
                          AND f.estado = 'Activa'
                    )
                    THEN 'SI'
                    ELSE 'NO'
                END AS falla_alta_activa,

                CASE

                    WHEN
                        m.estado = 'Fuera de servicio'

                        OR um.proxima_fecha < CURRENT_DATE

                        OR EXISTS (
                            SELECT 1
                            FROM falla f
                            WHERE f.id_maquina = m.id_maquina
                              AND f.criticidad = 'Alta'
                              AND f.estado = 'Activa'
                        )

                    THEN 'ROJO'

                    WHEN
                        m.estado = 'Advertencia'

                        OR um.proxima_fecha BETWEEN
                            CURRENT_DATE
                            AND CURRENT_DATE + 30

                    THEN 'AMARILLO'

                    ELSE 'VERDE'

                END AS semaforo

            FROM maquina m

            INNER JOIN sector s
                ON s.id_sector = m.id_sector

            INNER JOIN planta p
                ON p.id_planta = s.id_planta

            LEFT JOIN ultimo_mantenimiento um
                ON um.id_maquina = m.id_maquina

            WHERE m.id_maquina = $1

        `, [idMaquina]);

        if (maquinaResultado.rows.length === 0) {
            return res.status(404).json({
                error: 'La máquina no existe'
            });
        }

        // 2. Historial de fallas

        const fallasResultado = await pool.query(`

            SELECT
                id_falla,
                fecha,
                descripcion,
                criticidad,
                estado,
                tiempo_parada_horas

            FROM falla

            WHERE id_maquina = $1

            ORDER BY fecha DESC, id_falla DESC

        `, [idMaquina]);

        // 3. Historial de mantenimientos

        const mantenimientosResultado = await pool.query(`

            SELECT
                id_mantenimiento,
                fecha,
                tipo,
                costo,
                estado,
                proxima_fecha

            FROM mantenimiento

            WHERE id_maquina = $1

            ORDER BY fecha DESC, id_mantenimiento DESC

        `, [idMaquina]);

        // 4. Historial de reparaciones y proveedores

        const reparacionesResultado = await pool.query(`

            SELECT
                r.id_reparacion,
                r.fecha_inicio,
                r.fecha_fin,
                r.nombre_mecanico,
                r.descripcion,
                r.repuestos,
                r.costo,
                r.nro_factura,
                r.estado,

                p.razon_social AS proveedor,

                f.descripcion AS falla_asociada

            FROM reparacion r

            INNER JOIN proveedor p
                ON p.id_proveedor = r.id_proveedor

            LEFT JOIN falla f
                ON f.id_falla = r.id_falla

            WHERE r.id_maquina = $1

            ORDER BY
                r.fecha_inicio DESC,
                r.id_reparacion DESC

        `, [idMaquina]);

        res.json({

            maquina: maquinaResultado.rows[0],

            fallas: fallasResultado.rows,

            mantenimientos: mantenimientosResultado.rows,

            reparaciones: reparacionesResultado.rows

        });

    } catch (error) {

        console.error('Error al obtener detalle de máquina:', error);

        res.status(500).json({
            error: 'Error al obtener el detalle de la máquina'
        });

    }

});

/* ==========================================
   DRILL DOWN - MAQUINAS DE UN SECTOR
========================================== */

app.get('/api/sectores/:id/maquinas', async (req, res) => {

    try {

        const idSector = Number(req.params.id);

        if (!Number.isSafeInteger(idSector) || idSector <= 0) {
            return res.status(400).json({
                error: 'Identificador de sector inválido'
            });
        }

        // Obtener sector y planta a la que pertenece

        const sectorResultado = await pool.query(`

            SELECT
                s.id_sector,
                s.nombre AS sector,
                p.id_planta,
                p.nombre AS planta

            FROM sector s

            INNER JOIN planta p
                ON p.id_planta = s.id_planta

            WHERE s.id_sector = $1

        `, [idSector]);

        if (sectorResultado.rows.length === 0) {
            return res.status(404).json({
                error: 'El sector no existe'
            });
        }

        // Obtener las maquinas con su semaforizacion

        const maquinasResultado = await pool.query(`

            WITH ultimo_mantenimiento AS (

                SELECT DISTINCT ON (id_maquina)
                    id_maquina,
                    proxima_fecha

                FROM mantenimiento

                ORDER BY
                    id_maquina,
                    fecha DESC,
                    id_mantenimiento DESC

            )

            SELECT
                m.id_maquina,
                m.nombre AS maquina,
                m.modelo,
                m.estado AS estado_maquina,
                m.horas_uso,

                um.proxima_fecha,

                um.proxima_fecha - CURRENT_DATE
                    AS dias_restantes,

                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM falla f
                        WHERE f.id_maquina = m.id_maquina
                          AND f.criticidad = 'Alta'
                          AND f.estado = 'Activa'
                    )
                    THEN 'SI'
                    ELSE 'NO'
                END AS falla_alta_activa,

                CASE

                    WHEN
                        m.estado = 'Fuera de servicio'

                        OR um.proxima_fecha < CURRENT_DATE

                        OR EXISTS (
                            SELECT 1
                            FROM falla f
                            WHERE f.id_maquina = m.id_maquina
                              AND f.criticidad = 'Alta'
                              AND f.estado = 'Activa'
                        )

                    THEN 'ROJO'

                    WHEN
                        m.estado = 'Advertencia'

                        OR um.proxima_fecha BETWEEN
                            CURRENT_DATE
                            AND CURRENT_DATE + 30

                    THEN 'AMARILLO'

                    ELSE 'VERDE'

                END AS semaforo

            FROM maquina m

            LEFT JOIN ultimo_mantenimiento um
                ON um.id_maquina = m.id_maquina

            WHERE m.id_sector = $1

            ORDER BY m.id_maquina

        `, [idSector]);

        res.json({
            sector: sectorResultado.rows[0],
            maquinas: maquinasResultado.rows
        });

    } catch (error) {

        console.error('Error al obtener maquinas del sector:', error);

        res.status(500).json({
            error: 'Error al obtener las máquinas del sector'
        });

    }

});


/* ==========================================
   DASHBOARD - FALLAS POR SECTOR
   CONSULTA SQL DIRECTA, SIN VIEWS
========================================== */

app.get('/api/dashboard/fallas-por-sector', async (req, res) => {

    try {

        const textoId = req.query.id_planta;
        let idPlanta = null;

        if (textoId !== undefined) {

            idPlanta = Number(textoId);

            if (!Number.isSafeInteger(idPlanta) || idPlanta <= 0) {
                return res.status(400).json({
                    error: 'El ID de planta debe ser un entero positivo'
                });
            }
        }

        const resultado = await pool.query(`

            SELECT
                s.id_sector,
                s.nombre AS sector,
                p.nombre AS planta,

                COUNT(f.id_falla)::INTEGER AS total_fallas,

                COUNT(f.id_falla) FILTER (
                    WHERE f.estado = 'Activa'
                )::INTEGER AS activas,

                COUNT(f.id_falla) FILTER (
                    WHERE f.estado = 'Resuelta'
                )::INTEGER AS resueltas,

                COUNT(f.id_falla) FILTER (
                    WHERE f.estado = 'Activa'
                      AND f.criticidad = 'Alta'
                )::INTEGER AS altas_activas

            FROM sector s

            INNER JOIN planta p
                ON p.id_planta = s.id_planta

            LEFT JOIN maquina m
                ON m.id_sector = s.id_sector

            LEFT JOIN falla f
                ON f.id_maquina = m.id_maquina

            WHERE (
                $1::INTEGER IS NULL
                OR s.id_planta = $1
            )

            GROUP BY
                s.id_sector,
                s.nombre,
                p.nombre

            ORDER BY
                p.nombre,
                s.nombre,
                s.id_sector

        `, [idPlanta]);

        res.json(resultado.rows);

    } catch (error) {

        console.error('Error en fallas por sector:', error);

        res.status(500).json({
            error: 'No se pudieron obtener las fallas por sector'
        });

    }

});


// ========================================
// OBTENER MAQUINAS Y SEMAFORIZACION
// CONSULTA DIRECTA, SIN VIEWS
// ========================================

app.get('/api/maquinas', async (req, res) => {

    try {

        const resultado = await pool.query(`

            WITH ultimo_mantenimiento AS (

                SELECT DISTINCT ON (id_maquina)
                    id_maquina,
                    fecha,
                    proxima_fecha

                FROM mantenimiento

                ORDER BY
                    id_maquina,
                    fecha DESC,
                    id_mantenimiento DESC

            )

            SELECT
                m.id_maquina,
                m.nombre AS maquina,
                s.nombre AS sector,
                m.modelo,
                m.estado AS estado_maquina,

                um.proxima_fecha,

                um.proxima_fecha - CURRENT_DATE
                    AS dias_restantes,

                -- COMPROBAR FALLAS ALTAS ACTIVAS

                CASE

                    WHEN EXISTS (

                        SELECT 1
                        FROM falla f

                        WHERE f.id_maquina = m.id_maquina

                        AND f.criticidad = 'Alta'

                        AND f.estado = 'Activa'

                    )
                    THEN 'SI'

                    ELSE 'NO'

                END AS falla_alta_activa,

                -- CALCULAR SEMAFORO

                CASE

                    -- PRIORIDAD 1: ROJO

                    WHEN
                        m.estado = 'Fuera de servicio'

                        OR um.proxima_fecha < CURRENT_DATE

                        OR EXISTS (

                            SELECT 1
                            FROM falla f

                            WHERE f.id_maquina = m.id_maquina

                            AND f.criticidad = 'Alta'

                            AND f.estado = 'Activa'

                        )

                    THEN 'ROJO'

                    -- PRIORIDAD 2: AMARILLO

                    WHEN
                        m.estado = 'Advertencia'

                        OR um.proxima_fecha BETWEEN
                            CURRENT_DATE
                            AND CURRENT_DATE + 30

                    THEN 'AMARILLO'

                    -- PRIORIDAD 3: VERDE

                    ELSE 'VERDE'

                END AS semaforo

            FROM maquina m

            INNER JOIN sector s
                ON m.id_sector = s.id_sector

            LEFT JOIN ultimo_mantenimiento um
                ON m.id_maquina = um.id_maquina

            ORDER BY m.id_maquina;

        `);

        res.json(resultado.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error al obtener las maquinas'
        });

    }

});


// ========================================
// LOGIN DE USUARIOS
// ========================================


/* ==========================================
   DASHBOARD - RESUMEN GENERAL
   CONSULTAS DIRECTAS SIN VIEWS
========================================== */

app.get('/api/dashboard/resumen', async (req, res) => {

    try {

        const resultado = await pool.query(`

            WITH ultimo_mantenimiento AS (

                SELECT DISTINCT ON (id_maquina)
                    id_maquina,
                    proxima_fecha
                FROM mantenimiento
                ORDER BY
                    id_maquina,
                    fecha DESC,
                    id_mantenimiento DESC

            ),

            estado_semaforo AS (

                SELECT
                    m.id_maquina,

                    CASE

                        WHEN
                            m.estado = 'Fuera de servicio'
                            OR um.proxima_fecha < CURRENT_DATE
                            OR EXISTS (
                                SELECT 1
                                FROM falla f
                                WHERE f.id_maquina = m.id_maquina
                                  AND f.criticidad = 'Alta'
                                  AND f.estado = 'Activa'
                            )
                        THEN 'ROJO'

                        WHEN
                            m.estado = 'Advertencia'
                            OR um.proxima_fecha BETWEEN
                                CURRENT_DATE
                                AND CURRENT_DATE + 30
                        THEN 'AMARILLO'

                        ELSE 'VERDE'

                    END AS semaforo

                FROM maquina m

                LEFT JOIN ultimo_mantenimiento um
                    ON m.id_maquina = um.id_maquina

            )

            SELECT

                -- MAQUINAS

                (SELECT COUNT(*)
                 FROM estado_semaforo)::INTEGER
                    AS total_maquinas,

                (SELECT COUNT(*)
                 FROM estado_semaforo
                 WHERE semaforo = 'VERDE')::INTEGER
                    AS maquinas_verdes,

                (SELECT COUNT(*)
                 FROM estado_semaforo
                 WHERE semaforo = 'AMARILLO')::INTEGER
                    AS maquinas_amarillas,

                (SELECT COUNT(*)
                 FROM estado_semaforo
                 WHERE semaforo = 'ROJO')::INTEGER
                    AS maquinas_rojas,

                -- FALLAS

                (SELECT COUNT(*)
                 FROM falla
                 WHERE estado = 'Activa')::INTEGER
                    AS fallas_activas,

                (SELECT COUNT(*)
                 FROM falla
                 WHERE estado = 'Activa'
                   AND criticidad = 'Alta')::INTEGER
                    AS fallas_altas_activas,

                -- MANTENIMIENTOS

                (SELECT COUNT(*)
                 FROM ultimo_mantenimiento
                 WHERE proxima_fecha BETWEEN
                     CURRENT_DATE
                     AND CURRENT_DATE + 30)::INTEGER
                    AS mantenimientos_proximos,

                (SELECT COUNT(*)
                 FROM ultimo_mantenimiento
                 WHERE proxima_fecha < CURRENT_DATE)::INTEGER
                    AS mantenimientos_vencidos,

                -- REPARACIONES

                (SELECT COUNT(*)
                 FROM reparacion
                 WHERE estado = 'En curso')::INTEGER
                    AS reparaciones_en_curso,

                (SELECT COUNT(*)
                 FROM reparacion
                 WHERE estado = 'Finalizada')::INTEGER
                    AS reparaciones_finalizadas,

                -- COSTOS HISTORICOS

                (SELECT COALESCE(SUM(costo), 0)
                 FROM mantenimiento)::NUMERIC(14,2)
                    AS costo_mantenimientos,

                (SELECT COALESCE(SUM(costo), 0)
                 FROM reparacion)::NUMERIC(14,2)
                    AS costo_reparaciones

        `);

        res.json(resultado.rows[0]);

    } catch (error) {

        console.error('Error en dashboard:', error);

        res.status(500).json({
            error: 'Error al obtener el resumen del dashboard'
        });

    }

});

app.post('/login', async (req, res) => {

    try {

        const { email, password } = req.body;

        const resultado = await pool.query(
            `SELECT *
             FROM usuario
             WHERE email = $1`,
            [email]
        );

        if (resultado.rows.length === 0) {

            return res.status(401).json({
                mensaje: 'Email o contraseña incorrectos'
            });

        }

        const usuario = resultado.rows[0];

        if (!usuario.activo) {

            return res.status(403).json({
                mensaje: 'Usuario desactivado'
            });

        }

        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordCorrecta) {

            return res.status(401).json({
                mensaje: 'Email o contraseña incorrectos'
            });

        }

        res.json({

            mensaje: 'Login correcto',

            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: 'Error interno del servidor'
        });

    }

});


// ========================================
// INICIAR SERVIDOR
// ========================================

const PORT = 3000;

app.listen(PORT, () => {

    console.log(
        `Servidor InduVision ejecutándose en http://localhost:${PORT}`
    );

});
