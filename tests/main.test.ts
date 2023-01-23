import {justTesting} from '../src/utils/utils';
describe('Ensure a function can be imported', () => {
  it('should return justTesting', () => {
    expect(justTesting()).toBe('justTesting');
  });
});