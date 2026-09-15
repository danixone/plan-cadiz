# Plan 1.000 m · Policía Nacional · Cádiz

Estado vivo de la preparación física. Se actualiza con Claude Code cada vez que hay un entrenamiento nuevo.

```
CLAUDE.md             instrucciones para Claude Code
datos/plan.json       baremo, zonas, ritmos, calendario, protocolos, dieta, lesiones
datos/historial.json  todas las sesiones, sueño y lecturas del Garmin
docs/index.html       la web · GitHub Pages publica desde esta carpeta
archivos-garmin/      deja aquí los .fit y .csv que vayas exportando (no se sube al repo)
```

---

## Empezar con Claude Code

```bash
cd plan-cadiz
claude
```

Primer mensaje: **«Lee CLAUDE.md y los dos archivos de datos.»**

A partir de ahí, arrastra el `.fit` de cada entrenamiento y él analiza, registra, decide si hay que cambiar algo y actualiza la web.

---

## Publicar en GitHub Pages

**Una sola vez, para montarlo:**

```bash
cd plan-cadiz
git init
git add .
git commit -m "Plan de preparación física"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/plan-cadiz.git
git push -u origin main
```

Después, en GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` → Folder: `/docs` → Save.**

En un minuto tendrás la dirección: `https://TU-USUARIO.github.io/plan-cadiz/`

**Cada vez que quieras publicar un cambio:**

```bash
git add -A && git commit -m "Sesión del 19 de septiembre" && git push
```

Y ya está. **Sin créditos, sin límite de despliegues, sin compilaciones.**

---

## Añadirlo a la pantalla de inicio del iPhone

Abre la dirección **en Safari** → los tres puntos junto a la barra → **Compartir** → **Añadir a pantalla de inicio**, dejando activado *Abrir como app web*. Aparecerá como **Plan Cádiz** con su icono.

---

## Aviso de privacidad

**La web es pública.** Cualquiera con la dirección puede verla, y contiene tu nombre, peso, composición corporal, historial de sueño y lesiones. La dirección es difícil de adivinar, pero no está protegida.

Dos formas de cerrarla, ambas gratuitas:

**Repositorio privado + Cloudflare Pages.** GitHub Pages exige repositorio público en el plan gratuito; Cloudflare Pages funciona con repositorios privados. Conectas el repo en Cloudflare Pages, carpeta de salida `docs`, sin comando de compilación.

**Cloudflare Access** por encima, si además quieres que la web pida identificarse. El plan gratuito permite unos pocos usuarios con verificación por correo.

Si te da igual que sea pública, GitHub Pages a secas es lo más simple y no hay nada más que hacer.

---

## Exportar los archivos del Garmin

En Garmin Connect, desde el ordenador: abre la actividad → icono de engranaje → **Exportar original**. Descarga un `.zip` con el `.fit` dentro, que lleva cadencia, longitud de zancada, oscilación vertical y tiempo de contacto.

El TCX recorta esa información: no lo uses.
