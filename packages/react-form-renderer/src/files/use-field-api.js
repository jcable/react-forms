import { useEffect, useContext, useState, useRef } from 'react';
import { useField } from 'react-final-form';
import enhancedOnChange from '../form-renderer/enhanced-on-change';
import RendererContext from './renderer-context';
import convertInitialValue from '../form-renderer/convert-initial-value';
import assignSpecialType from '../form-renderer/assign-special-type';
import componentTypes from './component-types';
import { prepareArrayValidator, getValidate } from '../form-renderer/validator-helpers';
import composeValidators from './compose-validators';
import isEqual from 'lodash/isEqual';

const calculateInitialValue = (props) => {
  if (Object.prototype.hasOwnProperty.call(props, 'initialValue') && Object.prototype.hasOwnProperty.call(props, 'dataType')) {
    return convertInitialValue(props.initialValue, props.dataType);
  }
};

const calculateArrayValidator = (props, validate, component, validatorMapper) => {
  if ((validate || props.dataType) && componentTypes.FIELD_ARRAY === component) {
    return prepareArrayValidator(getValidate(validate, props.dataType, validatorMapper));
  }
};

const calculateValidate = (props, validate, component, validatorMapper) => {
  if ((validate || props.dataType) && componentTypes.FIELD_ARRAY !== component) {
    return composeValidators(getValidate(validate, props.dataType, validatorMapper));
  }
};

const useFieldApi = ({ name, initializeOnMount, component, render, validate, ...props }) => {
  const { actionMapper, validatorMapper, formOptions } = useContext(RendererContext);
  const [initialValue, setInitialValue] = useState(() => calculateInitialValue(props));
  const [arrayValidator, setArrayValidator] = useState(() => calculateArrayValidator(props, validate, component, validatorMapper));
  const [stateValidate, setValidate] = useState(() => calculateValidate(props, validate, component, validatorMapper));
  const [type, setType] = useState(() => assignSpecialType(component));
  const mounted = useRef(false);

  const enhancedProps = {
    type,
    ...props,
    ...(initialValue ? { initialValue } : {}),
    ...(stateValidate ? { validate: stateValidate } : {})
  };

  const fieldProps = useField(name, enhancedProps);

  /** Reinitilize type */
  useEffect(() => {
    if (mounted.current) {
      const specialType = assignSpecialType(component);
      if (specialType !== type) {
        setType(specialType);
      }
    }
  }, [component]);

  /** Reinitilize array validator/validate */
  useEffect(() => {
    if (mounted.current) {
      setArrayValidator(calculateArrayValidator(props, validate, component, validatorMapper));
      setValidate(calculateValidate(props, validate, component, validatorMapper));
    }
  }, [validate, component, props.dataType]);

  /** Re-convert initialValue when changed */
  useEffect(() => {
    if (mounted.current) {
      const newInitialValue = calculateInitialValue(props);
      if (!isEqual(initialValue, newInitialValue)) {
        setInitialValue(newInitialValue);
      }
    }
  }, [props.initialValue, props.dataType]);

  useEffect(() => {
    /**
     * Re initialize field when mounted to the Form
     * This affects conditional fields
     */
    if (initializeOnMount) {
      const value = Object.prototype.hasOwnProperty.call(enhancedProps, 'initialValue')
        ? enhancedProps.initialValue
        : formOptions.getFieldState(name).initial;
      fieldProps.input.onChange(value);
    }
  }, [initializeOnMount, enhancedProps.initialValue, fieldProps.meta.initial, props.dataType]);

  /**
   * Prepare deleted value of field
   */
  const fieldClearedValue = Object.prototype.hasOwnProperty.call(props, 'clearedValue') ? props.clearedValue : formOptions.clearedValue;

  useEffect(
    () => {
      mounted.current = true;

      return () => {
        /**
         * Delete the value from form state when field is inmounted
         */
        if ((formOptions.clearOnUnmount || props.clearOnUnmount) && props.clearOnUnmount !== false) {
          fieldProps.input.onChange(fieldClearedValue);
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Map actions to props
   */
  let overrideProps = {};
  if (props.actions) {
    Object.keys(props.actions).forEach((prop) => {
      const [action, ...args] = props.actions[prop];
      overrideProps[prop] = actionMapper[action](...args);
    });
  }

  const { initialValue: _initialValue, clearOnUnmount, dataType, clearedValue, ...cleanProps } = props;

  /**
   * construct component props necessary that would live in field provider
   */
  return {
    ...cleanProps,
    ...overrideProps,
    ...fieldProps,
    ...(arrayValidator ? { arrayValidator } : {}),
    input: {
      ...fieldProps.input,
      onChange: (...args) => {
        enhancedOnChange(
          {
            ...fieldProps.meta,
            dataType,
            onChange: fieldProps.input.onChange,
            clearedValue: fieldClearedValue
          },
          ...args
        );
      }
    }
  };
};

export default useFieldApi;
