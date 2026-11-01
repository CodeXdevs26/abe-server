import { Client } from '@googlemaps/google-maps-services-js';

const getDistance = async (origin: string, destination: string) => {
  const client = new Client({});

  try {
    const response = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [destination],
        key: 'AIzaSyBFi80uuJIWkkLCpodFa8oXmD8XD_h8LMc',
      },
    });

    if (response?.data?.rows[0]?.elements[0]?.status !== 'OK')
      return { success: false, message: 'data not found' };

    const distance = response?.data?.rows[0]?.elements[0]?.distance?.value;
    const duration = response?.data?.rows[0]?.elements[0]?.duration?.text;
    return { success: true, data: { distance, duration } };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export default getDistance;