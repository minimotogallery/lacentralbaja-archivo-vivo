# Deploy en Render (La Central Baja — Archivo Vivo)

## Requisitos
- Repo en GitHub con esta carpeta: `centralbaja-archivo-vivo/`
- Dominio: `lacentralbaja.org`

## 1) Crear servicio desde render.yaml
1. En Render: **New +** → **Blueprint**
2. Conecta el repo y selecciona el branch principal
3. Render detectará `centralbaja-archivo-vivo/render.yaml` y creará el servicio.

## 2) Variables de entorno
En el servicio, configura:
- `ADMIN_KEY` = `sitanpoderosotueres`
- (ya fijadas en YAML)
  - `DATA_DIR=/var/data`
  - `UPLOADS_DIR=/var/uploads`
  - `NODE_ENV=production`

## 3) Disco persistente
El Blueprint crea un **disk** montado en `/var`.
- SQLite queda en: `/var/data/db.sqlite`
- Imágenes en: `/var/uploads/`

## 4) Probar
- Público: `https://<tu-servicio>.onrender.com/`
- Admin: `https://<tu-servicio>.onrender.com/admin`

## 5) Dominio lacentralbaja.org
En Render → Settings → Custom Domains:
1. Añade `lacentralbaja.org`
2. Render te dará valores DNS.
3. En tu proveedor DNS, crea los registros que indique Render.
4. Espera propagación + emisión SSL.

## 6) Backup (recomendación mínima)
- Añadir en admin un botón de export JSON
- Descargar periódicamente `db.sqlite` y `/uploads` (o automatizar zip)
