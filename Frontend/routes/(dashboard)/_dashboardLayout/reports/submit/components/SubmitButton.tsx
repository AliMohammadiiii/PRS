import { useState } from 'react';
import { Button } from 'injast-core/components';
import { submitAllDrafts } from 'src/services/api/workflow';
import logger from '@/lib/logger';

type SubmitButtonProps = {
  companyId: string;
  financialPeriodId: string;
  reportingPeriodId: string;
  onSuccess?: () => void;
  disabled?: boolean;
};

export default function SubmitButton({ 
  companyId, 
  financialPeriodId, 
  reportingPeriodId, 
  onSuccess,
  disabled 
}: SubmitButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || loading) return;
    
    // Confirm before submitting
    const confirmed = window.confirm('آیا از ارسال گزارش اطمینان دارید؟');
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const result = await submitAllDrafts({
        company_id: companyId,
        financial_period_id: financialPeriodId,
        reporting_period_id: reportingPeriodId,
      });
      
      logger.info(`Successfully submitted ${result.count} submission(s)`);
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Reload page or show success message
        window.location.reload();
      }
    } catch (error) {
      logger.error('Error submitting submissions',  error);
      // Show error message to user
      alert('خطا در ارسال گزارش. لطفا دوباره تلاش کنید.');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      variant="contained"
      loading={loading}
      sx={{
        width: '157px',
        height: '46px',
        backgroundColor: '#1dbf98',
        color: '#ffffff',
        fontFamily: 'IRANYekanXFaNum:Bold, sans-serif',
        fontWeight: 'bold',
        fontSize: '14px',
        lineHeight: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        '&:hover': {
          backgroundColor: '#1dbf98',
        },
        '&:disabled': {
          backgroundColor: '#d6d9df',
          color: '#91969f',
        },
      }}
    >
      ثبت و ارسال
    </Button>
  );
}

