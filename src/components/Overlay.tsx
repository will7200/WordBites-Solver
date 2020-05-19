import React from 'react'

export interface OverlayProps {
    color: string
    width: number
    height: number
}

export const Overlay: React.FC<OverlayProps> = ({color, width = 1, height = 1}) => {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: `calc(${height * 100}% + ${height * 3}px)`,
                width: `calc(${width * 100}% + ${width * 3}px)`,
                zIndex: 1,
                opacity: 0.5,
                backgroundColor: color,
            }}
        />
    )
}