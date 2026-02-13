# Deploy en Cloudflare Pages (La Central Baja — Archivo Vivo)

Esto publica la **versión estática** del proyecto (front) usando `public/`.

> Importante: en Pages **no hay servidor Node ni base de datos**. La web funciona en modo “cliente”: carga `data/seed.json` y guarda lo que añadas en **localStorage del navegador** (no se comparte entre usuarios). Si quieres “archivo vivo” multiusuario, hay que migrar a Workers+D1+R2.

## 1) Crear el proyecto en Pages
1. Cloudflare Dashboard → **Workers & Pages** → **Pages** → **Create a project**
2. Conecta GitHub y el repo: `minimotogallery/lacentralbaja-archivo-vivo`
3. Framework preset: **None**
4. Build settings:
   - **Build command:** *(vacío)*
   - **Build output directory:** `public`

## 2) Dominio
En Pages → Custom domains:
- Añade `lacentralbaja.org`
- (recomendado) añade `www.lacentralbaja.org`

Cloudflare te dirá si hay que crear/ajustar registros DNS. Si el DNS del dominio ya está en Cloudflare, suele ser automático.

## 3) Verificación rápida
- Abre la URL de Pages (preview o production)
- Comprueba que cargan:
  - `/` (home)
  - `assets/capa-2.png`
  - `data/seed.json`
