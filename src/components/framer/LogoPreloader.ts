/**
 * LogoPreloader — componente de Framer.
 *
 * Origen: https://framer.com/m/LogoPreloader-LQx6.js@GZIcrs0EE9lUY3jQTNPV
 * Código descargado en ./vendor/LogoPreloader.GZIcrs.js — el sitio no lo pide a framer.com.
 *
 * Se tipa como ComponentType<any> a propósito: Framer compila sus componentes
 * sin marcar las props como opcionales, aunque todas tienen valor por defecto.
 * Sin este ajuste, TypeScript exigiría pasar las 20 props de cada componente.
 */
import type { ComponentType } from 'react';
import Componente from './vendor/LogoPreloader.GZIcrs.js';

export default Componente as ComponentType<any>;
