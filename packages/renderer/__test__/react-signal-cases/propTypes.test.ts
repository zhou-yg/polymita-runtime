import { PropTypes, typeFlagSymbol, SignalFlag, typeDefaultValueFlagSymbol } from '../../src/index'

function resetWarningCache() {
  jest.resetModules();
}

function getPropTypeWarningMessage(propTypes, object, componentName) {
  if (!(console.error as any).mock?.calls) {
    console.error = jest.fn()
  } else {
    (console.error as any).mockClear()
  }

  resetWarningCache();

  PropTypes.checkPropTypes(propTypes, object, 'prop', componentName);
  const callCount = (console.error as any).mock.calls.length;

  if (callCount > 1) {
    throw new Error('Too many warnings.');
  }
  const message = (console.error as any).mock.calls[0]?.[0] || null;
  (console.error as any).mockClear()

  return message;
}

function typeCheckPass(declaration, value) {
  const propTypes = {
    testProp: declaration,
  };
  const props = {
    testProp: value,
  };
  const message = getPropTypeWarningMessage(propTypes, props, 'testComponent');
  expect(message).toBe(null);
}

function typeCheckFailRequiredValues(declaration) {
  const specifiedButIsNullMsg = 'The prop `testProp` is marked as required in ' +
    '`testComponent`, but its value is `null`.';
  const unspecifiedMsg = 'The prop `testProp` is marked as required in ' +
    '`testComponent`, but its value is \`undefined\`.';

  const propTypes = {testProp: declaration};

  // Required prop is null
  const message1 = getPropTypeWarningMessage(
    propTypes,
    {testProp: null},
    'testComponent',
  );
  expect(message1).toContain(specifiedButIsNullMsg);

  // Required prop is undefined
  const message2 = getPropTypeWarningMessage(
    propTypes,
    {testProp: undefined},
    'testComponent',
  );
  expect(message2).toContain(unspecifiedMsg);

  // Required prop is not a member of props object
  const message3 = getPropTypeWarningMessage(propTypes, {}, 'testComponent');
  expect(message3).toContain(unspecifiedMsg);
}

function typeCheckFail(declaration, value, expectedMessage) {
  const propTypes = {
    testProp: declaration,
  };
  const props = {
    testProp: value,
  };
  const message = getPropTypeWarningMessage(propTypes, props, 'testComponent');
  expect(message).toContain(expectedMessage);
}

describe('Primitive Types', () => {
  it('type flags', () => {
    const s1 = PropTypes.signal
    const s1R = PropTypes.signal.isRequired

    expect(s1[typeFlagSymbol]).toEqual(SignalFlag)
    expect(s1R[typeFlagSymbol]).toEqual(SignalFlag)

    const d1 = PropTypes.signal.isRequired.default(0)
    const d2 = PropTypes.signal.default(1)

    expect(d1[typeFlagSymbol]).toEqual(SignalFlag)
    expect(d2[typeFlagSymbol]).toEqual(SignalFlag)
  })

  it('type default value', () => {
    const d1 = PropTypes.signal.isRequired.default(0)
    const d2 = PropTypes.signal.default(1)
    expect(d1[typeDefaultValueFlagSymbol]).toEqual(0)
    expect(d2[typeDefaultValueFlagSymbol]).toEqual(1)
  })

  it('should warn for invalid strings', () => {
    typeCheckFail(
      PropTypes.string,
      [],
      'Invalid prop `testProp` of type `array` supplied to ' +
        '`testComponent`, expected `string`.',
    );
    typeCheckFail(
      PropTypes.string,
      false,
      'Invalid prop `testProp` of type `boolean` supplied to ' +
        '`testComponent`, expected `string`.',
    );
    typeCheckFail(
      PropTypes.string,
      0,
      'Invalid prop `testProp` of type `number` supplied to ' +
        '`testComponent`, expected `string`.',
    );
    typeCheckFail(
      PropTypes.string,
      {},
      'Invalid prop `testProp` of type `object` supplied to ' +
        '`testComponent`, expected `string`.',
    );
    typeCheckFail(
      PropTypes.string,
      Symbol(),
      'Invalid prop `testProp` of type `symbol` supplied to ' +
        '`testComponent`, expected `string`.',
    );
  });
  it('should not warn for valid values', () => {
    typeCheckPass(PropTypes.array, []);
    if (typeof BigInt === 'function') {
      typeCheckPass(PropTypes.bigint, BigInt(0));
    }
    typeCheckPass(PropTypes.bool, false);
    typeCheckPass(PropTypes.func, function() {});
    typeCheckPass(PropTypes.number, 0);
    typeCheckPass(PropTypes.string, '');
    typeCheckPass(PropTypes.object, {});
    typeCheckPass(PropTypes.object, new Date());
    typeCheckPass(PropTypes.object, /please/);
    typeCheckPass(PropTypes.symbol, Symbol());
  });

  it('should be implicitly optional and not warn without values', () => {
    typeCheckPass(PropTypes.string, null);
    typeCheckPass(PropTypes.string, undefined);
  });

  it('should warn for missing required values', () => {
    typeCheckFailRequiredValues(PropTypes.string.isRequired);
    typeCheckFailRequiredValues(PropTypes.array.isRequired);
    typeCheckFailRequiredValues(PropTypes.symbol.isRequired);
    typeCheckFailRequiredValues(PropTypes.number.isRequired);
    typeCheckFailRequiredValues(PropTypes.bigint.isRequired);
    typeCheckFailRequiredValues(PropTypes.bool.isRequired);
    typeCheckFailRequiredValues(PropTypes.func.isRequired);
  });
});