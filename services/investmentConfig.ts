import Decimal from 'decimal.js';

/**
 * Capital con el que empezaste (4 de agosto de 2026). Es la base de todos los %:
 * - % total = total neto acumulado ÷ este capital.
 * - % de cada mes = neto del mes ÷ (este capital + neto acumulado de los meses anteriores),
 *   o sea el cierre mensual va sumando lo ganado/perdido a la base del mes siguiente.
 * Los aportes/retiros posteriores se registran desde la app (Balance mensual → Capital y aportes).
 */
export const INITIAL_CAPITAL = new Decimal(11608);
