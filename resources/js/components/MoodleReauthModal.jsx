import React, { useState } from 'react';

export default function MoodleReauthModal({ open, url, onClose, onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ url, username, password });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md text-black shadow-xl">
        <h3 className="text-lg font-bold text-black mb-4">Reingresa tus credenciales</h3>
        <p className="text-sm text-black/80 mb-4">El token de la plataforma expiró. Ingresa tus credenciales para reautenticar.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            name="username"
            placeholder="Nombre de usuario"
            className="border p-2 rounded w-full bg-white text-black placeholder:text-gray-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            name="password"
            type="password"
            placeholder="Contraseña"
            className="border p-2 rounded w-full bg-white text-black placeholder:text-gray-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="cursor-pointer px-3 py-1 text-black hover:underline">Cancelar</button>
            <button type="submit" className="cursor-pointer px-3 py-1 border rounded bg-white hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150">Volver a conectar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
