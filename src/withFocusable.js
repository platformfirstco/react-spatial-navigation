/* eslint-disable react/no-find-dom-node */
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import uniqueId from "lodash/uniqueId";
import noop from "lodash/noop";
import omit from "lodash/omit";
import compose from "recompose/compose";
import lifecycle from "recompose/lifecycle";
import withHandlers from "recompose/withHandlers";
import withContext from "recompose/withContext";
import withStateHandlers from "recompose/withStateHandlers";
import getContext from "recompose/getContext";
import pure from "recompose/pure";
import mapProps from "recompose/mapProps";
import SpatialNavigation, { ROOT_FOCUS_KEY } from "./spatialNavigation";
import React, { useState, useEffect, useContext, useCallback } from "react";

const omitProps = (keys) => mapProps((props) => omit(props, keys));

export const withFocusable = ({
  realFocusKey: focusKey,
  parentFocusKey,
  preferredChildFocusKey,
  forgetLastFocusedChild = false,
  onEnterPressHandler,
  onArrowPressHandler,
  onBecameFocusedHandler,
  onBecameBlurredHandler,
  onUpdateFocus,
  onUpdateHasFocusedChild,
  trackChildren,
  focusable = true,
  autoRestoreFocus = true,
  blockNavigationOut = false,
  forgetLastFocusedChild: configForgetLastFocusedChild = false,
  trackChildren: configTrackChildren = false,
  autoRestoreFocus: configAutoRestoreFocus,
  blockNavigationOut: configBlockNavigationOut = false,
} = {}) => {
  useEffect(() => {
    const node = SpatialNavigation.isNativeMode() ? this : findDOMNode(this);

    SpatialNavigation.addFocusable({
      focusKey,
      node,
      parentFocusKey,
      preferredChildFocusKey,
      onEnterPressHandler,
      onArrowPressHandler,
      onBecameFocusedHandler,
      onBecameBlurredHandler,
      onUpdateFocus,
      onUpdateHasFocusedChild,
      forgetLastFocusedChild:
        configForgetLastFocusedChild || forgetLastFocusedChild,
      trackChildren: configTrackChildren || trackChildren,
      blockNavigationOut: configBlockNavigationOut || blockNavigationOut,
      autoRestoreFocus:
        configAutoRestoreFocus !== undefined
          ? configAutoRestoreFocus
          : autoRestoreFocus,
      focusable,
    });
    return () => {
      SpatialNavigation.removeFocusable({
        focusKey,
      });
    };
  }, []);

  const pauseSpatialNavigation = useCallback(() => SpatialNavigation.pause, []);
  const resumeSpatialNavigation = useCallback(
    () => SpatialNavigation.resume,
    []
  );
  const updateAllSpatialLayouts = useCallback(
    () => SpatialNavigation.updateAllLayout,
    []
  );

  useEffect(() => {
    const node = SpatialNavigation.isNativeMode() ? this : findDOMNode(this);

    SpatialNavigation.updateFocusable(focusKey, {
      node,
      preferredChildFocusKey,
      focusable,
      blockNavigationOut: configBlockNavigationOut || blockNavigationOut,
    });
  }, [focusKey, preferredChildFocusKey, focusable, blockNavigationOut]);
};

const withFocusable = ({
  forgetLastFocusedChild: configForgetLastFocusedChild = false,
  trackChildren: configTrackChildren = false,
  autoRestoreFocus: configAutoRestoreFocus,
  blockNavigationOut: configBlockNavigationOut = false,
} = {}) =>
  compose(
    getContext({
      /**
       * From the context provided by another higher-level 'withFocusable' component
       */
      parentFocusKey: PropTypes.string,
    }),

    withStateHandlers(
      ({ focusKey, parentFocusKey }) => {
        const realFocusKey = focusKey || uniqueId("sn:focusable-item-");

        return {
          realFocusKey,

          /**
           * This method is used to imperatively set focus to a component.
           * It is blocked in the Native mode because the native engine decides what to focus by itself.
           */
          setFocus: SpatialNavigation.isNativeMode()
            ? noop
            : SpatialNavigation.setFocus.bind(null, realFocusKey),

          navigateByDirection: SpatialNavigation.navigateByDirection,

          /**
           * In Native mode this is the only way to mark component as focused.
           * This method always steals focus onto current component no matter which arguments are passed in.
           */
          stealFocus: SpatialNavigation.setFocus.bind(
            null,
            realFocusKey,
            realFocusKey
          ),
          focused: false,
          hasFocusedChild: false,
          parentFocusKey: parentFocusKey || ROOT_FOCUS_KEY,
        };
      },
      {
        onUpdateFocus: () => (focused = false) => ({
          focused,
        }),
        onUpdateHasFocusedChild: () => (hasFocusedChild = false) => ({
          hasFocusedChild,
        }),
      }
    ),

    /**
     * Propagate own 'focusKey' as a 'parentFocusKey' to it's children
     */
    withContext(
      {
        parentFocusKey: PropTypes.string,
      },
      ({ realFocusKey }) => ({
        parentFocusKey: realFocusKey,
      })
    ),

    withHandlers({
      onEnterPressHandler: ({ onEnterPress = noop, ...rest }) => (details) => {
        onEnterPress(rest, details);
      },
      onArrowPressHandler: ({ onArrowPress = noop, ...rest }) => (
        direction,
        details
      ) => onArrowPress(direction, rest, details),
      onBecameFocusedHandler: ({ onBecameFocused = noop, ...rest }) => (
        layout,
        details
      ) => {
        onBecameFocused(layout, rest, details);
      },
      onBecameBlurredHandler: ({ onBecameBlurred = noop, ...rest }) => (
        layout,
        details
      ) => {
        onBecameBlurred(layout, rest, details);
      },
    }),

    pure,

    omitProps([
      "onBecameFocusedHandler",
      "onBecameBlurredHandler",
      "onEnterPressHandler",
      "onArrowPressHandler",
      "onUpdateFocus",
      "onUpdateHasFocusedChild",
      "forgetLastFocusedChild",
      "trackChildren",
      "autoRestoreFocus",
    ])
  );
