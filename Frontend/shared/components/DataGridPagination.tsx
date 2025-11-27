import { Dispatch, FC, SetStateAction } from 'react';
import {
  Box,
  MenuItem,
  Pagination,
  Select,
  Typography,
} from 'injast-core/components';
import { LIMIT } from '../constants';
import { updateSearchParams } from '../utils/updateSearchParams';

type DataGridePaginationProps = {
  count: number;
  page: number;
  limit: number;
  onPageChange?: Dispatch<SetStateAction<number>>;
  onLimitChange?: Dispatch<SetStateAction<number>>;
};

const DataGridPagination: FC<DataGridePaginationProps> = ({
  count,
  page,
  limit,
  onPageChange,
  onLimitChange,
}) => {
  return (
    <Box
      id="DataGridePagination"
      sx={{
        width: '90%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Pagination
          count={count}
          page={page}
          onChange={(_e, v) => {
            updateSearchParams({ page: v });
            if (onPageChange) onPageChange(v);
          }}
          variant="outlined"
          shape="rounded"
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'end',
          px: 2,
          gap: 1,
        }}
      >
        <Typography variant="label1">تعداد در صفحه</Typography>
        <Select
          value={limit ?? LIMIT[0]}
          size="small"
          onChange={(e) => {
            const newLimit = Number(e.target.value);
            updateSearchParams({ limit: newLimit });
            if (onLimitChange) onLimitChange(newLimit);
          }}
        >
          {LIMIT.map((el) => (
            <MenuItem key={el} value={el}>{el}</MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
};

export default DataGridPagination;

