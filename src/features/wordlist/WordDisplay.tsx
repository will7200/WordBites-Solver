import React from 'react';

import './WordDisplay.scss';
import clsx from 'clsx';
import { useWordSolver } from "../../components/WordSolver";
import equal from "fast-deep-equal/react"


function genCharArray(charA: string, charZ: string) {
    var a = [], i = charA.charCodeAt(0), j = charZ.charCodeAt(0);
    for (; i <= j; ++i) {
        a.push(String.fromCharCode(i));
    }
    return a;
}

const letters = genCharArray('A', 'Z');

function initialState(letters: Array<any>): Record<string, any> {
    let letObject: Record<string, any> = {}
    letters.forEach(l => {
        letObject[l] = {count: 0, words: []}
    })
    return letObject
}

function secondsToHMS(secs) {
    function z(n) {
        return (n < 10 ? '0' : '') + n;
    }

    var sign = secs < 0 ? '-' : '';
    secs = Math.abs(secs);
    return sign + z(secs / 3600 | 0) + ':' + z((secs % 3600) / 60 | 0) + ':' + z(secs % 60);
}


export const WordDisplay = ({pieces}) => {
    const [currentLetter, setCurrentLetter] = React.useState<string>('A');
    const [loading, setLoading] = React.useState(false);
    const [loadTime, setLoadTime] = React.useState<{ start?: Date, finish?: Date }>({
        start: undefined,
        finish: undefined
    });
    const [wordState, SetWordState] = React.useState<Record<string, any>>(initialState(letters));
    const oldPieces = React.useRef();
    const wordSolver = useWordSolver();
    React.useEffect(() => {
        const t = async () => {
            try {
                const result = await wordSolver.solve(pieces)
                let newState = initialState(letters)
                result.forEach(o => {
                    newState[o.word[0].toUpperCase()].count += 1;
                    newState[o.word[0].toUpperCase()].words.push(o.word)
                })
                SetWordState(newState)
                setLoadTime(l => {
                    return {start: l.start, finish: new Date()}
                })
            } catch (e) {
                if (e === 'worker not ready') {
                    setTimeout(t, 2000)
                } else if (e === 'empty') {

                }
            } finally {
                setLoading(false);
            }
        }
        if (equal(oldPieces.current, pieces)) {
            return
        }
        setLoadTime({start: new Date()})
        t();
        setLoading(true);
        oldPieces.current = pieces;
    }, [pieces]);

    const handleLetterClick = (letter: string) => {
        if (wordState[letter].count === 0) {
            return
        }
        setCurrentLetter(letter);
    }

    const handleWorkClick = (event: React.SyntheticEvent<HTMLLIElement>) => {
        const index = parseInt(event.target.getAttribute("data-index"))
        console.log(wordState[currentLetter].words[index])
    }
    return (
        <>
            <h2 style={{margin: '8px'}}>Words <span className={"time-load"}
                style={{display: loading || loadTime.finish === undefined ? 'none' : ''}}>{secondsToHMS((loadTime?.finish - loadTime?.start) / 1000)}</span>
            </h2>
            <div className={"lds-hourglass"} style={{display: loading ? '' : 'none'}}/>
            <div className={"letters"}>
                {letters.map((letter) =>
                    <div className={"letter-root"} key={letter} onClick={() => handleLetterClick(letter)}>
                        <span
                            className={clsx("letter", "ripple", wordState[letter].count === 0 && "no-results", currentLetter === letter && 'active')}>{letter}</span>
                        {wordState[letter].count > 0 &&
                        <span className={clsx("badge", 'badge-top-right')}>{wordState[letter].count}</span>}
                    </div>
                )}
            </div>
            <div className={"word-list"}>
                <div className={"summary"}>
                    Found {wordState[currentLetter]?.words.length} words that start with <span
                    className={"letter"}>{currentLetter}</span>
                </div>
                <ul className={"list"}>
                    {wordState[currentLetter]?.words.map((x, index) => (
                        <li className={"word"} onClick={handleWorkClick} key={index} data-index={index}>
                            {x}
                        </li>
                    ))}

                </ul>
            </div>
        </>
    )
}