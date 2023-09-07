import React, { useEffect, useRef } from 'react';

export type ResponderEvent = TouchEvent | MouseEvent | Event;
export type CallbackQueryType = (state: StateType, e: ResponderEvent) => boolean;
export type CallbackType = (state: StateType, e: ResponderEvent) => void;

export interface Callbacks {
  onStartShouldSetCapture?: CallbackQueryType;
  onStartShouldSet?: CallbackQueryType;
  onMoveShouldSetCapture?: CallbackQueryType;
  onMoveShouldSet?: CallbackQueryType;
  onGrant?: CallbackType;
  onMove?: CallbackType;
  onRelease?: CallbackType;
  onTerminate?: (state: StateType, e?: ResponderEvent) => void;
  onTerminationRequest?: (state: StateType, e?: ResponderEvent) => boolean;
}

const initialState: StateType = {
  time: Date.now(),
  xy: [0, 0],
  delta: [0, 0],
  initial: [0, 0],
  previous: [0, 0],
  direction: [0, 0],
  initialDirection: [0, 0],
  local: [0, 0],
  lastLocal: [0, 0],
  velocity: 0,
  distance: 0,
};

export interface StateType {
  time: number;
  xy: [number, number];
  delta: [number, number];
  initial: [number, number];
  previous: [number, number];
  direction: [number, number];
  initialDirection: [number, number];
  local: [number, number];
  lastLocal: [number, number];
  velocity: number;
  distance: number;
}

interface Config {
  uid?: string;
  enableMouse?: boolean;
}

const defaultConfig: Config = {
  enableMouse: true,
};

export interface GrantedTouch {
  id: string | number;
  onTerminationRequest: (e?: ResponderEvent) => void;
  onTerminate: (e?: ResponderEvent) => void;
}

let grantedTouch: GrantedTouch | null = null;

const isMouseEnabled = () => true;

