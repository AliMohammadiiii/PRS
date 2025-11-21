import { TableRow, TableCell, Box } from "@mui/material";
import { ActionButton } from "./ActionButton";
import { StatusBadge } from "./StatusBadge";

export type FieldData = {
  id: string;
  reportTitle: string;
  titleCode: string;
  groups: string;
  fields: string;
  titleStatus: "active" | "inactive";
};

type FieldTableRowProps = {
  data: FieldData;
  onEdit?: (id: string) => void;
  onAddField?: (id: string) => void;
};

export function FieldTableRow({ data, onEdit, onAddField }: FieldTableRowProps) {
  return (
    <TableRow
      sx={{
        "&:hover": { bgcolor: "action.hover" },
        transition: "background-color 0.2s",
      }}
    >
      <TableCell align="center">
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
          <ActionButton variant="edit" onClick={() => onEdit?.(data.id)} />
        </Box>
      </TableCell>
      <TableCell align="center">
        <ActionButton variant="add" onClick={() => onAddField?.(data.id)} />
      </TableCell>
      <TableCell align="right">
        <StatusBadge status={data.titleStatus} />
      </TableCell>
      <TableCell align="right" sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
        {data.fields || "ـــ"}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
        {data.groups}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
        {data.titleCode}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
        {data.reportTitle}
      </TableCell>
    </TableRow>
  );
}
