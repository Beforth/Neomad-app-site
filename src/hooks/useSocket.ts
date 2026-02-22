
import { useState } from 'react';

export const useSocket = () => {
  const [connected] = useState(false);
  return { socket: null, connected };
};
