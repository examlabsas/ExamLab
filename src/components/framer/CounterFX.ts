/**
 * CounterFX — componente de Framer.
 *
 * Origen: https://framer.com/m/Counter-FX-uXAx8n.js@oxcRE8poOwrxTcBdsUZ0
 * Código descargado en ./vendor/Counter_FX.oxcRE8.js — el sitio no lo pide a framer.com.
 *
 * Se tipa como ComponentType<any> a propósito: Framer compila sus componentes
 * sin marcar las props como opcionales, aunque todas tienen valor por defecto.
 * Sin este ajuste, TypeScript exigiría pasar las 20 props de cada componente.
 */
import type { ComponentType } from 'react';
import Componente from './vendor/Counter_FX.oxcRE8.js';

export default Componente as ComponentType<any>;
