import { FormField, RequestFieldValue, PurchaseRequestFieldValueWrite, FormFieldType } from 'src/types/api/prs';

/**
 * Extract the value from a RequestFieldValue based on the field type
 */
export function extractValueFromRequestFieldValue(fieldValue: RequestFieldValue): any {
  if (fieldValue.value_text !== null) return fieldValue.value_text;
  if (fieldValue.value_number !== null) return fieldValue.value_number;
  if (fieldValue.value_bool !== null) return fieldValue.value_bool;
  if (fieldValue.value_date !== null) return fieldValue.value_date;
  if (fieldValue.value_dropdown !== null) return fieldValue.value_dropdown;
  return null;
}

/**
 * Extract initial values from an array of RequestFieldValue objects
 * Returns a record keyed by field.id
 */
export function extractInitialValuesFromFieldValues(
  fieldValues: RequestFieldValue[]
): Record<string, any> {
  const initialValues: Record<string, any> = {};
  
  fieldValues.forEach((fv) => {
    const value = extractValueFromRequestFieldValue(fv);
    if (value !== null && value !== undefined) {
      initialValues[fv.field.id] = value;
    }
  });
  
  return initialValues;
}

/**
 * Build initial values from form fields (using default_value)
 * Returns a record keyed by field.id
 */
export function buildInitialValuesFromFields(fields: FormField[]): Record<string, any> {
  const initialValues: Record<string, any> = {};
  
  fields.forEach((field) => {
    if (field.default_value !== null && field.default_value !== undefined) {
      // Convert default_value based on field type
      switch (field.field_type) {
        case 'NUMBER':
          initialValues[field.id] = parseFloat(field.default_value);
          break;
        case 'BOOLEAN':
          initialValues[field.id] = field.default_value === 'true' || field.default_value === '1';
          break;
        default:
          initialValues[field.id] = field.default_value;
      }
    }
  });
  
  return initialValues;
}

/**
 * Convert form values to API payload format
 * Takes fields array and a record of values keyed by field.id
 */
export function convertFormValuesToApiFormat(
  fields: FormField[],
  fieldValues: Record<string, any>
): PurchaseRequestFieldValueWrite[] {
  return fields
    .filter((field) => field.field_type !== 'FILE_UPLOAD') // FILE_UPLOAD handled via attachments
    .map((field) => {
      const value = fieldValues[field.id];
      const result: PurchaseRequestFieldValueWrite = { field_id: field.id };

      switch (field.field_type) {
        case 'TEXT':
          result.value_text = value || null;
          break;
        case 'NUMBER':
          result.value_number =
            value !== null && value !== undefined && value !== '' ? Number(value) : null;
          break;
        case 'DATE':
          result.value_date = value || null;
          break;
        case 'BOOLEAN':
          result.value_bool = value === true || value === 'true';
          break;
        case 'DROPDOWN':
          result.value_dropdown = value || null;
          break;
        // FILE_UPLOAD is filtered out above
      }

      return result;
    });
}

/**
 * Validate if a field value is empty based on field type
 */
export function isFieldValueEmpty(field: FormField, value: any): boolean {
  if (value === null || value === undefined) return true;

  switch (field.field_type) {
    case 'TEXT':
      return value === '';
    case 'NUMBER':
      return value === null || value === undefined || value === '';
    case 'DATE':
      return value === '' || value === null;
    case 'BOOLEAN':
      // For boolean, false is a valid value, but if required and not explicitly set, it's empty
      // In practice, we'll treat null/undefined as empty
      return value === null || value === undefined;
    case 'DROPDOWN':
      return value === '' || value === null;
    default:
      return false;
  }
}

/**
 * Get the appropriate value field name for a given field type
 */
export function getValueFieldName(fieldType: FormFieldType): string {
  switch (fieldType) {
    case 'TEXT':
      return 'value_text';
    case 'NUMBER':
      return 'value_number';
    case 'DATE':
      return 'value_date';
    case 'BOOLEAN':
      return 'value_bool';
    case 'DROPDOWN':
      return 'value_dropdown';
    case 'FILE_UPLOAD':
      return 'value_file'; // Not used, but for completeness
    default:
      throw new Error(`Unknown field type: ${fieldType}`);
  }
}


