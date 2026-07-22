import { useEffect, useState } from 'react';
import { Box, Button, Stack, TextField, Alert } from '@mui/material';
import { useGetCardQuery, type ProductCard } from '@/entities/product-card';

export const SearchCard = ({ onFound }: { onFound: (card: ProductCard) => void }) => {
  const [value, setValue] = useState('');
  const [nm, setNm] = useState<number | null>(null);
  const { data, error, isFetching } = useGetCardQuery(nm as number, { skip: nm === null });

  useEffect(() => {
    if (data) onFound(data);
  }, [data, onFound]);

  const submit = () => {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    if (!trimmed || Number.isNaN(parsed) || parsed <= 0) {
      setNm(null);
      return;
    }
    setNm(parsed);
  };

  const trimmed = value.trim();
  const invalid = trimmed !== '' && (Number.isNaN(Number(trimmed)) || Number(trimmed) <= 0);

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8 }}>
      <Stack spacing={2}>
        <TextField
          label="Артикул"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          error={invalid}
          helperText={invalid ? 'Введите числовой артикул' : ' '}
        />
        <Button variant="contained" onClick={submit} disabled={isFetching}>
          {isFetching ? 'Загрузка…' : 'Скачать фото'}
        </Button>
        {error && (
          <Alert severity="error">
            Не удалось получить карточку. Возможно, нужен прокси (CORS).
          </Alert>
        )}
      </Stack>
    </Box>
  );
};
