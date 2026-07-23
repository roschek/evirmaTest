import { useState } from 'react';
import { Box, Button, Stack, TextField, Alert } from '@mui/material';
import { useLazyGetCardQuery, getCardErrorMessage, type ProductCard } from '@/entities/product-card';

export const SearchCard = ({ onFound }: { onFound: (card: ProductCard) => void }) => {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [trigger, { isFetching, error }] = useLazyGetCardQuery();

  const submit = async () => {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    if (!trimmed || Number.isNaN(parsed) || parsed <= 0) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    // Explicitly re-notify the parent on every submit -- even for an nm that's
    // already cached -- instead of watching `data` for changes. Watching `data`
    // meant re-submitting the same article after closing the modal did nothing,
    // since the cached data never changed reference.
    const result = await trigger(parsed);
    if (result.data) onFound(result.data);
  };

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
        {error && <Alert severity="error">{getCardErrorMessage(error)}</Alert>}
      </Stack>
    </Box>
  );
};
