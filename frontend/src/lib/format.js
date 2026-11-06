import i18n from '../i18n';

// One date format for the whole app: "5 Nov 2026". The browser default gave
// M/D/YYYY, which reads as May 11 to half the world.
// English, but day-first: the browser default is M/D/YYYY, which reads as May 11.
const locale = () => {
  const language = i18n.language || 'en';
  return language.startsWith('en') ? 'en-GB' : language;
};

const dateFormatter = () => new Intl.DateTimeFormat(locale(), {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = () => new Intl.DateTimeFormat(locale(), {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter().format(date);
};

export const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateTimeFormatter().format(date);
};

// Database ids are for machines; six characters is enough to tell two rows apart.
export const shortId = (value) => (value ? String(value).slice(-6).toUpperCase() : '');

// A missing method is a dash, not the word "daily".
export const formatMethod = (t, method) => (method ? t(`daily.${method}`) : '—');
