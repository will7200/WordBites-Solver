import React from 'react'
import { DragSourceMonitor, useDrag } from 'react-dnd'
import ItemTypes from "../board/ItemTypes";
import { useDispatch } from "react-redux";
import { addPiece } from "../grid/gridSlice"
import { getEmptyImage } from "react-dnd-html5-backend";

const cellStyle: React.CSSProperties = {
    cursor: 'move',
}

export const TileDraggable: React.FC = ({children, className, value, onDrop}) => {
    const dispatch = useDispatch();
    const [{isDragging}, drag, preview] = useDrag({
        item: {type: ItemTypes.MATRIX, ...value},
        end: (item: { height: number, width: number, matrix: Array<Array<any>>, cell: { x: number, y: number } } | undefined, monitor: DragSourceMonitor) => {
            const dropTarget = monitor.getDropResult()
            if (dropTarget && item) {
                dispatch(addPiece({height: item.height, width: item.width, matrix: item.matrix, cell: dropTarget.cell}))
                if (onDrop) {
                    onDrop();
                }
            }
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    })
    React.useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true })
    }, [preview])
    return (
        <div
            className={className}
            ref={drag}
            style={{
                ...cellStyle,
                opacity: isDragging ? 0.5 : 1,
            }}
        >
            {children}
        </div>
    )
}