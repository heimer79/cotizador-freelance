# API Contract: Configuración de Publicidad

**Base path**: `/api/config`

## GET /api/config/ads

Devuelve la configuración de todos los espacios publicitarios de la plataforma. Usado por el frontend para determinar qué mostrar en cada slot.

**Autenticación**: No requerida (la configuración de anuncios es pública).

### Response

**200 OK**

```json
{
  "espacios": [
    {
      "id": "banner-superior",
      "tipo": "pauta_directa",
      "ubicacion": "lista-cotizaciones",
      "posicion": "superior",
      "activo": true,
      "anunciante": {
        "imagen_url": "https://ejemplo.com/banner-anunciante.png",
        "enlace_url": "https://ejemplo.com/promo",
        "alt": "Anuncio de Ejemplo S.A."
      },
      "fallback": "adsense"
    },
    {
      "id": "lateral-editor",
      "tipo": "adsense",
      "ubicacion": "editor-cotizacion",
      "posicion": "lateral",
      "activo": true,
      "anunciante": null,
      "fallback": "adsense"
    },
    {
      "id": "entre-contenido-catalogo",
      "tipo": "pauta_directa",
      "ubicacion": "catalogo-servicios",
      "posicion": "entre-contenido",
      "activo": true,
      "anunciante": null,
      "fallback": "oculto"
    }
  ],
  "adsense_client_id": "ca-pub-XXXXXXXXXXXXXXXX"
}
```

### Campos por espacio

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Identificador único del espacio |
| `tipo` | string | `"adsense"` o `"pauta_directa"` |
| `ubicacion` | string | Pantalla donde aparece |
| `posicion` | string | Posición dentro de la pantalla |
| `activo` | boolean | Si el espacio está habilitado |
| `anunciante` | object \| null | Contenido del anunciante (solo para pauta_directa con contrato activo) |
| `anunciante.imagen_url` | string | URL de la imagen a mostrar |
| `anunciante.enlace_url` | string | URL de destino al hacer clic |
| `anunciante.alt` | string | Texto alternativo de accesibilidad |
| `fallback` | string | `"adsense"` (mostrar AdSense si no hay anunciante) o `"oculto"` (ocultar el espacio) |

### Notas

- Este endpoint lee la configuración del fichero `ads-config.json` del backend.
- Para actualizar la pauta directa, se modifica el fichero JSON y se reinicia el servidor. No requiere redeploy del código ni nuevo build (FR-008).
- El `adsense_client_id` se incluye para que el frontend no necesite hardcodear el ID de publisher.
