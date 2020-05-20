import React from 'react';
import './App.css';
import { useSelector } from 'react-redux'

import { RootState } from './rootReducer'
import { GridDisplay } from "../features/grid/GridDisplay";
import clsx from "clsx";
import { Creator } from "../features/creator/Creator";
import { WordDisplay } from "../features/wordlist/WordDisplay";
import { useDimensions } from "../components/hooks/useDimensions";
import WordSolver from "../components/WordSolver";
import GridControls from '../features/gridControls/GridControls';


function App() {
    const dimensions = useDimensions();
    const {width, height, pieces} = useSelector((state: RootState) => state.grid)
    const size = Math.min(Math.round(Math.min(dimensions.width * .7 / width, dimensions.height * .7 / height)), 100)
    return (
        <WordSolver>
            <div className={clsx("box", "col")}>
                <section className={clsx('grid-section')}>
                    <div className={"grid-help"}>
                        <h2 style={{margin: '8px'}}>Grid
                        </h2>
                        <ul>
                            <li>Right Clicking will Delete A Tile</li>
                            <li>Dragging around tile has no effect on what words are possible.
                                <ul>
                                    <li>Eventually you will see available words per game state.</li>
                                    <li>And also clicking on a word will show a possible formation</li>
                                </ul>
                            </li>
                            <li>Currently, A Piece has to be a length of 1 in either the x or y axis</li>
                        </ul>

                    </div>
                    <div className={clsx("box-grow")} id={"game-board"}>
                        <GridDisplay height={height} width={width} size={size}/>
                    </div>
                </section>
                <section className={clsx('creator-section')}>
                    <h2 style={{margin: '8px'}}>Grid Controls</h2>
                    <GridControls/>
                    <h2 style={{margin: '8px'}}>Creator</h2>
                    <Creator/>
                </section>
                <section className={clsx('words-section')}>
                    <WordDisplay pieces={pieces.map(x => ({
                        letters: x.matrix.flat().join("").toLowerCase(),
                        height: x.height,
                        width: x.width
                    }))}/>
                </section>
            </div>
        </WordSolver>
    );
}

export default App;
