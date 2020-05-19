import { countNulls2d, flatten } from "./array";

test('2d array contains nulls', () => {
    const array = [
        ["a", null, null],
        ["b", null, "c"]
    ]
    // eslint-disable-next-line array-callback-return
    const f = countNulls2d(array)
    expect(3).toEqual(f);
});