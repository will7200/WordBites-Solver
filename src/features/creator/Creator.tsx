import React from 'react';
import clsx from 'clsx';
import './Creator.scss'
import { TileDraggable } from "./TileDraggable";
import { useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";

type InputEvent = React.ChangeEvent<HTMLInputElement>;

export function Creator() {
    const [width, setWidth] = React.useState(1);
    const [height, setHeight] = React.useState(1);
    const [fake, setFake] = React.useState(1);
    const [matrix, setMatrix] = React.useState<Array<Array<any>>>([[null]]);
    const {grid} = useSelector(
        (state: RootState) => state
    )
    const setValues = (kind: 'width' | 'height') => (event: InputEvent) => {
        if (kind === 'width') {
            const widthSet = parseInt(event.target.value)
            if (width > widthSet) {
                setMatrix(matrix => matrix.map(x => x.slice(0, widthSet)))
            } else if (width < widthSet) {
                setMatrix(matrix => matrix.map(x => x.concat(new Array(widthSet - width).fill(null))))
            }
            setWidth(widthSet);
        } else if (kind === 'height') {
            const height = parseInt(event.target.value)
            if (matrix.length < height) {
                setMatrix(matrix => matrix.concat(new Array(height - matrix.length).fill(new Array(width).fill(null))))
            } else if (matrix.length > height) {
                setMatrix(matrix => matrix.slice(0, height - matrix.length))
            }
            setHeight(height)
        }
    }
    const setMatrixWrapper = (index1, index2) => (event: InputEvent) => {
        matrix[index1][index2] = event.target.value.toUpperCase();
        setMatrix(matrix)
        setFake(fake + 1);
    }
    const safeSetMatrix = (m) => setMatrix(m);
    return (
        <div className={clsx('creator-display')}>
            <div className={clsx('col')} style={{maxHeight: '100%'}}>
                <div className={clsx('creator-inputs')}>
                    <label htmlFor="fwidth">Width: {width}</label>
                    <input type="range" id="fwidth" name="Width" placeholder="Width" onChange={setValues('width')}
                           defaultValue={1} min={1}
                           max={(height === 1) || ((height === width) && (width === 1)) ? grid.width / 2 : 1}/>
                    <label htmlFor="fheight">Height: {height}</label>
                    <input type="range" id="fheight" name="Height" placeholder="Height" onChange={setValues('height')}
                           defaultValue={1} min={1}
                           max={(width === 1) || ((height === width) && (width === 1)) ? grid.height / 2 : 1}/>
                </div>
                <TileDraggable className={clsx('creator-matrix')} value={{width, height, matrix}}
                               onDrop={() => safeSetMatrix(Array.from({length: height}, () => Array.from({length: width}, () => null)))}>
                    {
                        matrix && matrix.map((columns, index) => {
                            return (
                                <div className={clsx('creator-row')} data-row={index} key={`${index}-row`}>
                                    {columns && columns.map((_, index2) => (
                                        <div className={clsx('creator-cell')} data-cell={`${matrix[index][index2]}`}
                                             key={`matrix_input-${index}-${index2}`}>
                                            <input className={clsx('creator-cell')} type="text"
                                                   id={`matrix_input-${index}-${index2}`} name="Cell Value"
                                                   maxLength={1}
                                                   value={matrix[index][index2] ?? ""}
                                                   placeholder="" onChange={setMatrixWrapper(index, index2)}/>
                                        </div>
                                    ))
                                    }
                                </div>
                            )
                        })
                    }
                </TileDraggable>
            </div>
        </div>
    )
}