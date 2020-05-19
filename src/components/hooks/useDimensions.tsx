import React from "react";

const getWidth = () => window.innerWidth
    || document.documentElement.clientWidth
    || document.body.clientWidth;

const getHeight = () => window.innerHeight
    || document.documentElement.clientHeight
    || document.body.clientHeight;

export function useDimensions() {
    // save current window width in the state object
    const [dimensions, setDimensions] = React.useState({
        height: getHeight() ?? 0,
        width: getWidth() ?? 0
    })

    // in this case useEffect will execute only once because
    // it does not have any dependencies.
    React.useEffect(() => {
        const resizeListener = () => {
            // change width from the state object
            setDimensions({
                height: getHeight(),
                width: getWidth()
            })
        };
        // set resize listener
        window.addEventListener('resize', resizeListener);

        // clean up function
        return () => {
            // remove resize listener
            window.removeEventListener('resize', resizeListener);
        }
    }, [])

    return dimensions;
}