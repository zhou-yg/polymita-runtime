/**
 * fork from https://github.com/facebook/prop-types
 */
import { isSignal } from "atomic-signal";

export const SignalFlag = 'Signal'
export const typeFlagSymbol = Symbol.for('renderTypeFlag');
export const typeDefaultValueFlagSymbol = Symbol.for('typeDefaultValueFlagSymbol');

export const PropTypes = {
  array: createPrimitiveTypeChecker('array'),
  bigint: createPrimitiveTypeChecker('bigint'),
  bool: createPrimitiveTypeChecker('boolean'),
  func: createPrimitiveTypeChecker('function'),
  number: createPrimitiveTypeChecker('number'),
  object: createPrimitiveTypeChecker('object'),
  string: createPrimitiveTypeChecker('string'),
  symbol: createPrimitiveTypeChecker('symbol'),
  signal: createSignalTypeChecker(),
  checkPropTypes,
  // any: createAnyTypeChecker(),
  // arrayOf: createArrayOfTypeChecker,
  // element: createElementTypeChecker(),
  // elementType: createElementTypeTypeChecker(),
  // instanceOf: createInstanceTypeChecker,
  // node: createNodeChecker(),
  // objectOf: createObjectOfTypeChecker,
  // oneOf: createEnumTypeChecker,
  // oneOfType: createUnionTypeChecker,
  // shape: createShapeTypeChecker,
  // exact: createStrictShapeTypeChecker,
};


// This handles more types than `getPropType`. Only used for error messages.
// See `createPrimitiveTypeChecker`.
function getPreciseType(propValue: any) {
  if (typeof propValue === 'undefined' || propValue === null) {
    return '' + propValue;
  }
  var propType = getPropType(propValue);
  if (propType === 'object') {
    if (propValue instanceof Date) {
      return 'date';
    } else if (propValue instanceof RegExp) {
      return 'regexp';
    } else if (propValue) {
      
    }
  }
  return propType;
}

function isSymbol(propType: string, propValue: any) {
  // Native Symbol.
  if (propType === 'symbol') {
    return true;
  }

  // falsy value can't be a Symbol
  if (!propValue) {
    return false;
  }

  // 19.4.3.5 Symbol.prototype[@@toStringTag] === 'Symbol'
  if (propValue['@@toStringTag'] === 'Symbol') {
    return true;
  }

  // Fallback for non-spec compliant Symbols which are polyfilled.
  if (typeof Symbol === 'function' && propValue instanceof Symbol) {
    return true;
  }

  return false;
}
// Equivalent of `typeof` but with special handling for array and regexp.
function getPropType(propValue: any) {
  var propType = typeof propValue;
  if (Array.isArray(propValue)) {
    return 'array';
  }
  if (propValue instanceof RegExp) {
    // Old webkits (at least until Android 4.0) return 'function' rather than
    // 'object' for typeof a RegExp. We'll normalize this here so that /bla/
    // passes PropTypes.object.
    return 'object';
  }
  if (isSymbol(propType, propValue)) {
    return 'symbol';
  }
  return propType;
}

/**
 * We use an Error-like object for backward compatibility as people may call
 * PropTypes directly and inspect their output. However, we don't use real
 * Errors anymore. We don't inspect their stack anyway, and creating them
 * is prohibitively expensive if they are created too often, such as what
 * happens in oneOfType() for any type before the one that matched.
 */
function PropTypeError(message: string, data?: any) {
  this.message = message;
  this.data = data && typeof data === 'object' ? data: {};
  this.stack = '';
}

var ANONYMOUS = '<<anonymous>>';

function createChainableTypeDefault (validate: any) {

  function defaultValue (
    value: any,
  ) {

    validateWithDefault[typeDefaultValueFlagSymbol] = value
    validateWithDefault[typeFlagSymbol] = validate[typeFlagSymbol]

    function validateWithDefault(
      props: Record<string, any>,
      propName: string,
      componentName: string,
      location: string,
      propFullName: string,
    ) {
      return validate(props, propName, componentName, location, propFullName);
    }

    return validateWithDefault
  }
  validate.default = defaultValue
  validate.default[typeFlagSymbol] = validate[typeFlagSymbol]

  validate.isRequired.default = defaultValue
  validate.isRequired.default[typeFlagSymbol] = validate[typeFlagSymbol]

  return validate
}

