import React from 'react';
import clsx from 'clsx';
import { DragSourceMonitor, useDrag, useDrop } from 'react-dnd'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './GridDisplay.module.css'
import './GridDisplay.scss'
import ItemTypes, { MatrixDropValues } from "../board/ItemTypes";
import { canDropIntoCell, addPiece, movePiece, removePiece } from "./gridSlice";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from "../../app/rootReducer";
import { Overlay } from "../../components/Overlay";
import { GridDragLayer } from './GridDragLayer';
import { getEmptyImage } from 'react-dnd-html5-backend';

interface GridDisplayProps {
    height: number
    width: number
    size: number
}

export interface CellProps {
    x: number;
    y: number;
}

function Tile({x, y}: CellProps) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [matrixDimensions, setMatrixDimensions] = React.useState({height: 0, width: 0});
    const modNumberClass = React.useMemo(() => ((x + 1) * (y + 1) + Math.floor(Math.random() * Math.floor(5))) % 5, [x, y]);
    const {grid} = useSelector(
        (state: RootState) => state
    )
    const [{isOver, canDrop}, drop] = useDrop<MatrixDropValues & { type: string }, any, any>({
        accept: [ItemTypes.MATRIX],
        canDrop: (item: MatrixDropValues, monitor) => {
            // We use settimeout here because this may be called repeatedly
            setTimeout(() => setMatrixDimensions({height: item.height, width: item.width}), 500)
            if ('id' in item) {
                const piece = grid.pieces.find(x => x.id === item.id)!;
                return canDropIntoCell(grid, piece, {cell: {x, y}})
            }
            return canDropIntoCell(grid, item, {cell: {x, y}})
        },
        drop: (item: MatrixDropValues, monitor) => {
            return {name: 'grid-cell', cell: {x, y}}
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    })
    const dispatch = useDispatch();
    const [, drag, preview] = useDrag({
        // @ts-ignore
        item: {type: ItemTypes.MATRIX},
        begin: (monitor => {
            if (grid.grid[y][x] === null) {
                return undefined
            }
            const parent = grid.pieces.find(p => (p.cell.x === x) && (p.cell.y === y));
            if (parent) {
                return {type: ItemTypes.MATRIX, child: false, id: parent.id}
            }
            const t = grid.pieces.find(p => (p.cell.x <= x) && (x < (p.cell.x + p.width)) && (p.cell.y <= y) && (y < (p.cell.y + p.height)))
            if (t) {
                return {type: ItemTypes.MATRIX, child: true, id: t.id}
            }
            return undefined
        }),
        canDrag: grid.grid[y][x] !== null,
        end: (item: Pick<MatrixDropValues, 'id'> | undefined, monitor: DragSourceMonitor) => {
            const dropTarget = monitor.getDropResult()
            if (dropTarget && item) {
                dispatch(movePiece({
                    id: item.id,
                    toCell: dropTarget.cell,
                }))
            }
        },
    })
    React.useEffect(() => {
        preview(getEmptyImage(), {captureDraggingState: true})
    }, [])
    const isActive = canDrop && isOver
    drag(drop(ref))
    const handleRightClick = (e) => {
        e.preventDefault()
        if (e.nativeEvent.which === 3) {
            let piece = grid.pieces.find(p => (p.cell.x === x) && (p.cell.y === y));
            if (!piece) {
                piece = grid.pieces.find(p => (p.cell.x <= x) && (x < (p.cell.x + p.width)) && (p.cell.y <= y) && (y < (p.cell.y + p.height)));
            }
            dispatch(removePiece({id: piece!.id}))
        }
    }
    return (
        <>
            <div className={clsx(grid.grid[y][x] && 'tile', !grid.grid[y][x] && 'empty-tile')} data-cell={`${y}-${x}`}
                 data-x={x} data-y={y} data-mod={modNumberClass} ref={ref} onContextMenu={handleRightClick}>
                {grid.grid[y][x] ?? ""}
                {isActive &&
                <Overlay color={"darkgreen"} width={matrixDimensions.width} height={matrixDimensions.height}/>}
            </div>
        </>
    )
}

// eslint-disable-next-line no-empty-pattern
export function GridDisplay({height, width, size}: GridDisplayProps) {
    let columns: number[] = []
    for (let i = 0; i < width; i++) {
        columns.push(i)
    }
    let rows: number[][] = []
    for (let i = 0; i < height; i++) {
        rows.push(columns)
    }
    return (
        <div className={clsx('board')} style={{
            gridTemplateColumns: `repeat(${width}, ${size}px)`,
            gridTemplateRows: `repeat(${height}, ${size}px)`
        }}>
            <GridDragLayer width={size}/>
            {
                rows.map((val, index) => val.map(
                    (val2, index2) => (
                        <Tile
                            x={index2}
                            y={index}
                            key={`${index}${index2}-row`}/>
                    )
                ))
            }
        </div>
    )
}