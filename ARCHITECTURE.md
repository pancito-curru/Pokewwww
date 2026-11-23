# Pokewwwww: arquitectura y estado del proyecto

Documento de referencia para quien trabaje en el código (personas o agentes). Explica cómo está
hecho el proyecto, qué piezas se reutilizan, por qué se tomaron ciertas decisiones y en qué estado
está. El diseño original está en [BLUEPRINT.md](BLUEPRINT.md); el README cubre el uso básico.

- **Web:** https://pancito-curru.github.io/Pokewwwww/
- **Repo:** https://github.com/pancito-curru/Pokewwwww (rama `main`, se publica sola en cada push)
- **Para añadir una sección nueva:** usa el skill `new-section` (`.claude/skills/new-section/SKILL.md`).

---

## 1. Qué es

Web de trivia Pokémon, sin fines de lucro, con 10 juegos ("secciones") y una página de contacto.
Todo corre en el navegador: no hay servidor propio ni base de datos. El progreso y las estadísticas
se guardan en `localStorage` del jugador.

## 2. Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Build / dev server | Vite | 7.3.7 |
| UI | React + TypeScript (strict) | 18.3.1 / 5.6.3 |
| Estilos | Tailwind CSS (+ PostCSS, Autoprefixer) | 3.4.15 |
| Estado | Zustand con `persist` (localStorage) | 4.5.5 |
| Rutas | React Router, `HashRouter` | 7.18.5 |
| Tests | Vitest | 4.1.12 |
| Scripts de datos | tsx (Node 22) | 4.23.15 |
| Hosting | GitHub Pages vía GitHub Actions | — |
| Formulario de contacto | FormSubmit (servicio externo) | — |

