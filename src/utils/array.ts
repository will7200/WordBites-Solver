export const flatten = function (arr: Array<any>, result: Array<unknown> = []) {
    for (let i = 0, length = arr.length; i < length; i++) {
        const value: any = arr[i];
        if (Array.isArray(value)) {
            flatten(value, result);
        } else {
            result.push(value);
        }
    }
    return result;
};

export const countNulls2d = function (arr: Array<Array<any>>): number {
    return flatten(arr).reduce((n, val) =>
        n + (val === null)
        , 0) as number
}

export const containsAnything2d = function (arr: Array<Array<any>>, target: {x: number, y: number, width: number, height: number}) {
    const {x, y, width, height} = target;
    for (let i = x; i < (x + width); i++ ) {
        for (let j = y; j < (y + height); j++) {
            if (arr[j][i] !== null) {
                return true
            }
        }
    }
    return false
}