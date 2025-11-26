import React from 'react';
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persianCalendar from 'react-date-object/calendars/persian';
import persianLocale from 'react-date-object/locales/persian_fa';
import 'react-multi-date-picker/styles/colors/teal.css';
import type { TextFieldProps } from 'injast-core/components';
import { TextField } from 'injast-core/components';

interface PersianDatePickerProps extends Omit<TextFieldProps, 'value' | 'onChange' | 'type'> {
  value?: string | null;
  onChange?: (value: string | null) => void;
  calendar?: 'persian' | 'gregorian';
}

export function PersianDatePicker({
  value,
  onChange,
  calendar = 'persian',
  ...textFieldProps
}: PersianDatePickerProps) {

  const handleChange = (date: DateObject | DateObject[] | null) => {
    if (!onChange) return;
    
    if (!date || (Array.isArray(date) && date.length === 0)) {
      onChange(null);
      return;
    }

    const dateObj = Array.isArray(date) ? date[0] : date;
    if (!dateObj) {
      onChange(null);
      return;
    }

    // Convert to ISO string format (YYYY-MM-DD) for backend compatibility
    const gregorianDate = dateObj.toDate();
    const isoString = gregorianDate.toISOString().split('T')[0];
    onChange(isoString);
  };

  // Convert ISO string (YYYY-MM-DD) to DateObject for display
  const getDateValue = () => {
    if (!value) return undefined;
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return undefined;
      return new DateObject(date);
    } catch {
      return undefined;
    }
  };

  return (
    <DatePicker
      value={getDateValue()}
      onChange={handleChange}
      calendar={calendar === 'persian' ? persianCalendar : undefined}
      locale={calendar === 'persian' ? persianLocale : undefined}
      calendarPosition="bottom-center"
      render={(value, openCalendar) => {
        return (
          <TextField
            {...textFieldProps}
            value={value || ''}
            onClick={openCalendar}
            onFocus={openCalendar}
            readOnly
          />
        );
      }}
    />
  );
}

