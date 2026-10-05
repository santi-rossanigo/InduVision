import { useState } from 'react';
import './App.css';

function App() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [usuario, setUsuario] = useState(null);
  const [maquinas, setMaquinas] = useState([]);

  const iniciarSesion = async (e) => {

    e.preventDefault();

    try {

      const respuesta = await fetch('http://localhost:3000/login', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const datos = await respuesta.json();

      if (respuesta.ok) {

        setUsuario(datos.usuario);
        setMensaje('');

        obtenerMaquinas();

      } else {

        setMensaje(datos.mensaje);

      }

    } catch (error) {

      setMensaje('No se pudo conectar con el servidor');

    }
  };


  const obtenerMaquinas = async () => {

    try {

      const respuesta = await fetch(
        'http://localhost:3000/api/maquinas'
      );

      const datos = await respuesta.json();

      setMaquinas(datos);

    } catch (error) {

      console.error('Error al obtener maquinas');

    }
  };


  // =========================
  // PANTALLA DESPUÉS DEL LOGIN
  // =========================
  if (usuario) {

    return (
      <div className="contenedor">

        <h1>InduVision</h1>

        <h2>
          Bienvenido {usuario.nombre}
        </h2>

        <h3>Estado de máquinas</h3>

        <table>

          <thead>

            <tr>
              <th>Máquina</th>
              <th>Sector</th>
              <th>Estado</th>
              <th>Días para mantenimiento</th>
              <th>Falla alta activa</th>
              <th>Semáforo</th>
            </tr>

          </thead>

          <tbody>

            {maquinas.map((maquina) => (

              <tr key={maquina.id_maquina}>

                <td>{maquina.maquina}</td>

                <td>{maquina.sector}</td>

                <td>{maquina.estado_maquina}</td>

                <td>{maquina.dias_restantes}</td>

                <td>{maquina.falla_alta_activa}</td>

                <td>

                  <span
                    className={`semaforo ${maquina.semaforo.toLowerCase()}`}
                  >
                    {maquina.semaforo}
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>
    );
  }


  // =========================
  // PANTALLA DE LOGIN
  // =========================
// =========================
// PANTALLA DE LOGIN
// =========================

  return (

    <div className="login-page">

      <div className="login-card">

        <div className="login-header">

          <h1>InduVision</h1>

          <p>
            Mantenimiento industrial basado en datos
          </p>

        </div>

        <h2>Inicio de sesión</h2>

        <form onSubmit={iniciarSesion}>

          <div className="campo-login">

            <label>Email</label>

            <input
              type="email"
              placeholder="Ingrese su email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

          </div>


          <div className="campo-login">

            <label>Contraseña</label>

            <input
              type="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

          </div>


          <button
            className="boton-login"
            type="submit"
          >
            Ingresar
          </button>

        </form>


        {mensaje && (

          <p className="mensaje-login">
            {mensaje}
          </p>

        )}

      </div>

    </div>

  );
}

export default App;