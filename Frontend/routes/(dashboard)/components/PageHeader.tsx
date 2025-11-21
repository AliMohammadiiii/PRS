import { ArrowRight } from 'iconsax-reactjs';
import { Box, Grid, Typography } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { FC, Fragment, ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  breadcrumb: string[];
  children?: ReactNode;
};

const PageHeader: FC<PageHeaderProps> = ({ title, breadcrumb, children }) => {
  return (
    <Grid
      container
      sx={{
        height: 76,
        top: 81,
        left: 0,
        right: 0,
        zIndex: 9,
      }}
    >
      <Grid
        size={12}
        sx={{
          bgcolor: defaultColors.neutral[50],
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
          <ArrowRight color={defaultColors.neutral.dark} size={32} />
          <Box>
            <Typography variant="display2" color="neutral.dark">
              {title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, pt: 2 }}>
              <>
                {breadcrumb.map((text, index) => {
                  const isLast = index === breadcrumb.length - 1;
                  return (
                    <Fragment key={index}>
                      <Typography
                        variant="body2"
                        color={isLast ? 'neutral.main' : 'neutral.light'}
                      >
                        {text}
                      </Typography>
                      {!isLast && (
                        <Typography color="neutral.light" variant="body2">
                          /
                        </Typography>
                      )}
                    </Fragment>
                  );
                })}
              </>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'end',
            gap: 3,
          }}
        >
          {children}
        </Box>
      </Grid>
    </Grid>
  );
};

export default PageHeader;

