const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  /**
   * Select tests for shard requested via --shard=shardIndex/shardCount
   * Sharding is applied before sorting
   */
  // shard(tests, {shardIndex, shardCount}) {
  //   const shardSize = Math.ceil(tests.length / shardCount);
  //   const shardStart = shardSize * (shardIndex - 1);
  //   const shardEnd = shardSize * shardIndex;

  //   return [...tests]
  //     .sort((a, b) => (a.path > b.path ? 1 : -1))
  //     .slice(shardStart, shardEnd);
  // }

  /**
   * Sort test to determine order of execution
   * Sorting is applied after sharding
   */
  sort(tests) {
    // Test structure information
    // https://github.com/facebook/jest/blob/6b8b1404a1d9254e7d5d90a8934087a9c9899dab/packages/jest-runner/src/types.ts#L17-L21
    const copyTests = Array.from(tests);
    copyTests.sort((testA, testB) => {
      if (/model\.server/.test(testA.path)) {
        return 1
      }
      if (/model\.client/.test(testA.path)) {
        return -1
      }
      if (/model\.server/.test(testB.path)) {
        return -1
      }
      if (/model\.client/.test(testB.path)) {
        return 1
      }
      return 0
    });
    console.log('test case sort: ', copyTests.map(p => {

      const file = p.path.split('__test__/core/')[1]

      return file
    }));
    return copyTests
  }
}

module.exports = CustomSequencer;