export function useGestureResponder(options: Callbacks = {}, config: Config = {}) {
  const state = useRef(initialState);

  const { uid, enableMouse } = {
    ...defaultConfig,
    ...config,
  };
  const id = useRef(uid || Math.random());
  const pressed = useRef(false);

  const callbackRefs = useRef(options);
  useEffect(() => {
    callbackRefs.current = options;
  }, [options]);

  function claimTouch(e: ResponderEvent) {
    if (grantedTouch) {
      grantedTouch.onTerminationRequest(e);
      grantedTouch.onTerminate(e);
      grantedTouch = null;
    }

    attemptGrant(e);
  }

  function attemptGrant(e: ResponderEvent) {
    if (grantedTouch) {
      return;
    }

    grantedTouch = {
      id: id.current,
      onTerminate,
      onTerminationRequest,
    };

    onGrant(e);
  }

  function bindGlobalMouseEvents() {
    window.addEventListener('mousemove', handleMoveMouse, false);
    window.addEventListener('mousemove', handleMoveMouseCapture, true);
    window.addEventListener('mouseup', handleEndMouse);
  }

  function unbindGlobalMouseEvents() {
    window.removeEventListener('mousemove', handleMoveMouse, false);
    window.removeEventListener('mousemove', handleMoveMouseCapture, true);
    window.removeEventListener('mouseup', handleEndMouse);
  }

  function handleStartCapture(e: ResponderEvent) {
    updateStartState(e);
    pressed.current = true;

    const granted = onStartShouldSetCapture(e);
    if (granted) {
      attemptGrant(e);
    }
  }

  function handleStart(e: ResponderEvent) {
    updateStartState(e);
    pressed.current = true;
    bindGlobalMouseEvents();

    const granted = onStartShouldSet(e);

    if (granted) {
      attemptGrant(e);
    }
  }

  function isGrantedTouch() {
    return grantedTouch && grantedTouch.id === id.current;
  }

  function handleEnd(e: ResponderEvent) {
    pressed.current = false;
    unbindGlobalMouseEvents();

    if (!isGrantedTouch()) {
      return;
    }

    grantedTouch = null;

    onRelease(e);
  }

  function handleMoveCapture(e: ResponderEvent) {
    updateMoveState(e);

    if (isGrantedTouch()) {
      return;
    }

    if (onMoveShouldSetCapture(e)) {
      claimTouch(e);
    }
  }

  function handleMove(e: ResponderEvent) {
    if (isGrantedTouch()) {
      onMove(e);
      return;
    }

    if (onMoveShouldSet(e)) {
      claimTouch(e);
    }
  }

  function onStartShouldSet(e: ResponderEvent) {
    return callbackRefs.current.onStartShouldSet
      ? callbackRefs.current.onStartShouldSet(state.current, e)
      : false;
  }

  function onStartShouldSetCapture(e: ResponderEvent) {
    return callbackRefs.current.onStartShouldSetCapture
      ? callbackRefs.current.onStartShouldSetCapture(state.current, e)
      : false;
  }

  function onMoveShouldSet(e: ResponderEvent) {
    return callbackRefs.current.onMoveShouldSet
      ? callbackRefs.current.onMoveShouldSet(state.current, e)
      : false;
  }

  function onMoveShouldSetCapture(e: ResponderEvent) {
    return callbackRefs.current.onMoveShouldSetCapture
      ? callbackRefs.current.onMoveShouldSetCapture(state.current, e)
      : false;
  }

  function onGrant(e: any) {
    if (callbackRefs.current.onGrant) {
      callbackRefs.current.onGrant(state.current, e);
    }
  }

  function updateStartState(e: any) {
    const { pageX, pageY } = e.touches && e.touches[0] ? e.touches[0] : e;
    const s = state.current;
    state.current = {
      ...initialState,
      lastLocal: s.lastLocal || initialState.lastLocal,
      xy: [pageX, pageY],
      initial: [pageX, pageY],
      previous: [pageX, pageY],
      time: Date.now(),
    };
  }

  function updateMoveState(e: any) {
    const { pageX, pageY } = e.touches && e.touches[0] ? e.touches[0] : e;
    const s = state.current;
    const time = Date.now();
    const xDist = pageX - s.xy[0];
    const yDist = pageY - s.xy[1];
    const deltaX = pageX - s.initial[0];
    const deltaY = pageY - s.initial[1];
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const len = Math.sqrt(xDist * xDist + yDist * yDist);
    const scaler = 1 / (len || 1);
    const velocity = len / (time - s.time);

    const initialDirection =
      s.initialDirection[0] !== 0 || s.initialDirection[1] !== 0
        ? s.initialDirection
        : ([deltaX * scaler, deltaY * scaler] as [number, number]);

    state.current = {
      ...state.current,
      time,
      xy: [pageX, pageY],
      initialDirection,
      delta: [deltaX, deltaY],
      local: [
        s.lastLocal[0] + pageX - s.initial[0],
        s.lastLocal[1] + pageY - s.initial[1],
      ],
      velocity: time - s.time === 0 ? s.velocity : velocity,
      distance,
      direction: [xDist * scaler, yDist * scaler],
      previous: s.xy,
    };
  }

  function onMove(e: any) {
    if (pressed.current && callbackRefs.current.onMove) {
      callbackRefs.current.onMove(state.current, e);
    }
  }

  function onRelease(e: ResponderEvent) {
    const s = state.current;
    state.current = {
      ...state.current,
      lastLocal: s.local,
    };

    if (callbackRefs.current.onRelease) {
      callbackRefs.current.onRelease(state.current, e);
    }

    grantedTouch = null;
  }

  function onTerminationRequest(e?: ResponderEvent) {
    return callbackRefs.current.onTerminationRequest
      ? callbackRefs.current.onTerminationRequest(state.current, e)
      : true;
  }

  function onTerminate(e?: ResponderEvent) {
    const s = state.current;
    state.current = {
      ...state.current,
      lastLocal: s.local,
    };

    if (callbackRefs.current.onTerminate) {
      callbackRefs.current.onTerminate(state.current, e);
    }
  }

  function handleMoveMouse(e: Event) {
    if (isMouseEnabled()) {
      handleMove(e);
    }
  }

  function handleMoveMouseCapture(e: Event) {
    if (isMouseEnabled()) {
      handleMoveCapture(e);
    }
  }

  function handleEndMouse(e: Event) {
    if (isMouseEnabled()) {
      handleEnd(e);
    }
  }

  useEffect(() => unbindGlobalMouseEvents, []);

  function terminateCurrentResponder() {
    if (grantedTouch) {
      grantedTouch.onTerminate();
      grantedTouch = null;
    }
  }

  function getCurrentResponder() {
    return grantedTouch;
  }

  const touchEvents = {
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchMove: handleMove,
    onTouchStartCapture: handleStartCapture,
    onTouchMoveCapture: handleMoveCapture,
  };

  const mouseEvents = enableMouse
    ? {
        onMouseDown: (e: MouseEvent) => {
          if (isMouseEnabled()) {
            handleStart(e);
          }
        },
        onMouseDownCapture: (e: MouseEvent) => {
          if (isMouseEnabled()) {
            handleStartCapture(e);
          }
        },
      }
    : {};

  return {
    bind: {
      ...touchEvents,
      ...mouseEvents,
    },
    terminateCurrentResponder,
    getCurrentResponder,
  };
}
