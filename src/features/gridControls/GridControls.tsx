import React, { ChangeEvent } from 'react';
import clsx from 'clsx';
import { setGridSize } from '../grid/gridSlice';
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { useWordSolver } from "../../components/WordSolver";
import Dropdown, { Option } from 'react-dropdown';
import 'react-dropdown/style.css';

const options = [
    {value: 'ospd', label: 'Official Scrabble Player\'s Dictionary'},
    {value: 'unix_words', label: 'Unix Dictionary'},
    {value: 'popular', label: 'Popular Words'},
    {value: 'enable1', label: 'Verbose Official Scrabble Player\'s Dictionary'},
    {value: 'alot', label: 'Alot of words (470000)'}
]

export default function GridControls() {
    const dispatch = useDispatch();
    const wordSolver = useWordSolver();
    const {grid} = useSelector(
        (state: RootState) => state
    )

    const setValues = (kind: 'width' | 'height') => (event: ChangeEvent<HTMLInputElement>) => {
        let {width, height} = grid;
        if (kind === 'width') {
            width = parseInt(event.target.value)
        } else if (kind === 'height') {
            height = parseInt(event.target.value)
        }
        dispatch(setGridSize({width, height}))
        wordSolver.set_board_size(width, height).catch(e => {
            console.log(e)
        })
    }

    const onDropDownChange = (val: Option) => {
        wordSolver.set_filter_data(val.value)
    }
    const {width, height} = grid;
    return (
        <div className={clsx('grid-controls')}>
            <div className={clsx('col')} style={{maxHeight: '100%'}}>
                <div className={clsx('creator-inputs')}>
                    <label htmlFor="fwidth">Width: {width}</label>
                    <input type="range" id="fwidth" name="Width" placeholder="Width" onChange={setValues('width')}
                           defaultValue={width} min={1} max={10}/>
                    <label htmlFor="fheight">Height: {height}</label>
                    <input type="range" id="fheight" name="Height" placeholder="Height" onChange={setValues('height')}
                           defaultValue={height} min={1} max={10}/>
                </div>
                <div className={clsx('creator-inputs')}>
                    <label htmlFor="dropdown_dictionary">Dictionary</label>
                    <Dropdown id="dropdown_dictionary" options={options} onChange={onDropDownChange} value={wordSolver.dictionary}
                              placeholder="Select an option"/>
                </div>
            </div>
        </div>
    )
}