# Archivo vivo — La Central Baja

Portal web estático (sin backend) para:
- recoger la info base del proyecto (Goteo)
- añadir hitos/updates fácilmente
- archivar/filtrar/buscar
- exportar/importar el archivo como JSON

## Cómo usar

### Abrir en local (rápido)
En esta carpeta:

```bash
python3 -m http.server 5173
```

Luego abre: http://localhost:5173

> Nota: si abres el HTML “a pelo” (file://) algunas cosas pueden fallar; mejor con servidor.

## Añadir cosas
- Botón **“Añadir hito”**: crea entradas (fecha, tipo, título, texto, tags, links, adjuntos)
- Quedan guardadas en **localStorage** (en tu navegador)

## Exportar / Importar
- **Exportar JSON**: descarga `lacentralbaja-archivo.json`
- **Importar JSON**: carga ese mismo archivo para moverlo a otro ordenador/navegador o hacer backup.

## Datos base
- `data/seed.json` trae la info del proyecto + algunas secciones iniciales.

## Próximo paso (si queréis multiusuario)
Esto es “single-user” (depende del navegador). Si queréis que varias personas editen y quede persistente en un servidor, lo siguiente sería:
- pasar entradas a `content/*.md` (Git) y publicar en GitHub Pages
- o integrar un CMS (Netlify/Decap) para editar desde web
