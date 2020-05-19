import React, { useEffect, useState, memo } from 'react'
import clsx from "clsx";

const styles = {
    display: 'grid',
}

const TilePreview: React.FC<any> = memo(({width, height, matrix, tileWidth}) => {
    let items = [];
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            items.push(<div className={clsx('tile')} key={`${i}${j}`} style={{width: tileWidth, height: tileWidth}}>
                {matrix[j][i]}
            </div>)
        }
    }
    return (
        <div style={{
            gridTemplateColumns: `repeat(${width}, ${tileWidth}px)`,
            gridTemplateRows: `repeat(${height}, ${tileWidth}px)`,
            ...styles
        }}>
            {items}
        </div>
    )
})

export default TilePreview
