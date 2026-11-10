export type EventStatus = 'scheduled' | 'inprogress' | 'closed';

export type EventType =
  | 'Deportivo'
  | 'Cultural'
  | 'Corporativo'
  | 'Educativo'
  | 'Musical / Concierto'
  | 'Religioso'
  | 'Político'
  | 'Privado / Social';

export interface EventDTO {
  id: string;
  name: string;
  type: EventType;
  org?: string;
  responsible?: string;
  attendees: number;
  address: string;
  dateFrom: string;
  timeFrom: string;
  dateTo: string;
  timeTo: string;
  units: string[];
  status: EventStatus;
}
