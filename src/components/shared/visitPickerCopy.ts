import { enUS, es } from 'react-day-picker/locale';
import type { Locale } from 'react-day-picker';

export type VisitPickerLanguage = 'en' | 'es';

interface VisitPickerCopy {
  loadError: string;
  chooseTime: string;
  loading: string;
  selectedDay: (date: string) => string;
  arriveAt: (time: string) => string;
  dateLocale: Locale;
}

export const visitPickerCopy: Record<VisitPickerLanguage, VisitPickerCopy> = {
  en: {
    loadError:
      "We couldn't load the available days. Please refresh the page or call us at (408) 620-0252.",
    chooseTime: 'Choose an arrival time',
    loading: 'Loading available days',
    selectedDay: (date) => `Selected ${date}`,
    arriveAt: (time) => `Arrive at ${time}`,
    dateLocale: enUS,
  },
  es: {
    loadError:
      'No pudimos cargar los días disponibles. Actualiza la página o llámanos al (408) 620-0252.',
    chooseTime: 'Elige una hora de llegada',
    loading: 'Cargando los días disponibles',
    selectedDay: (date) => `Seleccionaste ${date}`,
    arriveAt: (time) => `Llegar a las ${time}`,
    dateLocale: es,
  },
};
