'use client';

import { cn } from '@/lib/utils';
import { Megaphone } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdBannerProps {
  adSlot: string; // Will correspond to a specific ad unit ID later
  className?: string;
}

const adSlotStyles: Record<string, string> = {
    leaderboard: "h-[90px] w-full max-w-[728px] mx-auto",
    skyscraper: "h-full w-[160px]",
    box: "h-[250px] w-[300px]",
}

export const AdBanner = ({ adSlot, className }: AdBannerProps) => {
    const adRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Check if the ad has already been loaded to prevent re-initialization error
        if (adRef.current && adRef.current.firstChild) {
            return;
        }

        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.error("AdSense Error:", err);
        }
    }, []);

  return (
    <div
        ref={adRef}
        className={cn(
            "bg-muted/50 border border-dashed rounded-lg flex items-center justify-center text-muted-foreground",
            adSlotStyles[adSlot] || 'h-24 w-full',
            className
        )}
    >
        <div className="text-center">
            <Megaphone className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">Advertisement</span>
        </div>
        {/*
          This is where the real Google AdSense code would go.
          It is commented out to prevent errors during development without a real ad client ID.
          The key part is the 'key' attribute which helps React identify the component uniquely.
        */}
        {/*
        <ins
            key={adSlot + new Date().getTime()}
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXX" // Replace with your client ID
            data-ad-slot="YYYYYYYYYY"        // Replace with your ad slot ID
            data-ad-format="auto"
            data-full-width-responsive="true"
        ></ins>
        */}
    </div>
  );
};
