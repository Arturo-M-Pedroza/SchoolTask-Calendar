import React, { useEffect, useState } from 'react';
import { RefreshCw } from "lucide-react";
import { Toaster, toast } from 'react-hot-toast';
import MoodleReauthModal from './MoodleReauthModal';

export default function Platforms() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthUrl, setReauthUrl] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    color: '#3B82F6'
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGoogleLogin = () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      toast.error("Google API aún no est lista. Intenta de nuevo en un momento.");
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID; //NOTA A DEV: Colorarlo en las variables de entorno
    if(!clientId){ 
      toast.error("No hay credenciales definidas"); 
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 
        'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/userinfo.email',
      callback: async (tokenResponse) => {
        try {
          const res = await fetch('/classroom/sync', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify({
              access_token: tokenResponse.access_token,
            }),
          });

          const data = await res.json();
          toast.success(`${data.message}`);
        } catch (error) {
          console.error('Error al enviar token:', error);
          toast.error('Ocurrió un error al conectar con Classroom');
        }
      },
    });

    client.requestAccessToken();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast("Buscando plataforma...");
    console.log(JSON.stringify(formData))
    try {
      const res = await fetch("/moodle/sync", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
      
      if (data.success) fetchPlatforms();
    } catch (err) {
      toast.error("Error de conexión con el servidor");
    }
  };

  const fetchPlatforms = async () => {
    const resPlat = await fetch("/listPlatforms");
    const data = await resPlat.json();
    const platfs = data.filter(elemento => elemento.name !== 'Google Classroom'); //Porque el refrescado se maneja diferente
    setPlatforms(platfs);
  };

  const handleRefresh = async (url) => {
    setLoading(true);
    toast(`Buscando tareas en ${url}`)
    try {
      const res = await fetch("/moodle/refresh", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (res.status === 401 && data.reauth_required) {
        // Prompt user for credentials
        setReauthUrl(url);
        setReauthOpen(true);
      } else {
        if (data.success) {
          toast.success(data.message);
          fetchPlatforms();
        } else {
          toast.error(data.message);
        }
      }
    } catch (err) {
      toast.error("Error al refrescar la plataforma");
    } finally {
      setLoading(false);
    }
  };

  const handleReauthSubmit = async ({ url, username, password }) => {
    setLoading(true);
    try {
      const res = await fetch('/moodle/refresh', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({ url, username, password })
      });

      const data = await res.json();
      if (res.status === 401 && data.reauth_required) {
        toast.error(data.message || 'Credenciales incorrectas o usuario no válido.');
      } else if (data.success) {
        toast.success(data.message);
        setReauthOpen(false);
        setReauthUrl(null);
        fetchPlatforms();
      } else {
        toast.error(data.message || 'Error autenticando');
      }
    } catch (err) {
      toast.error('Error al reautenticar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlatforms();
  }, []);

  return (
    <>
    <Toaster  position="top-center" 
              toastOptions={{
                duration: 5000,
              }}/>

    <MoodleReauthModal open={reauthOpen} url={reauthUrl} onClose={() => { setReauthOpen(false); setReauthUrl(null); }} onSubmit={handleReauthSubmit} />

    <div className="p-6">
      
      <div className='w-full flex content-end justify-end mb-5'>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-400 font-bold"
          onClick={handleGoogleLogin}
        >
          Cargar/Refrescar Classroom
        </button>
      </div>
      
      <h1 className="text-2xl font-bold mb-4">Alta plataformas Moodle</h1>
      <form className="mb-6 space-y-2" onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Nombre de la plataforma"
          className="border p-2 rounded w-full"
          value={formData.name}
          onChange={handleChange}
        />
        <input
          name="url"
          placeholder="URL (sin https://)"
          className="border p-2 rounded w-full"
          value={formData.url}
          onChange={handleChange}
        />
        <label className='font-bold'>Credenciales de acceso</label>
        <input
          name="username"
          placeholder="Nombre de usuario"
          className="border p-2 rounded w-full"
          value={formData.username}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          className="border p-2 rounded w-full"
          value={formData.password}
          onChange={handleChange}
        />

        <div className="flex items-center mb-5">
          <label className="text-base font-semibold m-3">Color de visualizacion</label>
          <input
            name="color"
            type="color"
            className="border rounded w-8 h-8 cursor-pointer"
            value={formData.color}
            onChange={handleChange}
          />
        </div>
        
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-300 font-bold">Guardar</button>
      </form>

      <ul className='mb-8'>
        {platforms.map((p, i) => (
          <li key={i} className="border p-2 rounded mb-2 flex justify-between items-center">
            <span>
              <strong>{p.name}</strong> – {p.url}
            </span>
            <button
              onClick={() => handleRefresh(p.url)}
              className="hover:bg-gray-300 text-gray-700 px-3 py-1 rounded ml-2"
              disabled={loading}
            >
              <RefreshCw className="h-5 w-5 hover:transition hover:delay-50 hover:duration-500 hover:rotate-360" />
            </button>
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}