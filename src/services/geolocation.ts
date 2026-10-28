/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * FarmProof Geolocation Service
 * Robust, dual-stage browser geolocation with satellite fallback,
 * permission status query, accuracy reporting, and zero fake coordinates.
 */

export interface GpsLocationResult {
  lat: number;
  lng: number;
  accuracy: number; // in metres
  timestamp: string; // ISO string
  formattedTime: string;
  source: 'satellite_high_accuracy' | 'network_fallback' | 'cached';
}

export interface GpsErrorResult {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'INSECURE_CONTEXT' | 'UNSUPPORTED';
  title: string;
  message: string;
  instruction: string;
  canRetry: boolean;
}

/**
 * Acquire device geolocation using a resilient two-stage strategy:
 * 1. Attempt high-accuracy GPS (satellite) with 7s timeout.
 * 2. If timeout or position unavailable, fall back to network/cellular provider (10s timeout, 60s maximumAge).
 * Never substitutes fake coordinates.
 */
export async function acquireDeviceGps(): Promise<
  { success: true; data: GpsLocationResult } | { success: false; error: GpsErrorResult }
> {
  // Check secure context
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return {
      success: false,
      error: {
        code: 'INSECURE_CONTEXT',
        title: 'HTTPS Connection Required',
        message: 'Browser Geolocation API is disabled on insecure HTTP connections.',
        instruction: 'Access FarmProof via HTTPS or localhost to enable device GPS hardware access.',
        canRetry: false
      }
    };
  }

  // Check API availability
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      error: {
        code: 'UNSUPPORTED',
        title: 'Geolocation Unsupported',
        message: 'Your current browser does not support the W3C Geolocation API.',
        instruction: 'Please use a modern browser such as Google Chrome, Microsoft Edge, Safari, or Firefox.',
        canRetry: false
      }
    };
  }

  // Stage 1: Attempt High-Accuracy Satellite GPS
  const tryGetPosition = (
    highAccuracy: boolean,
    timeoutMs: number,
    maxAgeMs: number
  ): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: maxAgeMs
      });
    });
  };

  try {
    const pos = await tryGetPosition(true, 7000, 0);
    const result: GpsLocationResult = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: Math.round(pos.coords.accuracy * 10) / 10,
      timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
      formattedTime: new Date(pos.timestamp || Date.now()).toLocaleTimeString('en-GB') + ' IST',
      source: 'satellite_high_accuracy'
    };
    return { success: true, data: result };
  } catch (errStage1: any) {
    // If permission was explicitly denied, do not attempt fallback — inform user immediately
    if (errStage1.code === 1) { // PERMISSION_DENIED
      return {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          title: 'Location Permission Denied',
          message: 'Browser location access was denied for this application.',
          instruction: 'Desktop Chrome: Click the padlock (🔒) icon in your address bar, toggle Location to "Allow", and click Retry. Mobile Android: Open Chrome Menu > Settings > Site settings > Location > Allow.',
          canRetry: true
        }
      };
    }

    // Stage 2: Fallback to network/cellular or cached position
    try {
      const posFallback = await tryGetPosition(false, 10000, 60000);
      const result: GpsLocationResult = {
        lat: posFallback.coords.latitude,
        lng: posFallback.coords.longitude,
        accuracy: Math.round(posFallback.coords.accuracy * 10) / 10,
        timestamp: new Date(posFallback.timestamp || Date.now()).toISOString(),
        formattedTime: new Date(posFallback.timestamp || Date.now()).toLocaleTimeString('en-GB') + ' IST',
        source: 'network_fallback'
      };
      return { success: true, data: result };
    } catch (errStage2: any) {
      if (errStage2.code === 1) {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            title: 'Location Permission Denied',
            message: 'Location permission was denied by user or system policy.',
            instruction: 'Enable location permissions in your browser address bar (lock icon) and ensure device location is turned ON in system settings.',
            canRetry: true
          }
        };
      } else if (errStage2.code === 2) {
        return {
          success: false,
          error: {
            code: 'POSITION_UNAVAILABLE',
            title: 'GPS Sensor Unavailable',
            message: 'Your device was unable to determine physical coordinates.',
            instruction: 'Ensure device GPS / Location Services are turned ON in system settings. If indoors, move closer to a window or outdoors.',
            canRetry: true
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            title: 'GPS Signal Request Timed Out',
            message: 'Device could not acquire satellite or network GPS fix within 17 seconds.',
            instruction: 'Ensure device Location is turned ON in quick settings. Move to an open outdoor field location and click "Retry Location Capture".',
            canRetry: true
          }
        };
      }
    }
  }
}
