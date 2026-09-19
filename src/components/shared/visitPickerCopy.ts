export type VisitPickerLanguage = 'en' | 'es';

interface VisitPickerCopy {
  loadError: string;
  retry: string;
  chooseTime: string;
  loading: string;
  selectedDay: (date: string) => string;
  arriveAt: (time: string) => string;
}

export const visitPickerCopy: Record<VisitPickerLanguage, VisitPickerCopy> = {
  en: {
    loadError:
      'We could not load the available days. Please try again, or call us at (408) 620-0252 and we will book your visit for you.',
    retry: 'Try again',
    chooseTime: 'Choose an arrival time',
    loading: 'Loading available days',
    selectedDay: (date) => `Selected ${date}`,
    arriveAt: (time) => `Arrive at ${time}`,
  },
  es: {
    loadError:
      'No pudimos cargar los días disponibles. Inténtalo de nuevo, o llámanos al (408) 620-0252 y nosotros reservamos tu visita.',
    retry: 'Intentar de nuevo',
    chooseTime: 'Elige una hora de llegada',
    loading: 'Cargando los días disponibles',
    selectedDay: (date) => `Seleccionaste ${date}`,
    arriveAt: (time) => `Llegar a las ${time}`,
  },
};
