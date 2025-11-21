import { useState, useEffect } from 'react';
import logger from "@/lib/logger";
import { Box, TextField, Button, Typography, Select, MenuItem } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { getLookups } from 'src/services/api/lookups';
import { Lookup } from 'src/types/api/lookups';

type InitialFormData = {
  reportingPeriodId: string;
  title: string;
  description: string;
};

type InitialFormProps = {
  onSubmit: (data: InitialFormData) => void;
};

export default function InitialForm({ onSubmit }: InitialFormProps) {
  const [reportingPeriods, setReportingPeriods] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState<InitialFormData>({
    reportingPeriodId: '',
    title: '',
    description: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch reporting periods (lookups with type REPORTING_PERIOD) for "دوره گزارش"
        const lookups = await getLookups();
        const reportingPeriodLookups = lookups.filter(
          l => l.type === 'REPORTING_PERIOD' && l.is_active
        );
        setReportingPeriods(reportingPeriodLookups);
      } catch (error) {
        logger.error('Error fetching form data:',  error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.reportingPeriodId) {
      onSubmit(formData);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: '12px',
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="neutral.light">در حال بارگذاری...</Typography>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        bgcolor: 'white',
        borderRadius: '12px',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Report Period - Using REPORTING_PERIOD from lookups */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
          دوره گزارش
        </Typography>
        <Select
          value={formData.reportingPeriodId}
          size="small"
          onChange={(e) => setFormData({ ...formData, reportingPeriodId: e.target.value as string })}
          displayEmpty
          height={48}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              borderColor: defaultColors.neutral[300],
              '& .MuiSelect-select': {
                textAlign: 'left',
              },
            },
          }}
        >
          <MenuItem value="" disabled>
            <em style={{ fontStyle: 'normal', color: defaultColors.neutral.light }}>بازه زمانی</em>
          </MenuItem>
          {reportingPeriods.map((period) => (
            <MenuItem key={period.id} value={period.id}>
              {period.title}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* General Information */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
          اطلاعات کلی
        </Typography>

        {/* Title */}
        <TextField
          placeholder="عنوان"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          fullWidth
          height={48}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              borderColor: defaultColors.neutral[300],
              '& input': {
                textAlign: 'left',
              },
            },
          }}
        />

        {/* Description */}
        <TextField
          placeholder="توضیحات"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          multiline
          rows={6}
          fullWidth
          sx={{
            minHeight: '136px',
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              borderColor: defaultColors.neutral[300],
              '& textarea': {
                textAlign: 'left',
              },
            },
          }}
        />
      </Box>

      {/* Buttons */}
      <Box sx={{ display: 'flex', gap: 1.25 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={!formData.reportingPeriodId}
          sx={{
            flex: 1,
            height: '48px',
            bgcolor: '#1dbf98',
            '&:hover': {
              bgcolor: '#1dbf98',
              opacity: 0.9,
            },
            borderRadius: '12px',
            fontWeight: 700,
          }}
        >
          تأیید و ادامه
        </Button>
          <Button
            type="button"
          variant="outlined"
            onClick={() => window.history.back()}
          sx={{
            flex: 1,
            height: '48px',
            borderColor: defaultColors.neutral[300],
            color: defaultColors.neutral[300],
            borderRadius: '12px',
            fontWeight: 700,
            '&:hover': {
              borderColor: defaultColors.neutral[300],
              bgcolor: 'transparent',
            },
          }}
          >
            مرحله قبل
          </Button>
      </Box>
    </Box>
  );
}

