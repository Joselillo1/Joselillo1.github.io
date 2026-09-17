# Inversiones — control de inversiones en bolsa

App móvil (React Native + Expo) para llevar el control manual de tus compras y ventas
de acciones. Todos los datos financieros se guardan **localmente en el dispositivo**
(SQLite); no hay backend ni servidor externo.

## Requisitos

- [Node.js](https://nodejs.org) 20 o superior (ya instalado en esta máquina: `node -v`).
- La app **Expo Go** en tu iPhone (gratis, App Store). No necesitas Mac ni Xcode para
  probarla en desarrollo.
- Tu computadora y tu iPhone conectados a la **misma red Wi‑Fi**.

## Cómo correrla

Desde la carpeta del proyecto:

```bash
npm start
```

Esto abre el bundler de Expo y muestra un código QR en la terminal.

1. Abre la app **Expo Go** en tu iPhone.
2. Escanea el código QR (desde la app Cámara de iOS o desde el propio Expo Go).
3. La app se compila y se abre automáticamente en tu teléfono.

Cada vez que guardes un cambio en el código, la app se recarga sola en el iPhone
(Fast Refresh).

Otros comandos útiles:

```bash
npm run android   # abrir en un emulador/dispositivo Android
npm run web       # abrir la versión web (limitada: SQLite/Face ID no aplican)
npm test          # correr los tests unitarios (motor de cálculo y validaciones)
```

## Arquitectura

```
inversiones-app/
├── data/stocks.json          # catálogo de ~505 acciones + 200 criptomonedas (símbolo, nombre, sector, bolsa)
├── models/                   # tipos de datos (Transaction, StockCatalogItem, PositionSummary)
├── services/                 # lógica de negocio pura, sin UI
│   ├── database.ts               # apertura de SQLite y esquema
│   ├── transactionRepository.ts  # CRUD de transacciones sobre SQLite
│   ├── stockCatalogService.ts    # carga/búsqueda del catálogo (en memoria)
│   ├── portfolioCalculations.ts  # costo promedio, P&L, rentabilidad
│   ├── transactionValidation.ts  # reglas de validación de una transacción
│   ├── priceQuoteProvider.ts     # contrato para un futuro proveedor de precios en vivo
│   ├── biometricAuthService.ts   # Face ID / Touch ID
│   ├── backupService.ts          # exportar/importar respaldo (JSON/CSV)
│   ├── settingsService.ts        # preferencias simples (AsyncStorage)
│   └── format.ts                 # formato de moneda/porcentaje (Intl.NumberFormat)
├── hooks/                    # puente entre servicios y pantallas (React Context + hooks)
├── navigation/                # React Navigation (stack raíz + tabs)
├── screens/                   # una pantalla por archivo
├── components/                 # piezas de UI reutilizables, agrupadas por pantalla
└── __tests__/                  # tests unitarios (Jest) del motor de cálculo y validaciones
```

**Por qué el catálogo no vive en SQLite:** las acciones y criptomonedas son datos de
referencia de solo lectura, no datos del usuario. Los tickers de cripto usan el sufijo
`-USD` (ej. `BTC-USD`) para no chocar con tickers de acciones reales. Se cargan en
memoria desde `data/stocks.json` y se
resuelven por símbolo cuando se muestra una transacción. Lo único que persiste en
SQLite es lo que tú generas: las transacciones.

**Por qué los montos se guardan como texto:** SQLite no tiene un tipo `decimal`
nativo. `quantity`, `price_per_share` y `fees` se guardan como el `.toString()` de un
`Decimal` (`decimal.js`) y se reconstruyen al leer, para no perder precisión con
redondeos de punto flotante — nunca se usa `number` para dinero.

**Costo promedio y ganancia realizada:** se calculan con el método de costo promedio
ponderado (no FIFO/LIFO). Cada compra actualiza el promedio; cada venta descuenta la
comisión del producto de la venta y compara contra el costo promedio vigente en ese
momento. Ver `services/portfolioCalculations.ts` y sus tests en `__tests__/`.

## Seguridad y privacidad

- Los datos viven solo en el dispositivo (SQLite + AsyncStorage para preferencias).
  Nada se envía a ningún servidor.
- La app pide Face ID/Touch ID al abrirse (se puede desactivar en Ajustes) y vuelve a
  bloquearse cada vez que pasa a segundo plano.
- Ajustes → Respaldo permite exportar todas las transacciones a JSON o CSV (se
  comparten con el selector nativo de iOS, para guardarlas donde tú decidas) y
  restaurarlas después con "Importar respaldo".
- Ajustes → Zona de riesgo permite borrar permanentemente todos los datos, con doble
  confirmación.

## Conectar precios en tiempo real (opcional, a futuro)

`services/priceQuoteProvider.ts` define el contrato `PriceQuoteProvider` con un único
método `getCurrentPrice(symbol)`. Hoy solo existe `NullPriceProvider`, que mantiene la
app 100% offline. Para conectar Finnhub, Alpha Vantage, etc.: implementa esa interfaz
en un nuevo archivo y reemplaza `activePriceProvider` — el resto de la app (cálculos de
ganancia no realizada y rentabilidad) ya está preparado para recibir ese precio.

## Generar un build standalone (más adelante, opcional)

Mientras desarrollas, Expo Go es suficiente y no requiere ninguna cuenta. Si más
adelante quieres una instalación permanente (sin depender de Expo Go) o publicar en la
App Store, se usa **EAS Build**, el servicio de compilación en la nube de Expo:

1. Crea una cuenta gratuita en [expo.dev](https://expo.dev) (no requiere Apple
   Developer todavía).
2. `npm install -g eas-cli` y luego `eas login`.
3. `eas build:configure` en la carpeta del proyecto.
4. `eas build --platform ios --profile preview` genera un `.ipa` instalable vía enlace
   (por ejemplo con TestFlight o instalación ad-hoc).

Para ese paso 4 sí necesitarás una cuenta de **Apple Developer** (de pago, ~99
USD/año) si quieres instalar el build en un iPhone físico fuera de Expo Go o
publicarlo en la App Store. Para seguir probando en desarrollo con Expo Go, ninguna
cuenta de Apple es necesaria.
