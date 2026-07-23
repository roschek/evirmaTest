import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

const isFetchBaseQueryError = (error: unknown): error is FetchBaseQueryError =>
  typeof error === 'object' && error !== null && 'status' in error;

// Turns whatever RTK Query actually returned into a message that reflects the
// real cause instead of a single guessed string shown for every failure.
export const getCardErrorMessage = (error: FetchBaseQueryError | SerializedError | undefined): string => {
  if (!error) return '';

  if (isFetchBaseQueryError(error)) {
    if (error.status === 'FETCH_ERROR') {
      return `Не удалось подключиться к WB API — возможно, блокировка CORS (${error.error}).`;
    }
    if (error.status === 'PARSING_ERROR') {
      return `WB API вернул неожиданный формат ответа (${error.error}).`;
    }
    if (error.status === 'CUSTOM_ERROR') {
      return error.error;
    }
    return `WB API вернул ошибку ${error.status}.`;
  }

  if (error.message === 'Card not found') return 'Карточка с таким артикулом не найдена.';
  return error.message ? `Не удалось получить карточку: ${error.message}` : 'Не удалось получить карточку.';
};
