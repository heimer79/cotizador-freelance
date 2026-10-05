async function peticion(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones
  });

  if (respuesta.status === 204) return null;

  const datos = await respuesta.json();

  if (respuesta.status === 401 && !url.startsWith('/api/auth/')) {
    window.dispatchEvent(new CustomEvent('sesion-expirada'));
  }

  if (!respuesta.ok) {
    const error = new Error(datos.error || 'Error desconocido');
    error.status = respuesta.status;
    throw error;
  }

  return datos;
}

const enviar = (metodo, datos) => ({ method: metodo, body: JSON.stringify(datos) });

export const auth = {
  yo: () => peticion('/api/auth/me'),
  registro: (datos) => peticion('/api/auth/registro', enviar('POST', datos)),
  login: (datos) => peticion('/api/auth/login', enviar('POST', datos)),
  logout: () => peticion('/api/auth/logout', { method: 'POST' }),
  verificar: (token) => peticion('/api/auth/verificar', enviar('POST', { token })),
  reenviarVerificacion: () => peticion('/api/auth/reenviar-verificacion', { method: 'POST' }),
  olvide: (email) => peticion('/api/auth/olvide', enviar('POST', { email })),
  restablecer: (token, password) => peticion('/api/auth/restablecer', enviar('POST', { token, password }))
};

export const perfil = {
  obtener: () => peticion('/api/perfil'),
  guardar: (datos) => peticion('/api/perfil', enviar('PUT', datos))
};

export const clientes = {
  listar: () => peticion('/api/clientes'),
  crear: (datos) => peticion('/api/clientes', enviar('POST', datos)),
  actualizar: (id, datos) => peticion(`/api/clientes/${id}`, enviar('PUT', datos)),
  eliminar: (id) => peticion(`/api/clientes/${id}`, { method: 'DELETE' })
};

export const catalogo = {
  listar: () => peticion('/api/catalogo'),
  crear: (datos) => peticion('/api/catalogo', enviar('POST', datos)),
  actualizar: (id, datos) => peticion(`/api/catalogo/${id}`, enviar('PUT', datos)),
  eliminar: (id) => peticion(`/api/catalogo/${id}`, { method: 'DELETE' })
};

export const cotizaciones = {
  listar: () => peticion('/api/cotizaciones'),
  obtener: (id) => peticion(`/api/cotizaciones/${id}`),
  crear: (datos) => peticion('/api/cotizaciones', enviar('POST', datos)),
  actualizar: (id, datos) => peticion(`/api/cotizaciones/${id}`, enviar('PUT', datos)),
  emitir: (id) => peticion(`/api/cotizaciones/${id}/emitir`, { method: 'POST' }),
  eliminar: (id) => peticion(`/api/cotizaciones/${id}`, { method: 'DELETE' }),
  crearLinea: (id, datos) => peticion(`/api/cotizaciones/${id}/lineas`, enviar('POST', datos)),
  actualizarLinea: (id, lineaId, datos) => peticion(`/api/cotizaciones/${id}/lineas/${lineaId}`, enviar('PUT', datos)),
  eliminarLinea: (id, lineaId) => peticion(`/api/cotizaciones/${id}/lineas/${lineaId}`, { method: 'DELETE' })
};

export const donaciones = {
  crear: (monto) => peticion('/api/donaciones', enviar('POST', { monto })),
  historial: (pagina = 1) => peticion(`/api/donaciones?pagina=${pagina}&por_pagina=10`)
};

export const configAds = {
  obtener: () => peticion('/api/config/ads')
};
