import { useState } from 'react';
import './App.css';

// ========================================
// GRAFICOS CON CHART.JS
// ========================================
import {
  Chart as ChartJS,
  ArcElement, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend
);

const COLOR_VERDE = '#16803c';
const COLOR_AMARILLO = '#d4a000';
const COLOR_ROJO = '#dc2626';

const opcionesCircular = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' }
  }
};

const opcionesBarras = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' }
  },
  scales: {
    x: { stacked: true },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: { precision: 0 }
    }
  }
};

function GraficoSemaforo({ verdes, amarillas, rojas }) {
  const valores = [Number(verdes || 0), Number(amarillas || 0), Number(rojas || 0)];
  if (valores.every(v => v === 0)) {
    return <p className="grafico-vacio">No hay máquinas para representar.</p>;
  }

  const datos = {
    labels: ['Verdes', 'Amarillas', 'Rojas'],
    datasets: [{
      label: 'Máquinas',
      data: valores,
      backgroundColor: [COLOR_VERDE, COLOR_AMARILLO, COLOR_ROJO],
      borderWidth: 1
    }]
  };

  return <div className="grafico-area"><Doughnut data={datos} options={opcionesCircular} /></div>;
}

function GraficoFallasPorSector({ sectores = [], mostrarPlanta = false }) {
  if (sectores.length === 0) {
    return <p className="grafico-vacio">No hay sectores para representar.</p>;
  }

  const datos = {
    labels: sectores.map(s => mostrarPlanta ? `${s.sector} (${s.planta})` : s.sector),
    datasets: [
      {
        label: 'Fallas activas',
        data: sectores.map(s => Number(s.activas)),
        backgroundColor: '#d97706'
      },
      {
        label: 'Fallas resueltas',
        data: sectores.map(s => Number(s.resueltas)),
        backgroundColor: '#64748b'
      }
    ]
  };

  return (
    <>
      <div className="grafico-area"><Bar data={datos} options={opcionesBarras} /></div>
      <p className="grafico-nota">Total de fallas históricas, agrupadas por estado.</p>
    </>
  );
}

function GraficoSemaforosPorSector({ sectores = [] }) {
  if (sectores.length === 0) {
    return <p className="grafico-vacio">No hay sectores para representar.</p>;
  }

  const datos = {
    labels: sectores.map(s => s.sector),
    datasets: [
      { label: 'Verdes', data: sectores.map(s => Number(s.verdes)), backgroundColor: COLOR_VERDE },
      { label: 'Amarillas', data: sectores.map(s => Number(s.amarillas)), backgroundColor: COLOR_AMARILLO },
      { label: 'Rojas', data: sectores.map(s => Number(s.rojas)), backgroundColor: COLOR_ROJO }
    ]
  };
  return <div className="grafico-area"><Bar data={datos} options={opcionesBarras} /></div>;
}

function GraficoCriticidad({ fallas = [] }) {
  if (fallas.length === 0) {
    return <p className="grafico-vacio">Esta máquina no tiene fallas registradas.</p>;
  }

  const criticidades = ['Baja', 'Media', 'Alta'];
  const datos = {
    labels: criticidades,
    datasets: [{
      label: 'Cantidad de fallas',
      data: criticidades.map(c => fallas.filter(f => f.criticidad === c).length),
      backgroundColor: [COLOR_VERDE, COLOR_AMARILLO, COLOR_ROJO]
    }]
  };

  const opciones = {
    ...opcionesBarras,
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
  };

  return <div className="grafico-area"><Bar data={datos} options={opciones} /></div>;
}


/* ========================================
   GRAFICO - EVOLUCION MENSUAL DE COSTOS
======================================== */

