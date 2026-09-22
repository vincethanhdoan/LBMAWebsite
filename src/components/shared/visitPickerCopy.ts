export type VisitPickerLanguage = 'en' | 'es';

interface VisitPickerCopy {
  loadError: string;
  // The calendar chunk itself failed to arrive (not the dates fetch, which
  // uses `loadError` above and can be retried). A failed dynamic import is
  // cached by the browser and never refetches, so this has no retry button.
  chunkLoadError: string;
  retry: string;
  chooseTime: string;
  loading: string;
  selectedDay: (date: string) => string;
}

export const visitPickerCopy: Record<VisitPickerLanguage, VisitPickerCopy> = {
  en: {
    loadError:
      'We could not load the available days. Please try again, or call us at (408) 620-0252 and we will book your visit for you.',
    chunkLoadError:
      'We could not load the calendar. Please call us at (408) 620-0252 and we will book your visit for you.',
    retry: 'Try again',
    chooseTime: 'Choose an arrival time',
    loading: 'Loading available days',
    selectedDay: (date) => `Selected ${date}`,
  },
  es: {
    loadError:
      'No pudimos cargar los días disponibles. Inténtalo de nuevo, o llámanos al (408) 620-0252 y nosotros reservamos tu visita.',
    chunkLoadError:
      'No pudimos cargar el calendario. Llámanos al (408) 620-0252 y nosotros reservamos tu visita.',
    retry: 'Intentar de nuevo',
    chooseTime: 'Elige una hora de llegada',
    loading: 'Cargando los días disponibles',
    selectedDay: (date) => `Seleccionaste ${date}`,
  },
};