function createChainableTypeChecker(validate: Function): 
  ((...args: any[]) => any) &
  { 
    isRequired: ((...args: any[]) => any) & { default: ((...args: any[]) => any) },
    default: ((...args: any[]) => any)
  } 
{
  function checkType(
    isRequired: boolean,
    props: Record<string, any>,
    propName: string,
    componentName: string,
    location: string,
    propFullName: string,
  ) {
    componentName = componentName || ANONYMOUS;
    propFullName = propFullName || propName;

    if (props[propName] == null) { // ==
      if (isRequired) {
        if (props[propName] === null) { // ===
          return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required ' + ('in `' + componentName + '`, but its value is `null`.'));
        }
        return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required in ' + ('`' + componentName + '`, but its value is `undefined`.'));
      }
      return null;
    } else {
      return validate(props, propName, componentName, location, propFullName);
    }
  }

  var chainedCheckType = checkType.bind(null, false);
  chainedCheckType.isRequired = checkType.bind(null, true);

  chainedCheckType[typeFlagSymbol] = validate[typeFlagSymbol]
  chainedCheckType.isRequired[typeFlagSymbol] = validate[typeFlagSymbol]

  return createChainableTypeDefault(chainedCheckType);
}

function createPrimitiveTypeChecker(expectedType: string) {
  function validate(props: Record<string, any>, propName: string, componentName: string, location: string, propFullName: string) {
    var propValue = props[propName];
    var propType = getPropType(propValue);
    if (propType !== expectedType) {
      // `propValue` being instance of, say, date/regexp, pass the 'object'
      // check, but we can offer a more precise error message here rather than
      // 'of type `object`'.
      var preciseType = getPreciseType(propValue);

      return new PropTypeError(
        'Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + preciseType + '` supplied to `' + componentName + '`, expected ') + ('`' + expectedType + '`.'),
        {expectedType: expectedType}
      );
    }
    return null;
  }
  return createChainableTypeChecker(validate);
}

function createSignalTypeChecker() {
  function validate(props: Record<string, any>, propName: string, componentName: string, location: string, propFullName: string) {
    var propValue = props[propName];

    if (!isSignal(propValue)) {
      var expectedType = 'Signal'
      var preciseType = getPreciseType(propValue);
  
      return new PropTypeError(
        'Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + preciseType + '` supplied to `' + componentName + '`, expected ') + ('`' + expectedType + '`.'),
        {expectedType: expectedType}
      );
    }

    return null;
  }
  
  validate[typeFlagSymbol] = SignalFlag;

  return createChainableTypeChecker(validate);
}

/**
 * 
 * 
 * 
 * checker
 * 
 * 
 * 
 */
let loggedTypeFailures = {};

const has = Function.call.bind(Object.prototype.hasOwnProperty)

function printWarning(text: string) {
  var message = 'Warning: ' + text;
  if (typeof console !== 'undefined') {
    console.error(message);
  }
  try {
    // --- Welcome to debugging React ---
    // This error was thrown as a convenience so that you can use this stack
    // to find the callsite that caused this warning to fire.
    throw new Error(message);
  } catch (x) { /**/ }
}

/**
 * Assert that the values match with the type specs.
 * Error messages are memorized and will only be shown once.
 *
 * @param {object} typeSpecs Map of name to a ReactPropType
 * @param {object} values Runtime values that need to be type-checked
 * @param {string} location e.g. "prop", "context", "child context"
 * @param {string} componentName Name of the component for error messages.
 * @param {?Function} getStack Returns the component stack.
 * @private
 */
function checkPropTypes(typeSpecs: Record<string, Function>, values: any, location: string, componentName: string, getStack?: Function) {
  for (var typeSpecName in typeSpecs) {
    if (has(typeSpecs, typeSpecName)) {
      var error;
      // Prop type validation may throw. In case they do, we don't want to
      // fail the render phase where it didn't fail before. So we log it.
      // After these have been cleaned up, we'll let them throw.
      try {
        // This is intentionally an invariant that gets caught. It's the same
        // behavior as without this statement except with a better message.
        if (typeof typeSpecs[typeSpecName] !== 'function') {
          var err = Error(
            (componentName || 'React class') + ': ' + location + ' type `' + typeSpecName + '` is invalid; ' +
            'it must be a function, usually from the `prop-types` package, but received `' + typeof typeSpecs[typeSpecName] + '`.' +
            'This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.'
          );
          err.name = 'Invariant Violation';
          throw err;
        }
        error = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null);
      } catch (ex) {
        error = ex;
      }
      if (error && !(error instanceof Error)) {
        // printWarning(
        //   (componentName || 'React class') + ': type specification of ' +
        //   location + ' `' + typeSpecName + '` is invalid; the type checker ' +
        //   'function must return `null` or an `Error` but returned a ' + typeof error + '. ' +
        //   'You may have forgotten to pass an argument to the type checker ' +
        //   'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' +
        //   'shape all require an argument).'
        // );
        printWarning(error.message)
      }
      if (error instanceof Error && !(error.message in loggedTypeFailures)) {
        // Only monitor this failure once because there tends to be a lot of the
        // same error.
        loggedTypeFailures[error.message] = true;

        var stack = getStack ? getStack() : '';

        printWarning(
          'Failed ' + location + ' type: ' + error.message + (stack != null ? stack : '')
        );
      }
    }
  }
}

/**
 * Resets warning cache when testing.
 *
 * @private
 */
checkPropTypes.resetWarningCache = function() {
  loggedTypeFailures = {};
}
