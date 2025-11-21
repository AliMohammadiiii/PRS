import { Box, Loading } from 'injast-core/components';

const DataGridLoading = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: 'white !important',
      }}
    >
      <Loading />
    </Box>
  );
};

export default DataGridLoading;

