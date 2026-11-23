import * as Location from 'expo-location';
import { useEffect } from 'react';
import {
  EMPTY,
  Observable,
  Subscription,
  catchError,
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  retry,
  share,
  skip,
  switchMap,
} from 'rxjs';

import { fetchSnapshot } from '@/services/airQualityService';
import { useMonitoring } from '@/stores/monitoringStore';
import { distanceIntervalForSpeed } from '@/constants/location';
import { haversineMeters } from '@/utils/haversine';

/** Batas pergerakan agar UI (koordinat) ikut diperbarui. */
const MOVE_UI_M = 25;
/** Batas pergerakan agar data API dimuat ulang. */
const MOVE_FETCH_M = 500;

export interface LocationSample {
  lat: number;
  lon: number;
  speed: number | null;
  timestamp: number;
}

function sampleOf(position: Location.LocationObject): LocationSample {
  return {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    speed: position.coords.speed,
    timestamp: position.timestamp,
  };
}

/**
 * Stream posisi foreground. Watcher dimulai ulang saat bucket kecepatan berubah
 * sehingga `distanceInterval` benar-benar adaptif, bukan hanya filter di JS.
 */
export function createPositionStream(): Observable<LocationSample> {
  return new Observable<LocationSample>((subscriber) => {
    let active = true;
    let watcher: Location.LocationSubscription | null = null;
    let interval = 0;
    let generation = 0;

    const start = async (nextInterval: number) => {
      if (!active || nextInterval === interval) return;
      interval = nextInterval;
      const current = ++generation;
      watcher?.remove();
      watcher = null;

      try {
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: nextInterval,
            timeInterval: 5_000,
          },
          (position) => {
            if (!active) return;
            subscriber.next(sampleOf(position));
            const desired = distanceIntervalForSpeed(position.coords.speed);
            if (desired !== interval) void start(desired);
          },
          (reason) => subscriber.error(new Error(reason)),
        );
        if (!active || current !== generation) subscription.remove();
        else watcher = subscription;
      } catch (e) {
        if (active) subscriber.error(e);
      }
    };

    void start(distanceIntervalForSpeed(null));

    return () => {
      active = false;
      watcher?.remove();
      watcher = null;
    };
  });
}

/**
 * UDF: stream lokasi -> debounce -> distinct -> switchMap(fetch) -> store.
 * Posisi pertama tidak di-fetch ulang karena `requestLocation()` sudah memuatnya.
 */
export function useLocationFeed(enabled: boolean) {
  const commitLocation = useMonitoring((s) => s.commitLocation);
  const commitSnapshot = useMonitoring((s) => s.commitSnapshot);
  const failFetch = useMonitoring((s) => s.failFetch);

  useEffect(() => {
    if (!enabled) return;

    const positions$ = createPositionStream().pipe(debounceTime(800), share());
    const subscriptions = new Subscription();

    subscriptions.add(
      positions$
        .pipe(
          distinctUntilChanged((a, b) => (haversineMeters(a, b) ?? Infinity) < MOVE_UI_M),
          map((sample) => ({ lat: sample.lat, lon: sample.lon })),
        )
        .subscribe(commitLocation),
    );

    subscriptions.add(
      positions$
        .pipe(
          distinctUntilChanged((a, b) => (haversineMeters(a, b) ?? Infinity) < MOVE_FETCH_M),
          skip(1),
          switchMap((sample) =>
            from(fetchSnapshot(sample)).pipe(
              retry({ count: 2, delay: 1500 }),
              catchError(() => {
                failFetch('Tidak dapat memperbarui data untuk lokasi baru.');
                return EMPTY;
              }),
            ),
          ),
        )
        .subscribe(commitSnapshot),
    );

    return () => subscriptions.unsubscribe();
  }, [enabled, commitLocation, commitSnapshot, failFetch]);
}