function GraficoCostosMensuales({ filas = [] }) {

  if (filas.length === 0) {
    return <p>No hay costos mensuales registrados.</p>;
  }

  const etiquetas = filas.map(fila => {
    const [anio, mes] = fila.mes.split('-').map(Number);

    return new Date(anio, mes - 1, 1)
      .toLocaleDateString('es-AR', {
        month: 'short',
        year: 'numeric'
      });
  });

  const datos = {
    labels: etiquetas,

    datasets: [
      {
        label: 'Mantenimientos',
        data: filas.map(f =>
          Number(f.costo_mantenimientos)
        ),
        backgroundColor: '#2563eb'
      },
      {
        label: 'Reparaciones',
        data: filas.map(f =>
          Number(f.costo_reparaciones)
        ),
        backgroundColor: '#0d9488'
      }
    ]
  };

  const opciones = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: contexto =>
            `${contexto.dataset.label}: ${dinero(contexto.parsed.y)}`
        }
      }
    },

    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: valor =>
            '$' + Number(valor).toLocaleString('es-AR')
        }
      }
    }
  };

  return (
    <div className="grafico-area">
      <Bar data={datos} options={opciones} />
    </div>
  );
}


/* ========================================
   GRAFICO - MANTENIMIENTOS POR TIPO
======================================== */

