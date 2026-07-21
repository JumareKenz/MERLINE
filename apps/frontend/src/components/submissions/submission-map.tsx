'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface SubmissionMapProps {
  points: GeoPoint[];
  title?: string;
}

export function SubmissionMap({ points, title = 'Submission Locations' }: SubmissionMapProps) {
  if (!points.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-8 w-8 text-foreground-tertiary mb-2" />
            <p className="text-sm text-foreground-secondary">No geo-located submissions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-neutral-50 border border-border p-4 min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">{points.length} location{points.length !== 1 ? 's' : ''}</p>
            <ul className="mt-2 space-y-1">
              {points.slice(0, 5).map((p, i) => (
                <li key={i} className="text-xs text-foreground-secondary">
                  {p.label && <span className="font-medium">{p.label}: </span>}
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                </li>
              ))}
              {points.length > 5 && (
                <li className="text-xs text-foreground-tertiary">
                  +{points.length - 5} more locations
                </li>
              )}
            </ul>
          </div>
        </div>
        <p className="text-xs text-foreground-tertiary mt-2">
          Map integration available with MapLibre GL
        </p>
      </CardContent>
    </Card>
  );
}
