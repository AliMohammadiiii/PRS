import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
} from "@mui/material";
import { FieldTableRow, type FieldData } from "./FieldTableRow";

type FieldTableProps = {
  data: FieldData[];
  onEdit?: (id: string) => void;
  onAddField?: (id: string) => void;
};

export function FieldTable({ data, onEdit, onAddField }: FieldTableProps) {
  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflowX: "auto",
      }}
    >
      <Table sx={{ minWidth: 650 }} aria-label="field table">
        <TableHead>
          <TableRow sx={{ bgcolor: "grey.100" }}>
            <TableCell
              align="center"
              sx={{
                minWidth: 60,
                fontWeight: 500,
                fontSize: "0.875rem",
                color: "text.secondary",
              }}
            >
              ویرایش
            </TableCell>
            <TableCell
              align="center"
              sx={{
                minWidth: 82,
                fontWeight: 500,
                fontSize: "0.875rem",
                color: "text.secondary",
              }}
            >
              تعریف فیلد
            </TableCell>
            <TableCell
              align="right"
              sx={{
                minWidth: 126,
                fontWeight: 500,
                fontSize: "0.875rem",
                color: "text.secondary",
              }}
            >
              وضعیت عنوان
            </TableCell>
            <TableCell
              align="right"
              sx={{
                fontWeight: 500,
                fontSize: "0.875rem",
                color: "text.secondary",
              }}
            >
              فیلدها
            </TableCell>
            <TableCell
              align="right"
              sx={{
                fontWeight: 500,
                fontSize: "0.875rem",
                color: "text.secondary",
              }}
            >
              گروه‌ها
            </TableCell>
            <TableCell
              align="right"
              sx={{
                minWidth: 109,
                fontWeight: 500,
                fontSize: "0.875rem",
                color: "text.secondary",
              }}
            >
              کد عنوان
            </TableCell>
            <TableCell
              align="right"
              sx={{
                minWidth: 214,
                fontWeight: 500,
                fontSize: "0.875rem",
                color: "text.secondary",
              }}
            >
              عنوان گزارش
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <FieldTableRow
              key={row.id}
              data={row}
              onEdit={onEdit}
              onAddField={onAddField}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
