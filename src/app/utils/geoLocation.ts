import NodeGeocoder from 'node-geocoder';
import { Client } from '@googlemaps/google-maps-services-js';

const geocoder = NodeGeocoder({
  provider: "openstreetmap",
});

const googleMapsClient = new Client({});
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBFi80uuJIWkkLCpodFa8oXmD8XD_h8LMc';

export async function geocodeLocation(address: string): Promise<{ latitude: number; longitude: number }> {
  const res = await geocoder.geocode(address);
  if (typeof res[0]?.latitude === 'number' && typeof res[0]?.longitude === 'number') {
    return { latitude: res[0].latitude, longitude: res[0].longitude };
  }

  const googleResponse = await googleMapsClient.geocode({
    params: {
      address,
      key: GOOGLE_MAPS_API_KEY,
    },
  });

  const location = googleResponse.data.results[0]?.geometry?.location;
  if (typeof location?.lat === 'number' && typeof location?.lng === 'number') {
    return { latitude: location.lat, longitude: location.lng };
  }

  throw new Error('Unable to geocode address');
}

export const reverseGeocode = async (lat: number, lon: number) => {
  try {
    const location = await geocoder.reverse({ lat, lon });
    if (!location[0]?.formattedAddress) return 'Unknown!';
    return location[0]?.formattedAddress;
  } catch (error) {
    console.log('error', error);
    return 'Unknown!';
  }
};
