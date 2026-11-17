import { Condition, DealStatus, DealType, ListingStatus, Province } from "@prisma/client";

export const PROVINCE_LABELS: Record<Province, string> = {
  CABA: "CABA",
  BUENOS_AIRES: "Buenos Aires",
  CATAMARCA: "Catamarca",
  CHACO: "Chaco",
  CHUBUT: "Chubut",
  CORDOBA: "Córdoba",
  CORRIENTES: "Corrientes",
  ENTRE_RIOS: "Entre Ríos",
  FORMOSA: "Formosa",
  JUJUY: "Jujuy",
  LA_PAMPA: "La Pampa",
  LA_RIOJA: "La Rioja",
  MENDOZA: "Mendoza",
  MISIONES: "Misiones",
  NEUQUEN: "Neuquén",
  RIO_NEGRO: "Río Negro",
  SALTA: "Salta",
  SAN_JUAN: "San Juan",
  SAN_LUIS: "San Luis",
  SANTA_CRUZ: "Santa Cruz",
  SANTA_FE: "Santa Fe",
  SANTIAGO_DEL_ESTERO: "Santiago del Estero",
  TIERRA_DEL_FUEGO: "Tierra del Fuego",
  TUCUMAN: "Tucumán",
};

export const PROVINCE_LIST = Object.entries(PROVINCE_LABELS).map(([value, label]) => ({
  value: value as Province,
  label,
}));

export const CONDITION_LABELS: Record<Condition, string> = {
  NUEVO: "Nuevo",
  COMO_NUEVO: "Como nuevo",
  USADO: "Usado",
  PARA_REPARAR: "Para reparar",
};

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  VENTA: "Venta",
  TRUEQUE: "Trueque",
  AMBOS: "Venta o Trueque",
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  ACTIVA: "Activa",
  RESERVADA: "Reservada",
  VENDIDA: "Vendida",
  PAUSADA: "Pausada",
  ELIMINADA: "Eliminada",
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  PENDIENTE_CONFIRMACION: "Pendiente de confirmación",
  ACORDADA: "Acordada",
  COMISION_PAGADA: "Comisión pagada",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
};
