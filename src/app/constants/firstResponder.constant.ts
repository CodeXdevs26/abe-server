export const FIRST_RESPONDER_TYPES = [
  "police_officer",
  "firefighter",
  "ems_paramedic",
  "active_military",
  "veteran",
  "nurse",
  "doctor",
] as const;

export const FIRST_RESPONDER_STATUSES = [
  "not_requested",
  "pending",
  "approved",
  "rejected",
] as const;

export type TFirstResponderType = (typeof FIRST_RESPONDER_TYPES)[number];
export type TFirstResponderStatus = (typeof FIRST_RESPONDER_STATUSES)[number];

export const DEFAULT_FIRST_RESPONDER_DISCOUNTS: Record<
  TFirstResponderType,
  number
> = {
  police_officer: 20,
  firefighter: 20,
  ems_paramedic: 20,
  active_military: 20,
  veteran: 15,
  nurse: 15,
  doctor: 10,
};
