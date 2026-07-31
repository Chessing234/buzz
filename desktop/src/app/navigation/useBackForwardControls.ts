import * as React from "react";
import {
  useCanGoBack,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";

import { matchHistoryNavigationShortcut } from "@/app/navigation/historyNavigationShortcuts";
import { isMacPlatform } from "@/shared/lib/platform";
import { trimMapToSize } from "@/shared/lib/trimMapToSize";

type RouterHistoryState = {
  __TSR_index?: number;
  __TSR_key?: string;
  key?: string;
};

export function useBackForwardControls() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const locationState = useRouterState({
    select: (state) => state.location.state,
  }) as RouterHistoryState;
  const locationIndex = locationState.__TSR_index ?? 0;
  const locationKey =
    locationState.__TSR_key ?? locationState.key ?? String(locationIndex);
  const keysByIndexRef = React.useRef(new Map<number, string>());
  const [maxIndex, setMaxIndex] = React.useState(locationIndex);

  React.useEffect(() => {
    const keysByIndex = keysByIndexRef.current;
    const currentKey = keysByIndex.get(locationIndex);

    if (currentKey && currentKey !== locationKey) {
      for (const storedIndex of [...keysByIndex.keys()]) {
        if (storedIndex >= locationIndex) {
          keysByIndex.delete(storedIndex);
        }
      }
    }

    keysByIndex.set(locationIndex, locationKey);
    trimMapToSize(keysByIndex, 200);
    setMaxIndex((current: number) => {
      if (currentKey && currentKey !== locationKey) {
        return locationIndex;
      }

      return Math.max(current, locationIndex);
    });
  }, [locationIndex, locationKey]);

  const canGoForward = locationIndex < maxIndex;

  const goBack = React.useCallback(() => {
    if (!canGoBack) {
      return;
    }

    router.history.back();
  }, [canGoBack, router.history]);

  const goForward = React.useCallback(() => {
    if (!canGoForward) {
      return;
    }

    router.history.forward();
  }, [canGoForward, router.history]);

  const handleKeyDown = React.useEffectEvent((event: KeyboardEvent) => {
    const direction = matchHistoryNavigationShortcut(
      {
        key: event.key,
        code: event.code,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      },
      isMacPlatform(),
    );

    if (direction === "back") {
      event.preventDefault();
      goBack();
      return;
    }

    if (direction === "forward") {
      event.preventDefault();
      goForward();
    }
  });

  React.useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return {
    canGoBack,
    canGoForward,
    goBack,
    goForward,
  };
}
