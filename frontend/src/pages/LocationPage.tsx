import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExternalLink, MapPin, Navigation, Search } from 'lucide-react';
import LocationSelector, { DEFAULT_LOCATION_OPTIONS, LocationOption } from '@/components/Location/LocationSelector';
import NearbyFarmers, { Farmer } from '@/components/Location/NearbyFarmers';
import FarmerProfileSection from '@/components/Farmer/FarmerProfileSection';
import { useGlobalState } from '@/context/GlobalStateContext';
import { User } from '@/context/AuthContext';

const buildMapsSearchUrl = (location: LocationOption) => {
  if (location.coordinates) {
    return `https://www.google.com/maps/search/?api=1&query=${location.coordinates.lat},${location.coordinates.lng}`;
  }

  const query = [location.name, location.city, location.state].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const normalizeLocationKey = (value: string) => value.trim().toLowerCase();

const requestCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  });
};

const LocationPage: React.FC = () => {
  const { users } = useGlobalState();
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<User | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [locationError, setLocationError] = useState('');
  const [isDetectingCurrentLocation, setIsDetectingCurrentLocation] = useState(false);
  const selectedFarmerRef = useRef<HTMLDivElement | null>(null);

  type FarmerWithUser = Farmer & { user: User };

  const allFarmers = useMemo(() => {
    return users
      .filter((user) => user.role === 'farmer')
      .map((farmer) => ({
        id: farmer.id,
        name: farmer.farmName || farmer.name,
        avatar: farmer.profilePhoto
          ? farmer.profilePhoto
          : `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%2322c55e"/%3E%3Ctext x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-family="Arial"%3E${(farmer.farmName || farmer.name).substring(0, 2).toUpperCase()}%3C/text%3E%3C/svg%3E`,
        location: farmer.location,
        distance: Math.random() * 50,
        rating: 4.5 + Math.random() * 0.5,
        totalReviews: Math.floor(100 + Math.random() * 400),
        products: 12 + Math.floor(Math.random() * 20),
        responseTime: '< 1 hour',
        isVerified: true,
        isFeatured: Math.random() > 0.7,
        speciality: (farmer.cropTypes || []).join(', ') || 'Fresh Produce',
        priceRange: '₹20-60/kg',
        description: farmer.farmDetails || 'Quality fresh produce from local farmer.',
        user: farmer,
      })) as Array<Farmer & { user: User }>;
  }, [users]);

  const nearbyFarmers = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }

    const query = normalizeLocationKey(selectedLocation.city || selectedLocation.name);
    return allFarmers.filter((farmer) => normalizeLocationKey(farmer.location || '').includes(query));
  }, [allFarmers, selectedLocation]);

  const mapUrl = selectedLocation ? buildMapsSearchUrl(selectedLocation) : '';

  const handleLocationChange = (location: LocationOption | null) => {
    setLocationError('');
    const nextLocation = location ? (location.coordinates ? location : DEFAULT_LOCATION_OPTIONS.find((entry) => entry.city === location.city || entry.name === location.name) ?? location) : null;
    setSelectedLocation(nextLocation);
    setSelectedFarmer(null);
    setManualLocation(nextLocation?.city || nextLocation?.name || '');

    if (nextLocation) {
      setManualLocation(nextLocation.city || nextLocation.name || '');
    }
  };

  useEffect(() => {
    if (selectedFarmerRef.current) {
      selectedFarmerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedFarmer]);

  const navigate = useNavigate();

  const handleFarmerClick = (farmer: FarmerWithUser) => {
    setSelectedFarmer(farmer.user);
  };

  const handleFarmerChat = (farmerId: string) => {
    navigate(`/messages?partnerId=${encodeURIComponent(farmerId)}`);
  };

  const handleManualSearch = () => {
    const query = manualLocation.trim();
    if (!query) {
      setLocationError('Enter a location to search farmers.');
      return;
    }

    setLocationError('');

    const match = DEFAULT_LOCATION_OPTIONS.find(
      (entry) => normalizeLocationKey(entry.city) === normalizeLocationKey(query) || normalizeLocationKey(entry.name) === normalizeLocationKey(query)
    );

    const nextLocation = match ?? {
      id: `manual_${normalizeLocationKey(query).replace(/\s+/g, '_')}`,
      name: query,
      city: query,
      state: 'India',
    };

    handleLocationChange(nextLocation);
  };

  const handleUseCurrentLocation = async () => {
    setIsDetectingCurrentLocation(true);
    setLocationError('');
    setSelectedFarmer(null);

    try {
      const position = await requestCurrentLocation();
      const latitude = position.coords.latitude.toFixed(6);
      const longitude = position.coords.longitude.toFixed(6);

      let resolvedCity = 'Current Location';
      let resolvedState = 'Near you';

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = (await response.json()) as {
            address?: { city?: string; town?: string; village?: string; state?: string; county?: string };
            display_name?: string;
          };

          resolvedCity = data.address?.city || data.address?.town || data.address?.village || data.display_name?.split(',')[0] || resolvedCity;
          resolvedState = data.address?.state || data.address?.county || resolvedState;
          if (data.display_name) {
            setManualLocation(data.display_name);
          }
        }
      } catch {
        setManualLocation(`${latitude}, ${longitude}`);
      }

      const currentLocation: LocationOption = {
        id: 'current-location',
        name: resolvedCity,
        city: resolvedCity,
        state: resolvedState,
        coordinates: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
      };

      handleLocationChange(currentLocation);
    } catch {
      setLocationError('Unable to detect your current location. Please allow location access and try again.');
    } finally {
      setIsDetectingCurrentLocation(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-5">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Find Farmers Near You</h1>
          <p className="text-gray-600 mt-2 text-sm leading-relaxed">Connect directly with local farmers and get fresh produce delivered straight to your door.</p>
        </div>

      <div className="space-y-4">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white rounded-xl">
          <CardHeader className="pb-4 pt-5 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
              <Navigation className="h-4 w-4 text-green-600" />
              Select Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 pt-0">
            <Button onClick={handleUseCurrentLocation} className="w-full gap-2 bg-green-600 hover:bg-green-700 h-10 text-sm font-medium rounded-lg transition-colors" disabled={isDetectingCurrentLocation}>
              <Navigation className="h-4 w-4" />
              {isDetectingCurrentLocation ? 'Detecting location...' : 'Use My Current Location'}
            </Button>
            <LocationSelector
              value={selectedLocation}
              onChange={handleLocationChange}
              placeholder="Search or select location..."
              locations={DEFAULT_LOCATION_OPTIONS}
            />
            <div className="flex gap-2.5">
              <Input
                value={manualLocation}
                onChange={(event) => setManualLocation(event.target.value)}
                placeholder="Or type location manually"
                className="h-10 text-sm border-gray-200 rounded-lg"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleManualSearch();
                  }
                }}
              />
              <Button onClick={handleManualSearch} className="gap-2 h-10 px-4 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors font-medium">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {selectedLocation
                ? `Showing farmers in ${selectedLocation.city}`
                : 'Select or type a location to find farmers'}
            </p>
            {locationError && <p className="text-xs text-red-600">{locationError}</p>}
          </CardContent>
        </Card>

        {selectedLocation && (
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white rounded-xl">
            <CardHeader className="pb-4 pt-5 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                <MapPin className="h-4 w-4 text-green-600" />
                Location Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 pt-0">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-6 text-center shadow-xs">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 shadow-xs">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {selectedLocation.city}
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-gray-600">
                    {selectedLocation.state}
                  </p>
                  {selectedLocation.coordinates && (
                    <div className="mt-3 inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600 font-medium">
                      {selectedLocation.coordinates.lat.toFixed(4)}, {selectedLocation.coordinates.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full gap-2 h-10 text-sm border-gray-200 hover:bg-gray-50 font-medium rounded-lg transition-colors">
                <a href={mapUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View on Google Maps
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedLocation && (
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white rounded-xl">
            <CardHeader className="pb-4 pt-5 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                <MapPin className="h-4 w-4 text-green-600" />
                Farmers in {selectedLocation.city} ({nearbyFarmers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 pt-0">
              <div className="space-y-3">
                <NearbyFarmers
                  farmers={nearbyFarmers}
                  selectedLocation={selectedLocation.city}
                  maxDistance={50}
                  selectedFarmerId={selectedFarmer?.id}
                  onFarmerClick={handleFarmerClick}
                  onMessage={handleFarmerChat}
                  emptyMessage={`No farmers found for ${selectedLocation.city}`}
                />

                {selectedFarmer && (
                  <div ref={selectedFarmerRef} className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-green-700 font-semibold">Selected Farmer</p>
                        <h2 className="text-lg font-bold text-gray-900 mt-1">
                          {selectedFarmer.farmName || selectedFarmer.name}
                        </h2>
                      </div>
                      <div className="inline-flex items-center rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase text-green-700 w-fit shadow-xs">
                        Profile
                      </div>
                    </div>
                    <FarmerProfileSection user={selectedFarmer} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </div>
  );
};

export default LocationPage;
