
import { useState, useEffect } from 'react';

interface GeolocationState {
  loading: boolean;
  error: GeolocationPositionError | null;
  data: GeolocationPosition | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    const onSuccess = (position: GeolocationPosition) => {
      setState({
        loading: false,
        error: null,
        data: position,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setState({
        loading: false,
        error,
        data: null,
      });
    };

    if (!navigator.geolocation) {
      setState({
        loading: false,
        error: {
            code: 0,
            message: 'Geolocation is not supported',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
        },
        data: null,
      });
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError);
    }
  }, []);

  return state;
};