Fuentes de datos: [PokeAPI](https://pokeapi.co) (datos, arte oficial, llantos) y
[PokéSprite](https://github.com/msikma/pokesprite) (sprites de caja Gen 1–8).

Las versiones están fijadas exactas en `package.json` (sin `^`/`~`). Al actualizar, elegir versiones
publicadas hace al menos dos semanas.

## 3. Arquitectura

```
 build time (una vez, manual)                     runtime (navegador)
┌────────────────────────────────┐          ┌───────────────────────────────────────────┐
│ scripts/build-pokedex.ts       │          │ index.html → main.tsx → App (HashRouter)    │
│ scripts/build-movesets.ts      │  JSON    │   Layout (nav, footer)                      │
│   ↓ PokeAPI (con caché local)  │ ───────▶ │   ├─ Home (tarjetas + estado del día)       │
│   ↓ PokéSprite pokemon.json    │ src/data │   ├─ juegos (lazy, un chunk cada uno)       │
│ scripts/cache/ (gitignored)    │          │   └─ Contact (lazy) ──▶ FormSubmit (email)  │
└────────────────────────────────┘          │ Zustand stores ──persist──▶ localStorage    │
                                            │ Imágenes/audio: CDN jsDelivr, GitHub raw    │
                                            └───────────────────────────────────────────┘
```

Principios:

- **Sitio estático.** `npm run build` genera `dist/` con rutas relativas (`base: './'`) y hash
  routing (`#/ruta`), así funciona en cualquier hosting y subcarpeta.
- **Los datos se generan antes, no se piden en vivo.** La app nunca llama a la API de PokeAPI
  (su política pide cachear). Solo carga imágenes y audio por URL.
- **La lógica de juego es pura y está testeada.** Vive en `src/lib/` sin React; los componentes
  solo muestran estado y llaman a acciones del store.
- **Cada juego carga bajo demanda.** `React.lazy` por ruta; los datos pesados de un juego
  (p. ej. `movesets.json`) se importan dinámicamente dentro del juego.
- **El "del día" es determinista.** Semilla = hash(fecha local + nombre del juego) → mismo
  resultado para todos ese día, sin servidor.

## 4. Estructura

```
.github/workflows/deploy.yml   CI: npm ci → test → build → GitHub Pages
scripts/
  fetch-cache.ts               getJson (caché en scripts/cache), pool, helpers
  build-pokedex.ts             → src/data/pokedex.json   (npm run data)
  build-movesets.ts            → src/data/movesets.json  (npm run data:moves)
  build-locations.ts           → src/data/locations.json (npm run data:locations)
  analyze-gps.ts               cuántas respuestas encajan con cada pista de PokeGPS (npx tsx)
src/
  main.tsx, App.tsx            arranque y rutas (lazy por juego)
  index.css                    Tailwind + clases utilitarias (.pixelated, .tile)
  data/
    pokedex.json               1025 Pokémon (generado, se commitea)
    movesets.json              movimientos por Pokémon (generado, carga diferida)
    index.ts                   POKEDEX, byId, findByInput, getPool, byLength, GENERATIONS
    types.ts                   tipos Pokemon, PokeType, Region, Category, REGIONS
    sprites.ts                 spriteUrl, artworkUrl, cryUrl (commit de PokéSprite fijado)
  lib/                         lógica pura + tests (*.test.ts al lado)
  components/                  UI compartida (ver §7)
  pages/                       Home, Contact
  games/
    modes.ts                   registro de juegos (ruta, título, texto, sprites de la tarjeta)
    timed/ guess/ wordle/ crossword/   juegos con store propio
    identify/                  motor de Siluetas y Llantos (daily + contrarreloj)
    puzzle/                    motor de Moveset, Hangman y Shiny Hunt (daily + ilimitado)
    moveset/ hangman/ shiny/   pantallas de esos juegos
    gps/                       PokeGPS: acertijo (motor puzzle) + exploración de mapas (store propio)
  i18n/                        idioma (EN/ES): hook `useT`, store y diccionarios (`dict/`)
public/favicon.svg
BLUEPRINT.md, README.md, ARCHITECTURE.md, CLAUDE.md
```

## 5. Datos

### `Pokemon` (`src/data/types.ts`, en `pokedex.json`)
`id, name, slug, norm, aliases, letters, types, generation, region, color, habitat, shape,
evoStage, evolvesFrom, fullyEvolved, height (m), weight (kg), bst, category
('regular'|'legendary'|'mythical'|'baby'), eggGroups, genus, flavor` (entrada de Pokédex con el
nombre tapado por `_____`).

- `norm`: nombre normalizado para comparar (`normalize()` en `lib/normalize.ts`).
- `letters`: solo A–Z en mayúsculas (Wordle, crucigrama). Los nombres con dígitos se excluyen de
  los juegos de letras (`isLetterSafe`).
- `slug`: nombre en PokéSprite; `null` en Gen 9, que usa los sprites de PokeAPI.

### `locations.json` (`lib/gps.ts`: `LocationData`)
`{ locations: {id: [nombre, región]}, pokemon: {id: [[lugar, nivelMin, nivelMax], …]} }`. Sale de
`/pokemon/{id}/encounters`, con las áreas agrupadas por lugar; solo lugares con región. 846 de 1025 Pokémon tienen
encuentros salvajes (los evolucionados, iniciales, legendarios… no) y **ninguno de Gen 9**: PokeAPI no tiene encuentros
de Paldea. Se carga con `import()` dentro del juego (~170 kB, 39 kB gzip).

### `movesets.json` (`lib/moveset.ts`: `MovesetData`)
`{ moves: {slug: {name, type, cls}}, games: {vgId: "Scarlet & Violet"}, sets: {id: {vg, moves: [[slug, learn]]}} }`.
6 movimientos por Pokémon, de comunes a raros; `learn` = nivel (0 = al evolucionar) o método
(`machine`, `tutor`, `egg`…). Ditto, Unown, Smeargle, Cosmog y Cosmoem quedan fuera.

### Medios por URL (`src/data/sprites.ts`)
- Sprites de caja: jsDelivr → PokéSprite, commit fijado (`SPRITE_REF`).
- Arte oficial (siluetas): GitHub raw → PokeAPI/sprites.
- Llantos: GitHub raw → PokeAPI/cries (Ogg Vorbis), existen para los 1025.

### Regenerar datos
`npm run data` y luego `npm run data:moves`. Las respuestas quedan en `scripts/cache/`; borrar esa
carpeta fuerza una descarga nueva. Los JSON generados se commitean.

## 6. Secciones

| Sección | Ruta | Código | Store / clave localStorage | Modos |
|---|---|---|---|---|
| Name 'Em All | `#/timed` | `games/timed/` | `pokewwww-timed` | contrarreloj por generación, modo fácil |
| Who's That? | `#/guess` | `games/guess/` | `pokewwww-guess` | del día, ilimitado, modo difícil |
| Pokédle | `#/wordle` | `games/wordle/` | `pokewwww-wordle` | del día por longitud, ilimitado |
| Pokécross | `#/crossword` | `games/crossword/` | `pokewwww-crossword` | del día, ilimitado (tamaño, pistas) |
| Silhouettes | `#/silhouette` | `games/identify/` (kind `silhouette`) | `pokewwww-silhouette` | del día (3 intentos), contrarreloj |
| Cries | `#/cry` | `games/identify/` (kind `cry`) | `pokewwww-cry` | del día (3 intentos), contrarreloj |
| Moveset | `#/moveset` | `games/moveset/` + `games/puzzle/` | `pokewwww-moveset` | del día, ilimitado |
| Hangman | `#/hangman` | `games/hangman/` + `games/puzzle/` | `pokewwww-hangman` | del día, ilimitado |
| PokeGPS | `#/gps`, `#/gps/map` | `games/gps/` + `games/puzzle/`, `lib/gps.ts` | `pokewwww-gps`, `pokewwww-gpsmap` | del día, ilimitado, explorar (región) |
| Shiny Hunt | `#/shiny` | `games/shiny/` + `games/puzzle/`, `lib/shiny.ts` | `pokewwww-shiny` | del día, ilimitado (generación del Pokémon) |
| Contacto | `#/contact` | `pages/Contact.tsx`, `lib/contact.ts` | — | formulario → FormSubmit |

Cada juego aparece en tres sitios: `games/modes.ts` (menú y tarjeta), `App.tsx` (ruta lazy) y
`pages/Home.tsx` (`STATUS`, línea de estado de la tarjeta).

## 7. Piezas reutilizables

### Componentes (`src/components/`)
| Componente | Para qué |
|---|---|
| `Layout` | Cabecera con logo y menú (a partir de `MODES`), footer, título de pestaña por ruta |
| `Sprite` | Sprite de caja por id; `scale`, `silhouette` |
| `TypeBadge` | Etiqueta de tipo con su color (`bg-type-*` en Tailwind) |
| `PokemonInput` | Autocompletado que solo devuelve ids válidos; `exclude`, `showSprites` |
| `FilterPanel` | Selector de generaciones (vacío = todas) |
| `Timer` | Reloj que se actualiza solo (cuenta atrás o hacia delante), `onExpire` |
| `Keyboard` | Teclado en pantalla + físico; solo letras si no se pasan `onEnter`/`onBackspace` |
| `ShareButton` | Copia un texto al portapapeles ("Copied!") |
| `Switch` | Interruptor accesible (`role="switch"`) |

### Motores de juego
- **`games/puzzle/createPuzzleStore`**: "un Pokémon oculto + lista de intentos" con modo del día
  e ilimitado, estadísticas y rachas. Se configura con `{ name, addGuess, bucket }`. Lo usan Moveset
  (intentos = ids) y Hangman (intentos = letras). `games/puzzle/Chrome.tsx` aporta `PuzzleHeader`
  (pestañas), `UnlimitedOptions`, `GiveUp`, `PuzzleResult`, `WrongGuesses`, `btnPrimary`, `btnSecondary`.
- **`games/puzzle/` también sirve a Shiny Hunt**: el "Pokémon oculto" es el que se repite 300 veces en el tablero (299
  normales + 1 shiny) y los intentos son las posiciones pulsadas. La posición del shiny no se guarda: sale de
  `shinyIndex(roundSeed(ronda))`.
- **PokeGPS (`games/gps/`)**: el acertijo reutiliza `createPuzzleStore` (`useGpsStore`, 6 fallos, entrada de la Pokédex tras
  4). Como una pista puede encajar con varios Pokémon, `buildClue` añade etapa evolutiva, generación y rango de nivel solo
  cuando otro Pokémon encaja con tipo + lugares, y `fits` acepta cualquiera que encaje con todo lo mostrado (la
  pantalla manda el id del objetivo al store). El modo Explorar (`exploreStore`, `/gps/map`) elige una región y un lugar
  con 3–25 Pokémon, que se adivinan con autocompletado; al terminar pasa a otro lugar sin repetir.
- **`games/identify/`**: "identifica al Pokémon de una pista" con del día (3 intentos) y partida
  contrarreloj (regiones + 1/2/3/5 min, avance automático). `createIdentifyStore(kind)` y `Prompt`
  (tarjeta de silueta o reproductor de llanto). Para un tipo de pista nuevo: añadir un `kind`.

### Idiomas (`src/i18n/`, `src/lib/i18n.ts`)
- Inglés y español; se elige con el interruptor EN/ES del menú, se guarda en `pokewwww-lang` y por defecto sigue el
  idioma del navegador. `useT()` devuelve `t(clave, params)` (texto) y `tx(clave, { link: <a/> })` (con nodos React).
- Los textos viven en `src/i18n/dict/<area>.ts` (`defineArea({ en, es })`: el compilador obliga a que ambos idiomas
  tengan las mismas claves) y un test comprueba que también coincidan los `{placeholders}`. Plurales: claves
  `x_one` / `x_other` con el parámetro `count`. Fuera de React: `tFor(lang)`.
- Se traduce la interfaz, los textos para compartir y las pistas del crucigrama (se regeneran al cambiar de idioma).
  **No** se traducen los datos de la Pokédex (nombres, categorías, entradas, movimientos): siguen en inglés.
- El correo del formulario de contacto va siempre en inglés (tipo y área), sea cual sea el idioma de la página.

### Lógica pura (`src/lib/`)
`normalize` (nombres, alias) · `search` (ranking del autocompletado) · `rng` (mulberry32,
`dailySeed`, `todayKey`, `shuffle`, `pick`) · `i18n` (`translate`, `detectLang`) · `shiny` (tablero, reglas) · `stats` (`recordResult`, rachas) · `timed`
(coincidencias, typos, `formatClock`) · `compare` (tabla de Who's That?) · `wordle` · `crossword/`
(generador y pistas) · `identify` · `moveset` · `hangman` · `contact`.

## 8. Convenciones

**Código**
- TypeScript estricto; nada de `any` en `src/` (los scripts lo usan para respuestas de la API).
- Lógica en `src/lib/` (pura, testeada); componentes delgados. Tests junto al archivo (`x.test.ts`).
- Un store Zustand por juego, persistido como `pokewwww-<juego>` con `version`. **No renombrar
  estas claves**: borraría el progreso de todos los jugadores.
- Rondas guardadas como datos simples (ids, letras, fechas), nunca objetos derivados.
- Del día: `dailySeed('<juego>')` + `todayKey()` (fecha local); al cambiar el día se crea ronda nueva.
- Abandonar una ronda ilimitada ya empezada cuenta como derrota.
- Comentarios solo para explicar el porqué.

**UI**
- Interfaz en inglés y español (todo texto nuevo va al diccionario de ambos idiomas, nunca fijo en el componente). Marca visible: **Pokewwwww** (prefijo de los textos para compartir).
- Tailwind con modo oscuro por `prefers-color-scheme` (`dark:`); rojo `red-600` como color principal.
- Títulos con `font-pixel` (Press Start 2P); el texto normal con la fuente del sistema.
- Tarjetas `rounded-xl bg-white shadow dark:bg-slate-800/60`; botones `btnPrimary`/`btnSecondary`.
- Resultados: ✓/✗/▲▼ además del color; nada depende solo del color.
- Accesibilidad: controles con nombre (`aria-label`), `role="timer"`, `aria-live` en marcadores.
- Responsive: probado a 375 px, sin scroll horizontal.
- Cada tarjeta del inicio: exactamente 3 sprites centrados y el texto abajo.

**Git y publicación**
- Rama `main`; cada push publica (tests + build en CI). Commit/push solo con el visto bueno del dueño.
- Mensajes en inglés, imperativo, con la línea `Co-Authored-By` cuando los escribe Claude.
- Autor de los commits: correo noreply de GitHub (configurado solo en este repo).

## 9. Decisiones técnicas

| Decisión | Motivo |
|---|---|
| Sin backend; todo estático en GitHub Pages | Gratis, sin mantenimiento; el juego no necesita servidor |
| Datos generados en build y commiteados | Política de PokeAPI (cachear), carga rápida, builds sin red |
| `HashRouter` + `base: './'` | Funciona en Pages bajo subcarpeta y en cualquier hosting sin reglas de rewrite |
| Zustand + `persist` | Poco código, estado por juego, progreso sobrevive a recargas |
| Semilla por fecha para el "del día" | Mismo reto para todos sin servidor |
| Lógica pura en `lib/` con Vitest | Las reglas son lo más delicado (duplicados en Wordle, generador del crucigrama, typos) |
| Chunks lazy por juego; `pokedex` en chunk propio | El inicio carga solo lo necesario; los datos quedan en caché al actualizar la app |
| PokéSprite fijado a un commit | Las URLs de sprites no cambian bajo una versión publicada |
| Arte oficial para siluetas, sprites para listas | Siluetas grandes y nítidas; sprites livianos en listas |
| Sin sprites en el autocompletado de Siluetas | Se podía comparar el sprite con la sombra |
| Sprites shiny desde PokéSprite/PokeAPI, mismo origen que el normal | Normal y shiny de un Pokémon comparten estilo y tamaño; solo Minior (774) tiene shiny idéntico y se excluye |
| i18n propio (sin librería) | Dos idiomas y pocas necesidades (parámetros, plurales); una dependencia más no compensa |
| Datos de la Pokédex solo en inglés | Traducir nombres cambiaría qué se debe teclear en los juegos; requeriría regenerar datos y alias |
| Movimientos ordenados de comunes a raros | Cada pista nueva es más reveladora |
| Niveles del juego más reciente con set completo | Hoy suele ser Legends: Z-A; el nombre del juego solo se muestra al final (daría una pista de época) |
| FormSubmit para el contacto | Sitio estático sin servidor de correo; requiere activación una vez |
| Modo fácil con récords aparte | Comparar puntuaciones con y sin tolerancia a typos no sería justo |
| Dependencias fijadas exactas | Builds reproducibles; actualizaciones deliberadas |

## 10. Calidad y publicación

Antes de publicar, siempre:

```powershell
npx tsc -b
npm test
npm run build
```

Más una prueba manual en el navegador (`npm run dev`, http://localhost:5173): flujo completo del
juego tocado, modo oscuro, ancho de 375 px y consola sin errores. Al hacer push a `main`, el
workflow publica en ~1 minuto; comprobar con `gh run watch` y abrir la web en vivo.

## 11. Estado del proyecto

**Hecho (noviembre de 2026)**
- 10 juegos publicados, interfaz en inglés y español, página de contacto, inicio con estado del día por juego, compartir en todos.
- 173 tests (lógica, stores, generador del crucigrama, datos), CI con tests + build + deploy.
- Auditoría de dependencias sin vulnerabilidades tras subir a Vite 7 / Vitest 4 / React Router 7.

**Limitaciones conocidas**
- Llantos en Ogg: no suenan en Safari antiguos (el juego muestra un aviso). No probado en iPhone.
- Teclado del crucigrama en móviles: hay un respaldo para teclados virtuales, sin probar en dispositivo.
- La dirección de contacto aparece en el código fuente; FormSubmit ofrece un alias para ocultarla.
- Algunos niveles de Legends: Z-A parecen raros (p. ej. Volt Tackle a nivel 99); son los datos de PokeAPI.
- Estadísticas solo locales: no hay cuentas ni rankings.
- PokeGPS: sin Pokémon de Gen 9 (ni Paldea) por falta de datos en PokeAPI; los nombres de lugares están en inglés. Con
  tipo + lugares, ~15 % de las pistas las cumplen varios Pokémon (de ahí los datos extra); con ellos quedan como mucho 2
  respuestas válidas.
- Shiny Hunt: algunos shiny cambian muy poco de color frente al normal (difíciles de ver); no hay temporizador.
  La URL de la imagen shiny contiene `/shiny/` (visible en las herramientas del navegador).
- Nombres, categorías, entradas de la Pokédex y movimientos siguen en inglés aunque la interfaz esté en español.

**Siguientes pasos propuestos**
- Cuentas (email + Google) y rankings por sección con Supabase, idealmente con validación en
  servidor para que no se puedan falsear puntuaciones.
- Política de privacidad (necesaria para el login con Google).
- Alias de FormSubmit en lugar del correo visible.
