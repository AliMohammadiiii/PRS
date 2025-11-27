import React from 'react';

type LogoProps = {
  /** Pixel size for the logo height; width scales automatically */
  height?: number;
};

// Navigation logo used in sidebar
const Logo: React.FC<LogoProps> = ({ height = 32 }) => {
  // Use BASE_URL from Vite to handle subpath deployment
  const baseUrl = import.meta.env.BASE_URL;
  return (
    <img
      src={`${baseUrl}Navigationlogo.svg`}
      alt="PRS navigation logo"
      style={{
        height,
        width: 'auto',
        display: 'block',
      }}
    />
  );
};

export default Logo;


