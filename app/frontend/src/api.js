async function peticion(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones
  });

  if (respuesta.status === 204) return null;

  const texto = await respuesta.text();
  if (!texto) {
    if (!respuesta.ok) {
      const err = new Error(`Error del servidor (${respuesta.status})`);
      err.status = respuesta.status;
      throw err;
    }
    return null;
  }

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    const err = new Error(`Respuesta no válida del servidor (${respuesta.status})`);
    err.status = respuesta.status;
    throw err;
  }

  if (respuesta.status === 401 && !url.startsWith('/api/auth/')) {
    window.dispatchEvent(new CustomEvent('sesion-expirada'));
  }

  if (!respuesta.ok) {
    const error = new Error(datos.error || 'Error desconocido');
    error.status = respuesta.status;
    error.requiere2fa = datos.requiere2fa;
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
  restablecer: (token, password) => peticion('/api/auth/restablecer', enviar('POST', { token, password })),
  establecerPassword: (password) => peticion('/api/auth/establecer-password', enviar('POST', { password })),
  activar2fa: () => peticion('/api/auth/2fa/activar', { method: 'POST' }),
  verificar2fa: (codigo) => peticion('/api/auth/2fa/verificar', enviar('POST', { codigo })),
  desactivar2fa: () => peticion('/api/auth/2fa', { method: 'DELETE' })
};

export const perfil = {
  obtener: () => peticion('/api/perfil'),
  guardar: (datos) => peticion('/api/perfil', enviar('PUT', datos)),
  actividad: () => peticion('/api/perfil/actividad'),
  emisores: () => peticion('/api/perfil/emisores'),
  crearEmisor: (datos) => peticion('/api/perfil/emisores', enviar('POST', datos)),
  actualizarEmisor: (id, datos) => peticion(`/api/perfil/emisores/${id}`, enviar('PUT', datos)),
  eliminarEmisor: (id) => peticion(`/api/perfil/emisores/${id}`, { method: 'DELETE' })
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

export const configDonaciones = {
  obtener: () => peticion('/api/config/donaciones')
};

export const legal = {
  documentos: () => peticion('/api/legal/documentos'),
  documento: (tipo) => peticion(`/api/legal/documentos/${tipo}`),
  aceptar: (documentoIds) => peticion('/api/legal/aceptar', enviar('POST', { documentoIds })),
  estado: () => peticion('/api/legal/estado')
};

export const suscripcion = {
  crear: (datos) => peticion('/api/suscripcion/crear', enviar('POST', datos)),
  cancelar: () => peticion('/api/suscripcion/cancelar', { method: 'POST' }),
  estado: () => peticion('/api/suscripcion/estado')
};

export const admin = {
  config: (seccion) => peticion(`/api/admin/config/${seccion}`),
  guardarConfig: (seccion, datos) => peticion(`/api/admin/config/${seccion}`, enviar('PUT', datos)),
  usuarios: (pagina = 1, busqueda = '') => peticion(`/api/admin/usuarios?pagina=${pagina}&busqueda=${encodeURIComponent(busqueda)}`),
  suspenderUsuario: (id) => peticion(`/api/admin/usuarios/${id}/suspender`, { method: 'PATCH' }),
  reactivarUsuario: (id) => peticion(`/api/admin/usuarios/${id}/reactivar`, { method: 'PATCH' }),
  cambiarRol: (id, rol) => peticion(`/api/admin/usuarios/${id}/rol`, enviar('PATCH', { rol })),
  cambiarCuenta: (id, tipoCuenta) => peticion(`/api/admin/usuarios/${id}/cuenta`, enviar('PATCH', { tipoCuenta })),
  notificaciones: (pagina = 1) => peticion(`/api/admin/notificaciones?pagina=${pagina}`),
  conteoNotificaciones: () => peticion('/api/admin/notificaciones/conteo'),
  marcarNotificacion: (id) => peticion(`/api/admin/notificaciones/${id}`, { method: 'PATCH' }),
  tabla: (tabla, pagina = 1) => peticion(`/api/admin/bd/${tabla}?pagina=${pagina}`)
};

export const grupos = {
  listar: () => peticion('/api/grupos'),
  crear: (datos) => peticion('/api/grupos', enviar('POST', datos)),
  actualizar: (id, datos) => peticion(`/api/grupos/${id}`, enviar('PUT', datos)),
  eliminar: (id) => peticion(`/api/grupos/${id}`, { method: 'DELETE' }),
  miembros: (id) => peticion(`/api/grupos/${id}/clientes`),
  asignarCliente: (id, clienteId) => peticion(`/api/grupos/${id}/clientes`, enviar('POST', { clienteId })),
  quitarMiembro: (id, clienteId) => peticion(`/api/grupos/${id}/clientes/${clienteId}`, { method: 'DELETE' }),
  quitarCliente: (id, clienteId) => peticion(`/api/grupos/${id}/clientes/${clienteId}`, { method: 'DELETE' })
};

export const compartir = {
  crearEnlace: (datos) => peticion('/api/cotizaciones/compartir', enviar('POST', datos))
};

export const plantillasPdf = {
  listar: () => peticion('/api/plantillas-pdf')
};
