import { FC, Fragment, useEffect, useState } from 'react';
import { Box, Divider, Typography } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { updateSearchParams } from 'src/shared/utils/updateSearchParams';

type OperationsTabsProps = {
  activeTab: 'organization' | 'users';
};

const OperationsTabs: FC<OperationsTabsProps> = ({ activeTab }) => {
  const [tabValue, setTabValue] = useState<string>(activeTab);

  useEffect(() => {
    setTabValue(activeTab);
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setTabValue(value);
    updateSearchParams({
      active_tab: value,
    });
  };

  const tabs = [
    { label: 'تعریف کاربران', value: 'users' },
    { label: 'تعریف سازمان', value: 'organization' },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'white',
        borderRadius: 2,
        overflow: 'hidden',
        height: 55,
      }}
    >
      {tabs.map((tab, index) => (
        <Fragment key={tab.value}>
          <Box
            sx={{
              width: '170px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pt: 2,
              pb: 0,
              position: 'relative',
            }}
          >
            <Typography
              onClick={() => handleTabChange(tab.value)}
              color={tab.value === tabValue ? 'neutral.secondary' : 'neutral.light'}
              sx={{
                fontSize: '16px',
                fontWeight: tab.value === tabValue ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                '&:focus, &:active': { outline: 'none' },
              }}
            >
              {tab.label}
            </Typography>
            {tab.value === tabValue && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: '35%',
                  right: '35%',
                  height: '3px',
                  bgcolor: defaultColors.neutral.secondary,
                  borderRadius: '8px',
                }}
              />
            )}
          </Box>
          {index < tabs.length - 1 && (
            <Box
              sx={{
                width: '1px',
                height: '19px',
                bgcolor: defaultColors.neutral[300],
              }}
            />
          )}
        </Fragment>
      ))}
    </Box>
  );
};

export default OperationsTabs;

