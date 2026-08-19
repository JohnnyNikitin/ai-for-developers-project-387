export type EventTypeId = string;
export type BookingId = string;

export interface CalendarOwnerProfile {
  id: string;
  displayName: string;
  email?: string;
}

export interface EventType {
  id: EventTypeId;
  name: string;
  description: string;
  durationMinutes: number;
  createdAt: string;
}

export interface CreateEventTypeRequest {
  id: EventTypeId;
  name: string;
  description: string;
  durationMinutes: number;
}

export interface BookingTypeSummary {
  id: EventTypeId;
  name: string;
  description: string;
  durationMinutes: number;
}

export interface AvailableSlot {
  startsAt: string;
  endsAt: string;
}

export interface AvailabilityWindow {
  eventTypeId: EventTypeId;
  windowStartsOn: string;
  windowEndsOn: string;
  slots: AvailableSlot[];
}

export interface GuestContact {
  name: string;
  email: string;
}

export interface CreateBookingRequest {
  eventTypeId: EventTypeId;
  startsAt: string;
  guest: GuestContact;
}

export type BookingStatus = 'confirmed' | 'canceled';

export interface Booking {
  id: BookingId;
  eventTypeId: EventTypeId;
  eventTypeName: string;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  guest: GuestContact;
  status: BookingStatus;
  createdAt: string;
}

export type ErrorCode =
  | 'event_type_id_already_exists'
  | 'event_type_not_found'
  | 'slot_outside_booking_window'
  | 'slot_not_available'
  | 'validation_failed';

export interface ErrorResponse {
  statusCode: 400 | 404 | 409 | 422;
  code: ErrorCode;
  message: string;
}
