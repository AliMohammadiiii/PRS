import { Box, Typography } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { TickCircle, InfoCircle } from 'iconsax-reactjs';
import { appColors } from 'src/theme/colors';
import { FC } from 'react';

type PasswordRequirement = {
  label: string;
  isValid: boolean;
};

type PasswordRequirementsProps = {
  password: string;
};

const PasswordRequirements: FC<PasswordRequirementsProps> = ({ password }) => {
  const requirements: PasswordRequirement[] = [
    {
      label: 'حداقل ۸ کارکتر',
      isValid: password.length >= 8,
    },
    {
      label: 'شامل حروف کوچک و بزرگ انگلیسی',
      isValid: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      label: 'حداقل یک عدد',
      isValid: /\d/.test(password),
    },
    {
      label: 'حداقل یک سمبل ( @ % & * ... )',
      isValid: /[@%&*!?#$^()_+\-=\[\]{};':"\\|,.<>\/]/.test(password),
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1, // 8px gap
        alignItems: 'flex-start', // Flipped: was flex-end, now flex-start
        justifyContent: 'center',
        width: '100%',
        direction: 'ltr', // Flipped: was rtl, now ltr
      }}
    >
      {requirements.map((req, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            flexDirection: 'row', // Normal row
            gap: 3, // 12px gap
            alignItems: 'center',
            justifyContent: index === 3 ? 'center' : 'flex-start', // Flipped: was flex-end, now flex-start
            width: '100%',
            maxWidth: index === 3 ? 339 : 372,
            height: 24,
            direction: 'ltr', // Flipped: was rtl, now ltr
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {req.isValid ? (
              <TickCircle
                size={20}
                color={appColors.primary.main}
                variant="Bold"
              />
            ) : (
              <InfoCircle
                size={20}
                color={defaultColors.neutral.light}
                variant="Outline"
              />
            )}
          </Box>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 700,
              lineHeight: '24.5px',
              height: '20px',
              color: req.isValid
                ? appColors.primary.main // #1dbf98 when met
                : defaultColors.neutral.light, // #91969f when not met
              textAlign: 'left', // Flipped: was right, now left
              fontFamily: "'IRANYekanXFaNum', sans-serif",
              letterSpacing: '0.1px',
              flex: index === 3 ? '1 0 0' : undefined,
              minWidth: index === 3 ? 0 : undefined,
              width: index === 3 ? undefined : 308,
              direction: 'ltr', // Flipped: was rtl, now ltr
            }}
          >
            {req.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default PasswordRequirements;

