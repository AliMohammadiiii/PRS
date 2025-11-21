import { TableRow, TableCell, Box } from '@mui/material';
import { ActionButton } from '@/components/FieldTable/ActionButton';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';
import { Group } from 'src/types/groups';

type GroupsTableRowProps = {
  data: Group;
  onEdit?: (id: string) => void;
  isEven?: boolean;
};

export function GroupsTableRow({ data, onEdit, isEven = false }: GroupsTableRowProps) {
  return (
    <TableRow
      sx={{
        backgroundColor: isEven ? '#fafbfc' : 'transparent',
        '&:hover': {
          backgroundColor: '#f4f6fa',
        },
        transition: 'background-color 0.2s',
        '& .MuiTableCell-root': {
          borderBottom: '1px solid #e5e7ea',
          fontSize: '14px',
        },
      }}
    >
      <TableCell
        align="right"
        sx={{
          px: 2,
          fontSize: '14px',
          fontWeight: 500,
          color: 'text.secondary',
        }}
      >
        {data.title}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          minWidth: 124,
          px: 2,
          fontSize: '14px',
          fontWeight: 500,
          color: 'text.secondary',
        }}
      >
        {data.code}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          minWidth: 472,
          px: 2,
          fontSize: '14px',
          fontWeight: 500,
          color: 'text.disabled',
        }}
      >
        {data.description}
      </TableCell>
      <TableCell align="right" sx={{ minWidth: 155, px: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <StatusBadge status={data.status} />
        </Box>
      </TableCell>
      <TableCell align="center" sx={{ minWidth: 128, px: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ActionButton variant="edit" onClick={() => onEdit?.(data.id)} />
        </Box>
      </TableCell>
    </TableRow>
  );
}

