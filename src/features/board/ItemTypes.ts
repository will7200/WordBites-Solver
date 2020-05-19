export default {
    CHARACTER: 'character',
    CHARACTERS: 'characters',
    MATRIX: 'matrix'
}

export interface MatrixDropValues {
    id?: any;
    width: number;
    height: number;
    child?: boolean;
    matrix: Array<Array<string | null>>
}
