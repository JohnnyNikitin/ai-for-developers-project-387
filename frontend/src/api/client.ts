import type {
  AvailabilityWindow,
  Booking,
  BookingTypeSummary,
  CalendarOwnerProfile,
  CreateBookingRequest,
  CreateEventTypeRequest,
  ErrorResponse,
  EventType,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:4010';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    ...init,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const error = body as Partial<ErrorResponse> | undefined;
    throw new ApiError(
      response.status,
      error?.message ?? 'API request failed',
      error?.code,
    );
  }

  return body as T;
}

export const api = {
  getOwnerProfile: () => request<CalendarOwnerProfile>('/admin/owner-profile'),
  listEventTypes: () => request<EventType[]>('/admin/event-types'),
  createEventType: (payload: CreateEventTypeRequest) =>
    request<EventType>('/admin/event-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listUpcomingBookings: () => request<Booking[]>('/admin/bookings/upcoming'),
  listBookingTypes: () => request<BookingTypeSummary[]>('/booking-types'),
  getAvailability: (eventTypeId: string) =>
    request<AvailabilityWindow>(`/booking-types/${encodeURIComponent(eventTypeId)}/availability`),
  createBooking: (payload: CreateBookingRequest) =>
    request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
