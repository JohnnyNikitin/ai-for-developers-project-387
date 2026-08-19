import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  AppShell,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { CalendarDays, Check, Clock, Mail, Plus, RefreshCw, User } from 'lucide-react';

import { api, ApiError } from './api/client';
import type {
  AvailableSlot,
  Booking,
  BookingTypeSummary,
  CalendarOwnerProfile,
  CreateEventTypeRequest,
  EventType,
} from './api/types';
import { formatDate, formatDateTime, formatTimeRange } from './utils/date';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.code ? `${error.message} (${error.code})` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Не удалось выполнить запрос';
}

function groupSlotsByDate(slots: AvailableSlot[]) {
  return slots.reduce<Record<string, AvailableSlot[]>>((acc, slot) => {
    const key = slot.startsAt.slice(0, 10);
    acc[key] = [...(acc[key] ?? []), slot];
    return acc;
  }, {});
}

export function App() {
  const [activeView, setActiveView] = useState<'guest' | 'admin'>('guest');

  return (
    <AppShell header={{ height: { base: 118, sm: 72 } }} padding="md">
      <AppShell.Header className="app-header">
        <Container size="xl" className="header-inner">
          <Group gap="sm">
            <ThemeIcon size={40} radius="md" variant="light" color="teal">
              <CalendarDays size={22} />
            </ThemeIcon>
            <Box>
              <Title order={2} size="h3">Calendar Booking</Title>
              <Text size="sm" c="dimmed">Бронирование слотов по контракту TypeSpec</Text>
            </Box>
          </Group>
          <SegmentedControl
            value={activeView}
            onChange={(value) => setActiveView(value as 'guest' | 'admin')}
            data={[
              { value: 'guest', label: 'Гость' },
              { value: 'admin', label: 'Админ' },
            ]}
          />
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="xl" py="xl">
          {activeView === 'guest' ? <GuestBookingView /> : <AdminView />}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function GuestBookingView() {
  const [state, setState] = useState<LoadState>('idle');
  const [bookingTypes, setBookingTypes] = useState<BookingTypeSummary[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>();
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot>();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const selectedType = bookingTypes.find((type) => type.id === selectedTypeId);
  const groupedSlots = useMemo(() => groupSlotsByDate(slots), [slots]);

  const loadBookingTypes = useCallback(async () => {
    setState('loading');
    setError(undefined);

    try {
      const types = await api.listBookingTypes();
      setBookingTypes(types);
      setSelectedTypeId((current) => current ?? types[0]?.id);
      setState('ready');
    } catch (caught) {
      setError(errorMessage(caught));
      setState('error');
    }
  }, []);

  useEffect(() => {
    void loadBookingTypes();
  }, [loadBookingTypes]);

  useEffect(() => {
    if (!selectedTypeId) {
      setSlots([]);
      return;
    }

    let isMounted = true;
    setSelectedSlot(undefined);
    setMessage(undefined);

    api
      .getAvailability(selectedTypeId)
      .then((availability) => {
        if (isMounted) {
          setSlots(availability.slots);
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setError(errorMessage(caught));
          setSlots([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTypeId]);

  const submitBooking = async () => {
    if (!selectedTypeId || !selectedSlot) {
      setError('Выберите тип встречи и свободный слот');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const booking = await api.createBooking({
        eventTypeId: selectedTypeId,
        startsAt: selectedSlot.startsAt,
        guest: {
          name: guestName.trim(),
          email: guestEmail.trim(),
        },
      });

      setMessage(`Бронирование подтверждено: ${booking.eventTypeName}, ${formatDateTime(booking.startsAt)}`);
      setGuestName('');
      setGuestEmail('');
      setSelectedSlot(undefined);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Grid gutter="xl">
      <Grid.Col span={{ base: 12, lg: 7 }}>
        <Stack gap="lg">
          <SectionTitle
            icon={<CalendarDays size={20} />}
            title="Выберите формат"
            subtitle="Публичная часть показывает доступные типы встреч и свободные интервалы."
          />

          {state === 'loading' && <CenteredLoader />}
          {error && <Alert color="red" variant="light">{error}</Alert>}

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {bookingTypes.map((type) => (
              <Paper
                key={type.id}
                className="selectable-card"
                data-active={selectedTypeId === type.id}
                p="md"
                withBorder
                onClick={() => setSelectedTypeId(type.id)}
              >
                <Group justify="space-between" align="flex-start" gap="md">
                  <Title order={3} size="h4">{type.name}</Title>
                  <Badge color="grape" variant="light">{type.durationMinutes} мин</Badge>
                </Group>
                <Text mt="sm" c="dimmed" size="sm">{type.description}</Text>
              </Paper>
            ))}
          </SimpleGrid>

          <Paper p="md" withBorder>
            <Group justify="space-between" mb="md">
              <Box>
                <Title order={3} size="h4">Свободные слоты</Title>
                <Text size="sm" c="dimmed">
                  {selectedType ? selectedType.name : 'Сначала выберите формат встречи'}
                </Text>
              </Box>
              <Button
                variant="subtle"
                leftSection={<RefreshCw size={16} />}
                onClick={() => {
                  if (!selectedTypeId) {
                    return;
                  }

                  api
                    .getAvailability(selectedTypeId)
                    .then((data) => setSlots(data.slots))
                    .catch((caught) => setError(errorMessage(caught)));
                }}
                disabled={!selectedTypeId}
              >
                Обновить
              </Button>
            </Group>

            {Object.entries(groupedSlots).length === 0 ? (
              <Text c="dimmed">Нет доступных слотов.</Text>
            ) : (
              <Stack gap="lg">
                {Object.entries(groupedSlots).map(([date, daySlots]) => (
                  <Box key={date}>
                    <Text fw={700} mb="xs" className="date-label">{formatDate(date)}</Text>
                    <Group gap="xs">
                      {daySlots.map((slot) => (
                        <Button
                          key={slot.startsAt}
                          variant={selectedSlot?.startsAt === slot.startsAt ? 'filled' : 'light'}
                          color={selectedSlot?.startsAt === slot.startsAt ? 'teal' : 'gray'}
                          onClick={() => setSelectedSlot(slot)}
                          leftSection={<Clock size={16} />}
                        >
                          {formatTimeRange(slot.startsAt, slot.endsAt)}
                        </Button>
                      ))}
                    </Group>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, lg: 5 }}>
        <Paper p="lg" withBorder className="sticky-panel">
          <Stack gap="md">
            <SectionTitle
              icon={<Check size={20} />}
              title="Данные гостя"
              subtitle="Запись создается без регистрации, только с контактами гостя."
            />
            {message && <Alert color="teal" variant="light">{message}</Alert>}
            <TextInput
              label="Имя"
              placeholder="Анна Иванова"
              leftSection={<User size={16} />}
              value={guestName}
              onChange={(event) => setGuestName(event.currentTarget.value)}
              required
            />
            <TextInput
              label="Email"
              placeholder="anna@example.com"
              leftSection={<Mail size={16} />}
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.currentTarget.value)}
              required
            />
            <Divider />
            <Box className="summary-box">
              <Text size="sm" c="dimmed">Выбранный слот</Text>
              <Text fw={700}>
                {selectedSlot ? formatDateTime(selectedSlot.startsAt) : 'Не выбран'}
              </Text>
            </Box>
            <Button
              size="md"
              color="teal"
              leftSection={<Check size={18} />}
              loading={submitting}
              disabled={!guestName.trim() || !guestEmail.trim() || !selectedSlot}
              onClick={submitBooking}
            >
              Забронировать
            </Button>
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}

function AdminView() {
  const [owner, setOwner] = useState<CalendarOwnerProfile>();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string>();

  const loadAdminData = useCallback(async () => {
    setState('loading');
    setError(undefined);

    try {
      const [profile, types, upcoming] = await Promise.all([
        api.getOwnerProfile(),
        api.listEventTypes(),
        api.listUpcomingBookings(),
      ]);

      setOwner(profile);
      setEventTypes(types);
      setBookings(upcoming);
      setState('ready');
    } catch (caught) {
      setError(errorMessage(caught));
      setState('error');
    }
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleCreated = (eventType: EventType) => {
    setEventTypes((current) => [eventType, ...current.filter((item) => item.id !== eventType.id)]);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <SectionTitle
          icon={<User size={20} />}
          title="Админка календаря"
          subtitle={owner ? `${owner.displayName}${owner.email ? `, ${owner.email}` : ''}` : 'Профиль владельца загружается'}
        />
        <Button variant="light" leftSection={<RefreshCw size={16} />} onClick={loadAdminData}>
          Обновить
        </Button>
      </Group>

      {state === 'loading' && <CenteredLoader />}
      {error && <Alert color="red" variant="light">{error}</Alert>}

      <Tabs defaultValue="events" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="events" leftSection={<CalendarDays size={16} />}>Типы встреч</Tabs.Tab>
          <Tabs.Tab value="bookings" leftSection={<Clock size={16} />}>Ближайшие записи</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="events" pt="lg">
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <CreateEventTypeForm onCreated={handleCreated} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {eventTypes.map((type) => (
                  <Paper key={type.id} p="md" withBorder>
                    <Group justify="space-between" align="flex-start">
                      <Box>
                        <Title order={3} size="h4">{type.name}</Title>
                        <Text size="xs" c="dimmed">ID: {type.id}</Text>
                      </Box>
                      <Badge color="indigo" variant="light">{type.durationMinutes} мин</Badge>
                    </Group>
                    <Text mt="sm" size="sm" c="dimmed">{type.description}</Text>
                    <Text mt="md" size="xs" c="dimmed">Создано: {formatDateTime(type.createdAt)}</Text>
                  </Paper>
                ))}
              </SimpleGrid>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="bookings" pt="lg">
          <Stack gap="sm">
            {bookings.map((booking) => (
              <Paper key={booking.id} p="md" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Title order={3} size="h4">{booking.eventTypeName}</Title>
                    <Text size="sm" c="dimmed">{formatDateTime(booking.startsAt)} · {booking.durationMinutes} мин</Text>
                  </Box>
                  <Badge color={booking.status === 'confirmed' ? 'teal' : 'red'} variant="light">
                    {booking.status}
                  </Badge>
                </Group>
                <Group mt="md" gap="xl">
                  <Text size="sm"><strong>{booking.guest.name}</strong></Text>
                  <Text size="sm" c="dimmed">{booking.guest.email}</Text>
                </Group>
              </Paper>
            ))}
            {bookings.length === 0 && <Text c="dimmed">Ближайших записей пока нет.</Text>}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

interface CreateEventTypeFormProps {
  onCreated: (eventType: EventType) => void;
}

function CreateEventTypeForm({ onCreated }: CreateEventTypeFormProps) {
  const [form, setForm] = useState<CreateEventTypeRequest>({
    id: '',
    name: '',
    description: '',
    durationMinutes: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const setField = <Key extends keyof CreateEventTypeRequest>(
    key: Key,
    value: CreateEventTypeRequest[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const eventType = await api.createEventType({
        ...form,
        id: form.id.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
      });

      onCreated(eventType);
      setMessage(`Тип встречи "${eventType.name}" создан`);
      setForm({ id: '', name: '', description: '', durationMinutes: 30 });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper p="lg" withBorder className="sticky-panel">
      <Stack gap="md">
        <SectionTitle
          icon={<Plus size={20} />}
          title="Новый тип встречи"
          subtitle="ID задается владельцем и должен быть уникальным."
        />
        {error && <Alert color="red" variant="light">{error}</Alert>}
        {message && <Alert color="teal" variant="light">{message}</Alert>}
        <TextInput
          label="ID"
          placeholder="intro-call"
          value={form.id}
          onChange={(event) => setField('id', event.currentTarget.value)}
          required
        />
        <TextInput
          label="Название"
          placeholder="Первичная консультация"
          value={form.name}
          onChange={(event) => setField('name', event.currentTarget.value)}
          required
        />
        <Textarea
          label="Описание"
          placeholder="Коротко опишите, что получит гость на встрече"
          value={form.description}
          onChange={(event) => setField('description', event.currentTarget.value)}
          minRows={3}
          required
        />
        <NumberInput
          label="Длительность, минут"
          min={1}
          step={5}
          value={form.durationMinutes}
          onChange={(value) => setField('durationMinutes', Number(value) || 1)}
          required
        />
        <Button
          color="teal"
          leftSection={<Plus size={18} />}
          loading={submitting}
          disabled={!form.id.trim() || !form.name.trim() || !form.description.trim()}
          onClick={submit}
        >
          Создать
        </Button>
      </Stack>
    </Paper>
  );
}

interface SectionTitleProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
}

function SectionTitle({ icon, title, subtitle }: SectionTitleProps) {
  return (
    <Group align="flex-start" gap="sm">
      <ThemeIcon size={36} radius="md" color="teal" variant="light">
        {icon}
      </ThemeIcon>
      <Box>
        <Title order={2} size="h3">{title}</Title>
        <Text size="sm" c="dimmed">{subtitle}</Text>
      </Box>
    </Group>
  );
}

function CenteredLoader() {
  return (
    <Group justify="center" p="xl">
      <Loader color="teal" />
    </Group>
  );
}