function GraficoMantenimientosPorTipo({ filas = [] }) {

  if (filas.length === 0) {
    return <p>No hay mantenimientos registrados.</p>;
  }

  const datos = {
    labels: filas.map(f => f.tipo),

    datasets: [
      {
        label: 'Cantidad de mantenimientos',

        data: filas.map(f => Number(f.cantidad)),

        backgroundColor: [
          '#2563eb',
          '#0d9488',
          '#f59e0b',
          '#8b5cf6'
        ],

        borderRadius: 6
      }
    ]
  };

  const opciones = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        position: 'bottom'
      },

      tooltip: {
        callbacks: {
          afterLabel: contexto => {
            const fila = filas[contexto.dataIndex];

            return 'Costo total: ' +
              dinero(fila.costo_total);
          }
        }
      }
    },

    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  return (
    <>
      <div className="grafico-area">
        <Bar data={datos} options={opciones} />
      </div>

      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Costo total</th>
              <th>Costo promedio</th>
            </tr>
          </thead>

          <tbody>
            {filas.map(f => (
              <tr key={f.tipo}>
                <td>{f.tipo}</td>
                <td>{f.cantidad}</td>
                <td>{dinero(f.costo_total)}</td>
                <td>{dinero(f.costo_promedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}


/* ========================================
   GRAFICO - REPARACIONES POR PROVEEDOR
======================================== */

function GraficoReparacionesProveedor({ filas = [] }) {

  if (filas.length === 0) {
    return <p>No hay proveedores registrados.</p>;
  }

  const datos = {
    labels: filas.map(f => f.proveedor),

    datasets: [
      {
        label: 'En curso',
        data: filas.map(f => Number(f.en_curso)),
        backgroundColor: '#d4a000'
      },
      {
        label: 'Finalizadas',
        data: filas.map(f => Number(f.finalizadas)),
        backgroundColor: '#16803c'
      },
      {
        label: 'Canceladas',
        data: filas.map(f => Number(f.canceladas)),
        backgroundColor: '#dc2626'
      }
    ]
  };

  const opciones = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x',

    plugins: {
      legend: {
        position: 'bottom'
      }
    },

  scales: {
    x: {
      stacked: true
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        precision: 0
      }
    }
  }
  };

  return (
    <>
      <div className="grafico-area">
        <Bar data={datos} options={opciones} />
      </div>

      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Reparaciones</th>
              <th>Máquinas atendidas</th>
              <th>Costo total</th>
              <th>Costo promedio</th>
            </tr>
          </thead>

          <tbody>
            {filas.map(f => (
              <tr key={f.id_proveedor}>
                <td>{f.proveedor}</td>
                <td>{f.total_reparaciones}</td>
                <td>{f.maquinas_atendidas}</td>
                <td>{dinero(f.costo_total)}</td>
                <td>{dinero(f.costo_promedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const API = 'http://localhost:3000';

function TarjetaKpi({ titulo, valor, tipo = '' }) {
  return (
    <div className={`tarjeta-kpi ${tipo}`}>
      <span className="tarjeta-etiqueta">{titulo}</span>
      <strong className="tarjeta-valor">{valor}</strong>
    </div>
  );
}

function Semaforo({ valor }) {
  return (
    <span className={`semaforo ${String(valor ?? '').toLowerCase()}`}>
      {valor ?? 'Sin datos'}
    </span>
  );
}

function dinero(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(Number(valor ?? 0));
}

function fecha(valor) {
  if (!valor) return '—';
  const texto = String(valor).slice(0, 10);
  const partes = texto.split('-');
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : texto;
}

async function solicitar(ruta) {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
  return respuesta.json();
}

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [usuario, setUsuario] = useState(null);

  // Dashboard general
  const [resumen, setResumen] = useState(null);
  const [costosMensuales, setCostosMensuales] = useState(null);
  const [mantenimientosPorTipo, setMantenimientosPorTipo] = useState(null);
  const [proveedores, setProveedores] = useState(null);
  const [errorProveedores, setErrorProveedores] = useState('');
  const [errorMantenimientos, setErrorMantenimientos] = useState('');
  const [errorCostosMensuales, setErrorCostosMensuales] = useState('');
  const [maquinas, setMaquinas] = useState([]);
  const [plantas, setPlantas] = useState([]);
  const [fallasPorSector, setFallasPorSector] = useState([]);
  const [fallasPlanta, setFallasPlanta] = useState([]);
  const [errorGraficoPlanta, setErrorGraficoPlanta] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');

  // Drill Down / Drill Up
  const [plantaSeleccionada, setPlantaSeleccionada] = useState(null);
  const [sectores, setSectores] = useState([]);
  const [sectorSeleccionado, setSectorSeleccionado] = useState(null);
  const [maquinasSector, setMaquinasSector] = useState([]);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(null);
  const [fallas, setFallas] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorNavegacion, setErrorNavegacion] = useState('');
  
  async function cargarCostosMensuales() {

    try {

      setErrorCostosMensuales('');

      const datos = await solicitar(
        '/api/dashboard/costos-mensuales'
      );

      setCostosMensuales(datos);

    } catch (error) {

      console.error(error);

      setErrorCostosMensuales(
        'No se pudo cargar la evolución mensual de costos.'
      );

    }
  }

  async function cargarMantenimientosPorTipo() {

    try {

      setErrorMantenimientos('');

      const datos = await solicitar(
        '/api/dashboard/mantenimientos-por-tipo'
      );

      setMantenimientosPorTipo(datos);

    } catch (error) {

      console.error(error);

      setErrorMantenimientos(
        'No se pudieron cargar los mantenimientos.'
      );

    }
  }
  
  /* ========================================
    CARGAR ANALISIS DE PROVEEDORES
  ======================================== */

  async function cargarProveedores() {

    try {

      setErrorProveedores('');

      const datos = await solicitar(
        '/api/dashboard/reparaciones-por-proveedor'
      );

      setProveedores(datos);

    } catch (error) {

      console.error(error);

      setErrorProveedores(
        'No se pudo cargar el análisis de proveedores.'
      );

    }
  }


  async function cargarDashboard() {
    cargarMantenimientosPorTipo();
    cargarProveedores();
    cargarCostosMensuales();
    setErrorGeneral('');
    const resultados = await Promise.allSettled([
      solicitar('/api/dashboard/resumen'),
      solicitar('/api/maquinas'),
      solicitar('/api/plantas'),
      solicitar('/api/dashboard/fallas-por-sector')
    ]);

    if (resultados[0].status === 'fulfilled') setResumen(resultados[0].value);
    if (resultados[1].status === 'fulfilled') setMaquinas(resultados[1].value);
    if (resultados[2].status === 'fulfilled') setPlantas(resultados[2].value);
    if (resultados[3].status === 'fulfilled') setFallasPorSector(resultados[3].value);
    if (resultados.some(r => r.status === 'rejected')) {
      setErrorGeneral('No se pudieron cargar todos los datos del dashboard. Revisá el backend.');
    }
  }

  async function iniciarSesion(e) {
    e.preventDefault();
    setMensaje('');
    try {
      const respuesta = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setMensaje(datos.mensaje || 'Email o contraseña incorrectos');
        return;
      }
      setUsuario(datos.usuario);
      setPassword('');
      cargarDashboard();
    } catch (error) {
      console.error(error);
      setMensaje('No se pudo conectar con el servidor');
    }
  }

  async function seleccionarPlanta(idPlanta) {
    setCargando(true);
    setErrorNavegacion('');
    setErrorGraficoPlanta('');
    setFallasPlanta([]);
    try {
      // La navegación tiene prioridad: si falla el gráfico,
      // igualmente mostramos los sectores.
      const datos = await solicitar(`/api/plantas/${idPlanta}/sectores`);
      setPlantaSeleccionada(datos.planta);
      setSectores(datos.sectores);
      setSectorSeleccionado(null);
      setMaquinaSeleccionada(null);

      try {
        const fallasDatos = await solicitar(
          `/api/dashboard/fallas-por-sector?id_planta=${idPlanta}`
        );
        setFallasPlanta(fallasDatos);
      } catch (error) {
        console.error(error);
        setErrorGraficoPlanta('No se pudo cargar el gráfico de fallas de esta planta.');
      }
    } catch (error) {
      console.error(error);
      setErrorNavegacion('No se pudieron obtener los sectores.');
    } finally {
      setCargando(false);
    }
  }

  async function seleccionarSector(idSector) {
    setCargando(true);
    setErrorNavegacion('');
    try {
      const datos = await solicitar(`/api/sectores/${idSector}/maquinas`);
      setSectorSeleccionado(datos.sector);
      setMaquinasSector(datos.maquinas);
      setMaquinaSeleccionada(null);
    } catch (error) {
      console.error(error);
      setErrorNavegacion('No se pudieron obtener las máquinas del sector.');
    } finally {
      setCargando(false);
    }
  }

  async function seleccionarMaquina(idMaquina) {
    setCargando(true);
    setErrorNavegacion('');
    try {
      const datos = await solicitar(`/api/maquinas/${idMaquina}/detalle`);
      setMaquinaSeleccionada(datos.maquina);
      setFallas(datos.fallas);
      setMantenimientos(datos.mantenimientos);
      setReparaciones(datos.reparaciones);
    } catch (error) {
      console.error(error);
      setErrorNavegacion('No se pudo cargar el detalle de la máquina.');
    } finally {
      setCargando(false);
    }
  }

  // Drill Up: volvemos exactamente al nivel anterior.
  function volverASector() {
    setMaquinaSeleccionada(null);
    setErrorNavegacion('');
  }

  function volverAPlanta() {
    setSectorSeleccionado(null);
    setMaquinaSeleccionada(null);
    setErrorNavegacion('');
  }

  function volverAlDashboard() {
    setPlantaSeleccionada(null);
    setSectorSeleccionado(null);
    setMaquinaSeleccionada(null);
    setErrorNavegacion('');
  }

  if (!usuario) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>InduVision</h1>
            <p>Mantenimiento industrial basado en datos</p>
          </div>
          <h2>Inicio de sesión</h2>
          <form onSubmit={iniciarSesion}>
            <div className="campo-login">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="campo-login">
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="boton-login" type="submit">Ingresar</button>
          </form>
          {mensaje && <p className="mensaje-login">{mensaje}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="contenedor">
      <header className="cabecera-dashboard">
        <h1>InduVision</h1>
        <p>Bienvenido {usuario.nombre}</p>
      </header>

      {errorNavegacion && <p className="mensaje-error">{errorNavegacion}</p>}

      {/* NIVEL MAQUINA */}
      {maquinaSeleccionada ? (
        <main>
          <div className="barra-navegacion">
            <button className="boton-volver" onClick={volverASector}>
              ← Volver a máquinas del sector
            </button>
            <span>{maquinaSeleccionada.planta} / {maquinaSeleccionada.sector} / Máquina</span>
          </div>

          <h2>{maquinaSeleccionada.maquina}</h2>
          <p className="subtitulo-dashboard">
            Modelo: {maquinaSeleccionada.modelo || 'Sin datos'}
          </p>

          <section className="dashboard-seccion">
            <h3>Estado actual</h3>
            <div className="dashboard-grid">
              <TarjetaKpi titulo="Estado operativo" valor={maquinaSeleccionada.estado_maquina} />
              <TarjetaKpi titulo="Horas de uso" valor={maquinaSeleccionada.horas_uso ?? 'Sin datos'} />
              <TarjetaKpi titulo="Próximo mantenimiento" valor={fecha(maquinaSeleccionada.proxima_fecha)} />
              <TarjetaKpi titulo="Falla Alta activa" valor={maquinaSeleccionada.falla_alta_activa} />
            </div>
            <p>Semáforo actual: <Semaforo valor={maquinaSeleccionada.semaforo} /></p>
            <p>Fecha de instalación: {fecha(maquinaSeleccionada.fecha_instalacion)}</p>
          </section>

          <section className="dashboard-seccion">
            <h3>Fallas por criticidad de esta máquina</h3>
            <div className="graficos-grid">
              <div className="grafico-card">
                <GraficoCriticidad fallas={fallas} />
              </div>
            </div>
          </section>

          <section className="dashboard-seccion">
            <h3>Historial de fallas ({fallas.length})</h3>
            {fallas.length === 0 ? <p>No hay fallas registradas.</p> : (
              <div className="tabla-contenedor">
                <table>
                  <thead><tr>
                    <th>Fecha</th><th>Descripción</th><th>Criticidad</th>
                    <th>Estado</th><th>Parada (horas)</th>
                  </tr></thead>
                  <tbody>
                    {fallas.map(f => (
                      <tr key={f.id_falla}>
                        <td>{fecha(f.fecha)}</td>
                        <td>{f.descripcion}</td>
                        <td>{f.criticidad}</td>
                        <td>{f.estado}</td>
                        <td>{f.tiempo_parada_horas ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="dashboard-seccion">
            <h3>Historial de mantenimientos ({mantenimientos.length})</h3>
            {mantenimientos.length === 0 ? <p>No hay mantenimientos registrados.</p> : (
              <div className="tabla-contenedor">
                <table>
                  <thead><tr>
                    <th>Fecha</th><th>Tipo</th><th>Estado</th>
                    <th>Próximo</th><th>Costo</th>
                  </tr></thead>
                  <tbody>
                    {mantenimientos.map(m => (
                      <tr key={m.id_mantenimiento}>
                        <td>{fecha(m.fecha)}</td>
                        <td>{m.tipo}</td>
                        <td>{m.estado}</td>
                        <td>{fecha(m.proxima_fecha)}</td>
                        <td>{dinero(m.costo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="dashboard-seccion">
            <h3>Reparaciones y proveedores ({reparaciones.length})</h3>
            {reparaciones.length === 0 ? <p>No hay reparaciones registradas.</p> : (
              <div className="reparaciones-grid">
                {reparaciones.map(r => (
                  <article className="reparacion-card" key={r.id_reparacion}>
                    <div className="reparacion-cabecera">
                      <strong>{r.proveedor}</strong>
                      <span className="estado-reparacion">{r.estado}</span>
                    </div>
                    <p><strong>Descripción:</strong> {r.descripcion}</p>
                    <p><strong>Inicio:</strong> {fecha(r.fecha_inicio)} · <strong>Fin:</strong> {fecha(r.fecha_fin)}</p>
                    <p><strong>Mecánico:</strong> {r.nombre_mecanico || 'Sin datos'}</p>
                    <p><strong>Repuestos:</strong> {r.repuestos || 'Sin datos'}</p>
                    <p><strong>Falla asociada:</strong> {r.falla_asociada || 'No asociada'}</p>
                    <p><strong>Factura:</strong> {r.nro_factura || 'Sin registrar'}</p>
                    <p><strong>Costo registrado:</strong> {dinero(r.costo)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

      ) : sectorSeleccionado ? (
        /* NIVEL SECTOR */
        <main>
          <div className="barra-navegacion">
            <button className="boton-volver" onClick={volverAPlanta}>
              ← Volver a sectores
            </button>
            <span>{sectorSeleccionado.planta} / {sectorSeleccionado.sector}</span>
          </div>
          <h2>Sector: {sectorSeleccionado.sector}</h2>
          <p className="subtitulo-dashboard">Seleccioná una máquina para ver sus registros.</p>

          <section className="dashboard-seccion">
            <h3>Distribución del semáforo en este sector</h3>
            <div className="graficos-grid">
              <div className="grafico-card">
                <GraficoSemaforo
                  verdes={maquinasSector.filter(m => m.semaforo === 'VERDE').length}
                  amarillas={maquinasSector.filter(m => m.semaforo === 'AMARILLO').length}
                  rojas={maquinasSector.filter(m => m.semaforo === 'ROJO').length}
                />
              </div>
            </div>
          </section>

          <div className="maquinas-grid">
            {maquinasSector.map(m => (
              <article className="maquina-card" key={m.id_maquina}>
                <div className="maquina-card-cabecera">
                  <h3>{m.maquina}</h3>
                  <Semaforo valor={m.semaforo} />
                </div>
                <p>Modelo: {m.modelo || 'Sin datos'}</p>
                <p>Estado operativo: {m.estado_maquina}</p>
                <p>Próximo mantenimiento: {fecha(m.proxima_fecha)}</p>
                <p>Falla Alta activa: {m.falla_alta_activa}</p>
                <button className="boton-drill" disabled={cargando}
                  onClick={() => seleccionarMaquina(m.id_maquina)}>
                  Ver detalle de máquina
                </button>
              </article>
            ))}
          </div>
          {maquinasSector.length === 0 && <p>No hay máquinas registradas en este sector.</p>}
        </main>

      ) : plantaSeleccionada ? (
        /* NIVEL PLANTA: LISTADO DE SECTORES */
        <main>
          <div className="barra-navegacion">
            <button className="boton-volver" onClick={volverAlDashboard}>
              ← Volver al dashboard
            </button>
            <span>Planta / Sectores</span>
          </div>
          <h2>{plantaSeleccionada.nombre}</h2>
          <p className="subtitulo-dashboard">
            {plantaSeleccionada.ciudad}, {plantaSeleccionada.provincia}
          </p>
          <h3>Análisis de la planta</h3>
          <div className="graficos-grid">
            <article className="grafico-card">
              <h4>Semáforos por sector</h4>
              <GraficoSemaforosPorSector sectores={sectores} />
            </article>
            <article className="grafico-card">
              <h4>Fallas por sector</h4>
              {errorGraficoPlanta && <p className="mensaje-error">{errorGraficoPlanta}</p>}
              {!errorGraficoPlanta && <GraficoFallasPorSector sectores={fallasPlanta} />}
            </article>
          </div>

          <h3>Distribución de máquinas por sector</h3>
          <div className="sectores-grid">
            {sectores.map(s => (
              <article className="sector-card" key={s.id_sector}>
                <h3>{s.sector}</h3>
                <div className="sector-total">
                  <strong>{s.total_maquinas}</strong>
                  <span>máquinas registradas</span>
                </div>
                <div className="sector-contadores">
                  <div className="contador-verde"><span>Verdes</span><strong>{s.verdes}</strong></div>
                  <div className="contador-amarillo"><span>Amarillas</span><strong>{s.amarillas}</strong></div>
                  <div className="contador-rojo"><span>Rojas</span><strong>{s.rojas}</strong></div>
                </div>
                <button className="boton-drill" disabled={cargando}
                  onClick={() => seleccionarSector(s.id_sector)}>
                  Ver máquinas del sector
                </button>
              </article>
            ))}
          </div>
          {sectores.length === 0 && <p>Esta planta no tiene sectores registrados.</p>}
        </main>

      ) : (
        /* DASHBOARD GENERAL */
        <main>
          <section className="dashboard-seccion">
            <h2>Dashboard general</h2>
            {errorGeneral && <p className="mensaje-error">{errorGeneral}</p>}
            {resumen ? (
              <>
                <h3>Estado general de máquinas</h3>
                <div className="dashboard-grid">
                  <TarjetaKpi titulo="Total de máquinas" valor={resumen.total_maquinas} />
                  <TarjetaKpi titulo="Máquinas verdes" valor={resumen.maquinas_verdes} tipo="kpi-verde" />
                  <TarjetaKpi titulo="Máquinas amarillas" valor={resumen.maquinas_amarillas} tipo="kpi-amarillo" />
                  <TarjetaKpi titulo="Máquinas rojas" valor={resumen.maquinas_rojas} tipo="kpi-rojo" />
                </div>
                <h3>Fallas e intervenciones</h3>
                <div className="dashboard-grid">
                  <TarjetaKpi titulo="Fallas activas" valor={resumen.fallas_activas} />
                  <TarjetaKpi titulo="Fallas Altas activas" valor={resumen.fallas_altas_activas} tipo="kpi-rojo" />
                  <TarjetaKpi titulo="Mantenimientos próximos" valor={resumen.mantenimientos_proximos} tipo="kpi-amarillo" />
                  <TarjetaKpi titulo="Mantenimientos vencidos" valor={resumen.mantenimientos_vencidos} tipo="kpi-rojo" />
                  <TarjetaKpi titulo="Reparaciones en curso" valor={resumen.reparaciones_en_curso} tipo="kpi-amarillo" />
                  <TarjetaKpi titulo="Reparaciones finalizadas" valor={resumen.reparaciones_finalizadas} tipo="kpi-verde" />
                </div>
                <h3>Costos acumulados</h3>
                <div className="dashboard-grid">
                  <TarjetaKpi titulo="Costo de mantenimientos" valor={dinero(resumen.costo_mantenimientos)} />
                  <TarjetaKpi titulo="Costo de reparaciones" valor={dinero(resumen.costo_reparaciones)} />
                </div>
              </>
            ) : <p>Cargando indicadores...</p>}
          </section>

          <section className="dashboard-seccion">
            <h2>Análisis gráficos</h2>
            <p className="subtitulo-dashboard">
              Los gráficos se calculan con los datos actuales de PostgreSQL.
            </p>
            <div className="graficos-grid">
              <article className="grafico-card">
                <h3>Distribución de máquinas por semáforo</h3>
                {resumen ? (
                  <GraficoSemaforo
                    verdes={resumen.maquinas_verdes}
                    amarillas={resumen.maquinas_amarillas}
                    rojas={resumen.maquinas_rojas}
                  />
                ) : <p>Cargando gráfico...</p>}
              </article>
              <article className="grafico-card">
                <h3>Fallas por sector</h3>
                <GraficoFallasPorSector sectores={fallasPorSector} mostrarPlanta />
              </article>
            </div>
          </section>

          
          {/* EVOLUCION MENSUAL DE COSTOS */}

          <section className="dashboard-seccion">

            <h2>Evolución mensual de costos</h2>

            <p className="subtitulo-dashboard">
              Comparación de los costos registrados
              de mantenimiento y reparación por mes.
            </p>

            {errorCostosMensuales ? (

              <p className="mensaje-error">
                {errorCostosMensuales}
              </p>

            ) : costosMensuales === null ? (

              <p>Cargando evolución mensual...</p>

            ) : (

              <div className="graficos-grid">

                <article className="grafico-card">

                  <h3>Costos por mes</h3>

                  <GraficoCostosMensuales
                    filas={costosMensuales}
                  />

                </article>

              </div>

            )}

          </section>
          
          
          {/* MANTENIMIENTOS POR TIPO */}

          <section className="dashboard-seccion">

            <h2>Análisis de mantenimientos</h2>

            <p className="subtitulo-dashboard">
              Cantidad y costos de mantenimiento
              agrupados por tipo de intervención.
            </p>

            {errorMantenimientos ? (

              <p className="mensaje-error">
                {errorMantenimientos}
              </p>

            ) : mantenimientosPorTipo === null ? (

              <p>Cargando mantenimientos...</p>

            ) : (

              <div className="graficos-grid">

                <article className="grafico-card">

                  <h3>Mantenimientos por tipo</h3>

                  <GraficoMantenimientosPorTipo
                    filas={mantenimientosPorTipo}
                  />

                </article>

              </div>

            )}

          </section>
          
          {/* ANALISIS DE REPARACIONES Y PROVEEDORES */}

          <section className="dashboard-seccion">

            <h2>Análisis de reparaciones y proveedores</h2>

            <p className="subtitulo-dashboard">
              Cantidad de intervenciones, máquinas atendidas
              y costos registrados por proveedor.
            </p>

            {errorProveedores ? (

              <p className="mensaje-error">
                {errorProveedores}
              </p>

            ) : proveedores === null ? (

              <p>Cargando análisis de proveedores...</p>

            ) : (

              <div className="graficos-grid">

                <article className="grafico-card">

                  <h3>Reparaciones por proveedor</h3>

                  <GraficoReparacionesProveedor
                    filas={proveedores}
                  />

                </article>

              </div>

            )}

          </section>

          <section className="dashboard-seccion">
            <h2>Plantas industriales</h2>
            <p className="subtitulo-dashboard">Seleccioná una planta para analizar sus sectores.</p>
            <div className="plantas-grid">
              {plantas.map(p => (
                <article className="planta-card" key={p.id_planta}>
                  <h3>{p.nombre}</h3>
                  <p>{p.ciudad}, {p.provincia}</p>
                  <div className="planta-datos">
                    <span><strong>{p.total_sectores}</strong> sectores</span>
                    <span><strong>{p.total_maquinas}</strong> máquinas</span>
                  </div>
                  <button className="boton-drill" disabled={cargando}
                    onClick={() => seleccionarPlanta(p.id_planta)}>
                    Ver sectores
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-seccion">
            <h3>Interpretación del semáforo</h3>
            <div className="leyenda-semaforo">
              <div className="leyenda-item">
                <Semaforo valor="VERDE" />
                <p>Máquina operativa, mantenimiento a más de 30 días y sin fallas Altas activas.</p>
              </div>
              <div className="leyenda-item">
                <Semaforo valor="AMARILLO" />
                <p>Máquina en advertencia o mantenimiento dentro de los próximos 30 días.</p>
              </div>
              <div className="leyenda-item">
                <Semaforo valor="ROJO" />
                <p>Máquina fuera de servicio, mantenimiento vencido o falla Alta activa.</p>
              </div>
            </div>
            <p className="aclaracion-semaforo">Prioridad: ROJO &gt; AMARILLO &gt; VERDE.</p>
          </section>

          <section className="dashboard-seccion">
            <h3>Detalle general de máquinas</h3>
            <div className="tabla-contenedor">
              <table>
                <thead><tr>
                  <th>Máquina</th><th>Sector</th><th>Estado</th>
                  <th>Días para mantenimiento</th><th>Falla alta activa</th><th>Semáforo</th>
                </tr></thead>
                <tbody>
                  {maquinas.map(m => (
                    <tr key={m.id_maquina}>
                      <td>{m.maquina}</td>
                      <td>{m.sector}</td>
                      <td>{m.estado_maquina}</td>
                      <td>{m.dias_restantes ?? 'Sin datos'}</td>
                      <td>{m.falla_alta_activa}</td>
                      <td><Semaforo valor={m.semaforo} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;