import { Box } from 'injast-core/components';
import { FC, ReactNode, useEffect, useState } from 'react';
import { PAGE_TABS_ID } from '../constants';
type ContentBoxProps = {
  children: ReactNode;
};
const ContentBox: FC<ContentBoxProps> = ({ children }) => {
  const tabEl = document.getElementById(PAGE_TABS_ID);
  const headerHight = tabEl ? 248 : 172;

  const [remaining, setRemaining] = useState(window.innerHeight - headerHight);

  useEffect(() => {
    setRemaining(window.innerHeight - headerHight);
  }, [headerHight]);

  useEffect(() => {
    const onResize = () => {
      setRemaining(window.innerHeight - headerHight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: 2,
        height: remaining,
        overflow: 'auto',
        px: 4,
        py: 6,
      }}
    >
      {children}
    </Box>
  );
};

export default ContentBox;

