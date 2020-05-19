import React from 'react';
import { useDragLayer, XYCoord } from "react-dnd";
import ItemTypes from "../board/ItemTypes";
import TilePreview from './TilePreview';
import { useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";

const layerStyles: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 100,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
}

function getItemStyles(
    initialOffset: XYCoord | null,
    currentOffset: XYCoord | null,
) {
    if (!initialOffset || !currentOffset) {
        return {
            display: 'none',
        }
    }

    let { x, y } = currentOffset

    const transform = `translate(${x}px, ${y}px)`
    return {
        transform,
        WebkitTransform: transform,
    }
}

export function GridDragLayer({width}) {
    const {
        itemType,
        isDragging,
        item,
        initialOffset,
        currentOffset,
    } = useDragLayer((monitor) => ({
        item: monitor.getItem(),
        itemType: monitor.getItemType(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentOffset: monitor.getSourceClientOffset(),
        isDragging: monitor.isDragging(),
    }))
    const {grid} = useSelector(
        (state: RootState) => state
    )

    function renderItem() {
        switch (itemType) {
            case ItemTypes.MATRIX:
                let stateItem = grid.pieces.find(x => x.id === item.id)
                if (!stateItem) {
                    stateItem = item;
                }
                return <TilePreview {...stateItem} tileWidth={width}/>
            default:
                return null
        }
    }

    return (
        <div style={layerStyles}>
            <div
                style={getItemStyles(initialOffset, currentOffset)}
            >
                {renderItem()}
            </div>
        </div>
    )
}